import crypto from 'crypto';

/**
 * Challenge-based API Security System
 * Implements server-issued challenges with HMAC-signed nonces and rotating secrets
 */

interface Challenge {
    challenge_id: string;
    nonce: string;
    rotating_secret: string;
    signature: string;
    expiresAt: number;
    createdAt: number;
}

interface ClientProof {
    proof: string;
    timing: number;
    entropy: string;
}

// In-memory challenge store
const challengeStore = new Map<string, Challenge>();

// Rotating secret rotation interval (30 seconds)
const ROTATION_INTERVAL = 30 * 1000;

// Challenge expiration time (60 seconds)
const CHALLENGE_EXPIRATION = 60 * 1000;

// Timing tolerance for clock skew (±5 seconds)
const TIMING_TOLERANCE = 5 * 1000;

// Rate limiting per IP
const rateLimitStore = new Map<string, number[]>();
const MAX_CHALLENGES_PER_MINUTE = 10;

/**
 * Get the current rotating secret based on time slot
 * Secret rotates every 30 seconds
 */
function getCurrentRotatingSecret(): string {
    const challengeSecret = process.env.CHALLENGE_SECRET;
    if (!challengeSecret) {
        throw new Error('CHALLENGE_SECRET not configured');
    }

    // Get current 30-second time slot
    const timeSlot = Math.floor(Date.now() / ROTATION_INTERVAL);

    // Generate rotating secret by hashing the time slot with main secret
    return crypto
        .createHmac('sha256', challengeSecret)
        .update(`rotating_${timeSlot}`)
        .digest('hex');
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
export function generateChallenge(ip: string): Challenge | null {
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

    // Get current rotating secret
    const rotating_secret = getCurrentRotatingSecret();

    // Calculate expiration time
    const expiresAt = now + CHALLENGE_EXPIRATION;

    // Create signature: HMAC(CHALLENGE_SECRET, challenge_id + nonce + expiresAt)
    const signature = crypto
        .createHmac('sha256', challengeSecret)
        .update(`${challenge_id}${nonce}${expiresAt}`)
        .digest('hex');

    // Store challenge
    const challenge: Challenge = {
        challenge_id,
        nonce,
        rotating_secret,
        signature,
        expiresAt,
        createdAt: now
    };

    challengeStore.set(challenge_id, challenge);

    return challenge;
}

/**
 * Verify a challenge exists and is valid
 */
export function verifyChallenge(challenge_id: string): { valid: boolean; error?: string; challenge?: Challenge } {
    const challenge = challengeStore.get(challenge_id);

    if (!challenge) {
        return { valid: false, error: 'Challenge not found or expired' };
    }

    // Check expiration
    if (Date.now() > challenge.expiresAt) {
        challengeStore.delete(challenge_id);
        return { valid: false, error: 'Challenge expired' };
    }

    // Verify signature
    const challengeSecret = process.env.CHALLENGE_SECRET;
    if (!challengeSecret) {
        throw new Error('CHALLENGE_SECRET not configured');
    }

    const expectedSignature = crypto
        .createHmac('sha256', challengeSecret)
        .update(`${challenge.challenge_id}${challenge.nonce}${challenge.expiresAt}`)
        .digest('hex');

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(challenge.signature), Buffer.from(expectedSignature))) {
        challengeStore.delete(challenge_id);
        return { valid: false, error: 'Invalid challenge signature' };
    }

    return { valid: true, challenge };
}

/**
 * Verify client proof (X-Client-Proof header)
 * Proof = HMAC(rotating_secret, challenge_id + timing + entropy)
 */
export function verifyClientProof(
    challenge_id: string,
    proof: string,
    timing: number,
    entropy: string
): { valid: boolean; error?: string } {
    // Verify challenge first
    const challengeResult = verifyChallenge(challenge_id);
    if (!challengeResult.valid || !challengeResult.challenge) {
        return { valid: false, error: challengeResult.error };
    }

    const challenge = challengeResult.challenge;

    // Validate timing (must be within ±5 seconds of server time)
    const now = Date.now();
    const timingDiff = Math.abs(now - timing);

    if (timingDiff > TIMING_TOLERANCE) {
        return { valid: false, error: 'Timing validation failed (clock skew)' };
    }

    // BOT KILLER: Check if the challenge was solved too fast
    // Legitimate users take at least 3 seconds to load scripts, wait for UX, and compute proof.
    const duration = now - challenge.createdAt;
    if (duration < 3000) {
        return { valid: false, error: 'Bot detected (Submission too fast)' };
    }

    // Validate entropy exists and has sufficient length
    if (!entropy || entropy.length < 10) {
        return { valid: false, error: 'Invalid or missing entropy' };
    }

    // Compute expected proof
    // Client computes: HMAC(rotating_secret_bytes, challenge_id + timing + entropy)
    const message = `${challenge_id}${timing}${entropy}`;

    // We must parse the hex secret into a Buffer to match the client's raw byte usage
    const secretBuffer = Buffer.from(challenge.rotating_secret, 'hex');

    const expectedProof = crypto
        .createHmac('sha256', secretBuffer)
        .update(message)
        .digest('hex');

    // Constant-time comparison
    try {
        if (!crypto.timingSafeEqual(Buffer.from(proof), Buffer.from(expectedProof))) {
            return { valid: false, error: 'Invalid client proof' };
        }
    } catch (err) {
        return { valid: false, error: 'Invalid client proof format' };
    }

    // One-time use: delete challenge after successful verification
    challengeStore.delete(challenge_id);

    return { valid: true };
}

/**
 * Cleanup expired challenges (run periodically)
 */
function cleanupExpiredChallenges() {
    const now = Date.now();
    for (const [challenge_id, challenge] of challengeStore.entries()) {
        if (now > challenge.expiresAt) {
            challengeStore.delete(challenge_id);
        }
    }
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
    cleanupExpiredChallenges();
    cleanupRateLimits();
}, 30 * 1000);

// Export for testing purposes
export const _testing = {
    challengeStore,
    rateLimitStore,
    getCurrentRotatingSecret,
    ROTATION_INTERVAL,
    CHALLENGE_EXPIRATION,
    TIMING_TOLERANCE
};
