import crypto from 'crypto';
import Challenge, { IChallenge } from '@/models/Challenge';
import dbConnect from '@/lib/db';

/**
 * Challenge-based API Security System
 * Implements server-issued challenges with HMAC-signed nonces and rotating secrets
 */

// Rotating secret rotation interval (30 seconds)
const ROTATION_INTERVAL = 30 * 1000;

// Challenge expiration time (5 minutes)
const CHALLENGE_EXPIRATION = 5 * 60 * 1000;

// Timing tolerance for clock skew (±60 seconds)
const TIMING_TOLERANCE = 60 * 1000;

// Proof-of-work difficulty (leading hex zeros). Tune based on traffic.
const DEFAULT_DIFFICULTY = 3;

// Rate limiting per IP
const rateLimitStore = new Map<string, number[]>();
const MAX_CHALLENGES_PER_MINUTE = 10;

/**
 * Get the current rotating secret based on time slot
 * Secret rotates every 30 seconds
 */
function hmacHex(key: string, msg: string): string {
    return crypto.createHmac('sha256', key).update(msg).digest('hex');
}

function sha256Hex(msg: string): string {
    return crypto.createHash('sha256').update(msg).digest('hex');
}

function uaToHash(ua: string): string {
    return sha256Hex(ua || ''); // stable, non-reversible fingerprint
}

/**
 * Check if IP is rate limited
 */
function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const requests = rateLimitStore.get(ip) || [];

    // Filter requests from last minute
    const recentRequests = requests.filter(timestamp => now - timestamp < 60 * 1000);

    if (recentRequests.length >= MAX_CHALLENGES_PER_MINUTE) {
        return false; // Rate limited
    }

    // Add current request
    recentRequests.push(now);
    rateLimitStore.set(ip, recentRequests);

    return true;
}

/**
 * Generate a new challenge
 */
export async function generateChallenge(ip: string): Promise<IChallenge | null> {
    await dbConnect();

    // Check rate limiting
    if (!checkRateLimit(ip)) {
        return null;
    }

    const challengeSecret = process.env.CHALLENGE_SECRET;
    if (!challengeSecret) {
        throw new Error('CHALLENGE_SECRET not configured');
    }

    const now = Date.now();

    // Generate unique challenge ID
    const challenge_id = crypto.randomBytes(16).toString('hex');

    // Generate nonce
    const nonce = crypto.randomBytes(16).toString('hex');

    const difficulty = DEFAULT_DIFFICULTY;

    // Calculate expiration time
    const expiresAt = now + CHALLENGE_EXPIRATION;

    // NOTE: Signature protects challenge params from tampering.
    // We intentionally do NOT ship any server secret to the client.
    const signature = hmacHex(challengeSecret, `${challenge_id}${nonce}${expiresAt}${difficulty}${ip}`);

    // Store challenge in MongoDB
    const challenge = await Challenge.create({
        challenge_id,
        nonce,
        difficulty,
        signature,
        expiresAt,
        ip,
        uaHash: '' // filled by route (optional) or left blank
    });

    return challenge;
}

/**
 * Verify a challenge exists and is valid
 */
export async function verifyChallenge(challenge_id: string): Promise<{ valid: boolean; error?: string; challenge?: IChallenge }> {
    await dbConnect();

    const challenge = await Challenge.findOne({ challenge_id });

    if (!challenge) {
        return { valid: false, error: 'Challenge not found or expired' };
    }

    // Check expiration
    if (Date.now() > challenge.expiresAt) {
        await Challenge.deleteOne({ challenge_id });
        return { valid: false, error: 'Challenge expired' };
    }

    // Verify signature
    const challengeSecret = process.env.CHALLENGE_SECRET;
    if (!challengeSecret) {
        throw new Error('CHALLENGE_SECRET not configured');
    }

    const expectedSignature = hmacHex(
        challengeSecret,
        `${challenge.challenge_id}${challenge.nonce}${challenge.expiresAt}${challenge.difficulty}${challenge.ip}`
    );

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(challenge.signature), Buffer.from(expectedSignature))) {
        await Challenge.deleteOne({ challenge_id });
        return { valid: false, error: 'Invalid challenge signature' };
    }

    return { valid: true, challenge };
}

/**
 * Verify client proof (X-Client-Proof header)
 * Proof-of-work: sha256(challenge_id + nonce + timing + entropy + counter)
 * Must have `difficulty` leading hex '0' characters.
 */
export async function verifyClientProof(
    challenge_id: string,
    proof: string,
    timing: number,
    entropy: string,
    counter: number,
    ip?: string,
    userAgent?: string
): Promise<{ valid: boolean; error?: string }> {
    await dbConnect();

    // Verify challenge first
    const challengeResult = await verifyChallenge(challenge_id);
    if (!challengeResult.valid || !challengeResult.challenge) {
        return { valid: false, error: challengeResult.error };
    }

    const challenge = challengeResult.challenge;

    // Bind to IP (best-effort) to reduce token reuse across IPs
    // RELAXED FOR MOBILE: IP rotation is common on mobile networks. 
    // We log the mismatch but do NOT fail the verification.
    if (ip && challenge.ip && ip !== challenge.ip) {
        console.warn(`[CHALLENGE] IP Mismatch detected (stored: ${challenge.ip}, current: ${ip}). Allowed for mobile compatibility.`);
        // return { valid: false, error: 'IP mismatch' };
    }

    // Optional UA binding (only if stored at creation time)
    if (challenge.uaHash) {
        const incomingUaHash = uaToHash(userAgent || '');
        if (incomingUaHash !== challenge.uaHash) {
            return { valid: false, error: 'User-Agent mismatch' };
        }
    }

    // Validate timing (must be within ±5 seconds of server time)
    const now = Date.now();
    const timingDiff = Math.abs(now - timing);

    if (timingDiff > TIMING_TOLERANCE) {
        return { valid: false, error: 'Timing validation failed (clock skew)' };
    }

    // BOT KILLER: Check if the challenge was solved too fast
    // Legitimate users take at least 1 second to load scripts, wait for UX, and compute proof.
    const duration = now - new Date(challenge.createdAt).getTime();
    if (duration < 300) {
        return { valid: false, error: 'Bot detected (Submission too fast)' };
    }

    // Validate entropy exists and has sufficient length
    if (!entropy || entropy.length < 10) {
        return { valid: false, error: 'Invalid or missing entropy' };
    }

    if (!Number.isFinite(counter) || counter < 0 || counter > 5_000_000) {
        return { valid: false, error: 'Invalid counter' };
    }

    const message = `${challenge_id}${challenge.nonce}${timing}${entropy}${counter}`;
    const expectedProof = sha256Hex(message);
    const prefix = '0'.repeat(Math.max(0, challenge.difficulty));
    if (!expectedProof.startsWith(prefix)) {
        return { valid: false, error: 'Proof-of-work failed' };
    }

    // Constant-time comparison
    try {
        if (!crypto.timingSafeEqual(Buffer.from(proof), Buffer.from(expectedProof))) {
            return { valid: false, error: 'Invalid client proof' };
        }
    } catch (err) {
        return { valid: false, error: 'Invalid client proof format' };
    }

    // One-time use: delete challenge after successful verification
    await Challenge.deleteOne({ challenge_id });

    return { valid: true };
}

/**
 * Cleanup old rate limit entries (run periodically)
 */
function cleanupRateLimits() {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitStore.entries()) {
        const recentRequests = timestamps.filter(timestamp => now - timestamp < 60 * 1000);
        if (recentRequests.length === 0) {
            rateLimitStore.delete(ip);
        } else {
            rateLimitStore.set(ip, recentRequests);
        }
    }
}

// Run cleanup every 30 seconds
setInterval(() => {
    // Mongo handles challenge cleanup via TTL
    cleanupRateLimits();
}, 30 * 1000);

// Export for testing purposes
export const _testing = {
    rateLimitStore,
    ROTATION_INTERVAL,
    CHALLENGE_EXPIRATION,
    TIMING_TOLERANCE
};
