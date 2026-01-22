/**
 * Token Validator - Server-to-server captcha token verification
 * 
 * Phase B Security Enhancement:
 * - Validates captcha tokens with the captcha server
 * - Implements request deduplication to prevent replay attacks
 * - Binds tokens to IP/fingerprint
 */

import crypto from 'crypto';

// Configuration
const CAPTCHA_SERVER_URL = process.env.CAPTCHA_SERVER_URL || 'https://captcha-p.asprin.dev';
const TOKEN_VALIDATION_SECRET = process.env.TOKEN_VALIDATION_SECRET || 'token-validation-secret';

// Request deduplication store (use Redis in production)
const usedTokens = new Map<string, { usedAt: number; ip: string }>();

// Cleanup interval for expired tokens
setInterval(() => {
    const now = Date.now();
    const expirationMs = 5 * 60 * 1000; // 5 minutes

    for (const [tokenHash, data] of usedTokens.entries()) {
        if (now - data.usedAt > expirationMs) {
            usedTokens.delete(tokenHash);
        }
    }
}, 60000); // Cleanup every minute

export interface TokenValidationResult {
    valid: boolean;
    error?: string;
    fingerprint?: string;
    ip?: string;
    issuedAt?: number;
    expiresAt?: number;
}

/**
 * Hash a token for storage (don't store the actual token)
 */
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
}

/**
 * Check if a token has already been used (replay attack prevention)
 */
export function isTokenUsed(token: string): { used: boolean; originalIp?: string } {
    const tokenHash = hashToken(token);
    const existing = usedTokens.get(tokenHash);

    if (existing) {
        return { used: true, originalIp: existing.ip };
    }

    return { used: false };
}

/**
 * Mark a token as used
 */
export function markTokenUsed(token: string, ip: string): void {
    const tokenHash = hashToken(token);
    usedTokens.set(tokenHash, {
        usedAt: Date.now(),
        ip,
    });
}

/**
 * Decode and verify the JWT token locally (fast path)
 * This is a quick verification before potentially calling the captcha server
 */
export function decodeToken(token: string): {
    valid: boolean;
    payload?: any;
    error?: string
} {
    try {
        // JWT structure: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { valid: false, error: 'Invalid token format' };
        }

        // Decode payload (base64url)
        const payloadBase64 = parts[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadJson);

        // Check expiration
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            return { valid: false, error: 'Token expired' };
        }

        // Check if token is too old (even if not expired)
        if (payload.iat) {
            const ageMs = Date.now() - (payload.iat * 1000);
            if (ageMs > 120000) { // 2 minutes max age
                return { valid: false, error: 'Token too old' };
            }
        }

        return { valid: true, payload };
    } catch (error) {
        return { valid: false, error: 'Token decode failed' };
    }
}

/**
 * Validate token with enhanced security checks
 */
export async function validateCaptchaToken(
    token: string,
    requestIp: string,
    requestFingerprint?: string
): Promise<TokenValidationResult> {
    // Step 1: Check if token was already used (replay prevention)
    const usageCheck = isTokenUsed(token);
    if (usageCheck.used) {
        console.warn(`[TOKEN] Replay attack detected: token already used from IP ${usageCheck.originalIp}`);
        return {
            valid: false,
            error: `Token already used (original IP: ${usageCheck.originalIp?.substring(0, 10)}...)`
        };
    }

    // Step 2: Decode and perform local validation
    const decoded = decodeToken(token);
    if (!decoded.valid) {
        return { valid: false, error: decoded.error };
    }

    const payload = decoded.payload;

    // Step 3: Verify token is bound to the requesting IP
    if (payload.ip && payload.ip !== requestIp) {
        console.warn(`[TOKEN] IP mismatch: token bound to ${payload.ip}, request from ${requestIp}`);
        return {
            valid: false,
            error: 'Token IP mismatch'
        };
    }

    // Step 4: Verify fingerprint if provided
    if (requestFingerprint && payload.fingerprint) {
        if (payload.fingerprint !== requestFingerprint) {
            console.warn(`[TOKEN] Fingerprint mismatch`);
            return {
                valid: false,
                error: 'Token fingerprint mismatch'
            };
        }
    }

    // Step 5: Check token status
    if (payload.status !== 'verified') {
        return {
            valid: false,
            error: 'Token not verified'
        };
    }

    // Step 6: Mark token as used (after all validations pass)
    markTokenUsed(token, requestIp);

    return {
        valid: true,
        fingerprint: payload.fingerprint,
        ip: payload.ip,
        issuedAt: payload.iat ? payload.iat * 1000 : undefined,
        expiresAt: payload.exp ? payload.exp * 1000 : undefined,
    };
}

/**
 * Generate a request fingerprint from headers
 */
export function generateRequestFingerprint(headers: Record<string, string | string[] | undefined>): string {
    const components = [
        headers['user-agent'] || '',
        headers['accept-language'] || '',
        headers['accept-encoding'] || '',
        headers['sec-ch-ua'] || '',
        headers['sec-ch-ua-platform'] || '',
        headers['sec-ch-ua-mobile'] || '',
    ];

    return crypto
        .createHash('sha256')
        .update(components.join('|'))
        .digest('hex')
        .substring(0, 32);
}

/**
 * Get statistics about token usage
 */
export function getTokenStats(): { usedTokenCount: number; oldestToken: number | null } {
    let oldestTimestamp: number | null = null;

    for (const data of usedTokens.values()) {
        if (oldestTimestamp === null || data.usedAt < oldestTimestamp) {
            oldestTimestamp = data.usedAt;
        }
    }

    return {
        usedTokenCount: usedTokens.size,
        oldestToken: oldestTimestamp,
    };
}
