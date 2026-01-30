/**
 * Client-Side Challenge Management
 * Handles fetching and using server-issued challenges for API protection
 */

export interface Challenge {
    challenge_id: string;
    nonce: string;
    difficulty: number; // leading hex zeros required
    signature: string;
    expiresAt: number;
}

interface ChallengeData {
    challenge_id: string;
    timing: number;
    entropy: string;
    proof: string;
    counter: number;
}

/**
 * Fetch a new challenge from the server
 */
export async function fetchChallenge(): Promise<Challenge | null> {
    try {
        const response = await fetch('/api/challenge', {
            cache: 'no-store',
            headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) {
            console.error('Failed to fetch challenge:', response.statusText);
            return null;
        }

        const challenge: Challenge = await response.json();
        return challenge;
    } catch (error) {
        console.error('Error fetching challenge:', error);
        return null;
    }
}

async function sha256Hex(message: string): Promise<string> {
    const data = new TextEncoder().encode(message);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Generate client-side entropy
 */
function generateEntropy(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).join('');
}

/**
 * Prepare challenge data for API request
 * Computes X-Client-Proof header
 */
export async function prepareChallengeData(challenge: Challenge): Promise<ChallengeData | null> {
    try {
        // Check if challenge is expired
        if (Date.now() > challenge.expiresAt) {
            console.error('Challenge expired before use');
            return null;
        }

        // Generate timing and entropy
        const timing = Date.now();
        const entropy = generateEntropy();

        // Proof-of-work:
        // Find counter such that sha256(challenge_id + nonce + timing + entropy + counter)
        // starts with N leading '0' (hex).
        const prefix = '0'.repeat(Math.max(0, challenge.difficulty || 0));
        let counter = 0;
        let proof = '';
        const maxTries = 500_000;

        while (counter < maxTries) {
            const message = `${challenge.challenge_id}${challenge.nonce}${timing}${entropy}${counter}`;
            // eslint-disable-next-line no-await-in-loop
            proof = await sha256Hex(message);
            if (proof.startsWith(prefix)) break;
            counter += 1;
        }

        if (!proof || !proof.startsWith(prefix)) {
            console.error('Proof-of-work generation failed');
            return null;
        }

        return {
            challenge_id: challenge.challenge_id,
            timing,
            entropy,
            proof,
            counter
        };
    } catch (error) {
        console.error('Error preparing challenge data:', error);
        return null;
    }
}

/**
 * Make a protected API request with challenge
 */
export async function makeProtectedRequest<T = any>(
    url: string,
    options: RequestInit,
    includeChallenge: Challenge | null = null
): Promise<Response> {
    // Get or fetch challenge
    let challenge = includeChallenge;
    if (!challenge) {
        challenge = await fetchChallenge();
        if (!challenge) {
            throw new Error('Failed to fetch security challenge');
        }
    }

    // Prepare challenge data
    const challengeData = await prepareChallengeData(challenge);
    if (!challengeData) {
        throw new Error('Failed to prepare security challenge');
    }

    // Parse existing body
    const existingBody = options.body ? JSON.parse(options.body as string) : {};

    // Add challenge data to request body
    const bodyWithChallenge = {
        ...existingBody,
        challenge_id: challengeData.challenge_id,
        timing: challengeData.timing,
        entropy: challengeData.entropy,
        counter: challengeData.counter
    };

    // Add X-Client-Proof header
    const headers = new Headers(options.headers);
    headers.set('X-Client-Proof', challengeData.proof);
    headers.set('Content-Type', 'application/json');

    // Make request
    const response = await fetch(url, {
        ...options,
        headers,
        body: JSON.stringify(bodyWithChallenge)
    });

    // If 403 and challenge-related, try to refresh challenge once
    if (response.status === 403) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.error?.includes('Security') || errorData.error?.includes('challenge')) {
            console.log('Challenge failed, retrying with new challenge...');
            const newChallenge = await fetchChallenge();
            if (newChallenge) {
                return makeProtectedRequest(url, options, newChallenge);
            }
        }
    }

    return response;
}

/**
 * Simplified helper: Prepare challenge for manual API calls
 * Use this if you want to handle the request manually
 */
export async function getChallenge(): Promise<{ data: ChallengeData; headers: Record<string, string> } | null> {
    const challenge = await fetchChallenge();
    if (!challenge) return null;

    const challengeData = await prepareChallengeData(challenge);
    if (!challengeData) return null;

    return {
        data: {
            challenge_id: challengeData.challenge_id,
            timing: challengeData.timing,
            entropy: challengeData.entropy,
            proof: challengeData.proof,
            counter: challengeData.counter
        },
        headers: {
            'X-Client-Proof': challengeData.proof,
            'Content-Type': 'application/json'
        }
    };
}

/**
 * Encrypt payload using the challenge nonce (Client-side)
 * Uses AES-GCM via Web Crypto API
 */
export async function encryptPayload(data: any, nonce: string): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    // Derive key from nonce (SHA-256)
    const keyMaterial = encoder.encode(nonce);
    const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);
    const key = await crypto.subtle.importKey(
        'raw',
        keyHash,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
    );

    // Convert to hex
    const encryptedBytes = new Uint8Array(encryptedContent);
    const encryptedHex = Array.from(encryptedBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    // Note: WebCrypto AES-GCM output includes the auth tag appended to the ciphertext automatically? 
    // actually, most implementations do. Let's verify standard behavior.
    // Standard Web Crypto AES-GCM encrypt() returns ciphertext + tag appended.
    // Node.js createDecipheriv expects them separate or handled specifically.
    // We will separate them on the server side (last 16 bytes = 128 bits tag).

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

    return { encrypted: encryptedHex, iv: ivHex };
}
