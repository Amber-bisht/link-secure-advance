/**
 * Client-Side Challenge Management
 * Handles fetching and using server-issued challenges for API protection
 */

export interface Challenge {
    challenge_id: string;
    nonce: string;
    rotating_secret: string;
    signature: string;
    expiresAt: number;
}

interface ChallengeData {
    challenge_id: string;
    timing: number;
    entropy: string;
    proof: string;
}

/**
 * Fetch a new challenge from the server
 */
export async function fetchChallenge(): Promise<Challenge | null> {
    try {
        const response = await fetch('/api/challenge');

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

/**
 * Compute HMAC-SHA256 using Web Crypto API
 */
async function computeHMAC(secret: string, message: string): Promise<string> {
    // Convert hex secret to ArrayBuffer
    const secretBytes = new Uint8Array(secret.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    // Import the key
    const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Convert message to ArrayBuffer
    const messageBytes = new TextEncoder().encode(message);

    // Compute HMAC
    const signature = await crypto.subtle.sign('HMAC', key, messageBytes);

    // Convert to hex string
    return Array.from(new Uint8Array(signature))
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

        // Compute proof: HMAC(rotating_secret, challenge_id + timing + entropy)
        const message = `${challenge.challenge_id}${timing}${entropy}`;
        const proof = await computeHMAC(challenge.rotating_secret, message);

        return {
            challenge_id: challenge.challenge_id,
            timing,
            entropy,
            proof
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
        entropy: challengeData.entropy
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
            proof: challengeData.proof
        },
        headers: {
            'X-Client-Proof': challengeData.proof,
            'Content-Type': 'application/json'
        }
    };
}
