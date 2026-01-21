/**
 * Request Integrity Verification
 * 
 * Provides HMAC-based request signing to prevent tampering
 * and ensure request body integrity.
 */

import crypto from 'crypto';

// Secret for HMAC signing (should be in environment variable)
const REQUEST_SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET || 'default-hmac-secret-change-in-production';

// Maximum age for signed requests (prevents replay)
const MAX_REQUEST_AGE_MS = 30000; // 30 seconds

export interface SignedRequestData {
    /** The original request body */
    body: any;
    /** Unix timestamp when request was created */
    timestamp: number;
    /** HMAC signature of the request */
    signature: string;
}

/**
 * Create HMAC signature for request body
 */
export function signRequest(body: any, timestamp: number): string {
    const payload = JSON.stringify({ body, timestamp });
    return crypto
        .createHmac('sha256', REQUEST_SIGNING_SECRET)
        .update(payload)
        .digest('hex');
}

/**
 * Verify HMAC signature and timestamp freshness
 */
export function verifyRequestSignature(
    body: any,
    timestamp: number,
    signature: string
): { valid: boolean; error?: string } {
    // Check timestamp freshness
    const now = Date.now();
    const requestAge = now - timestamp;

    if (requestAge > MAX_REQUEST_AGE_MS) {
        return { valid: false, error: 'Request expired' };
    }

    if (requestAge < -5000) { // 5s tolerance for clock skew
        return { valid: false, error: 'Invalid timestamp (future)' };
    }

    // Verify signature
    const expectedSignature = signRequest(body, timestamp);

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) {
        return { valid: false, error: 'Invalid signature' };
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: false, error: 'Signature verification failed' };
    }

    return { valid: true };
}

/**
 * Generate a request nonce (one-time use identifier)
 */
export function generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a signed request payload for client-side use
 */
export function createSignedPayload(body: any): SignedRequestData {
    const timestamp = Date.now();
    const signature = signRequest(body, timestamp);

    return {
        body,
        timestamp,
        signature
    };
}
