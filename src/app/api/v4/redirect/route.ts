import { NextRequest, NextResponse } from 'next/server';
import { decodeLinkV4 } from '@/utils/linkWrapper';
import { verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';

import { getClientIp } from '@/utils/ip';
import { verifyRequestSignature } from '@/utils/requestIntegrity';
// Phase B Security Enhancements
import { validateCaptchaToken, generateRequestFingerprint, isTokenUsed } from '@/utils/tokenValidator';

// Request deduplication for the entire request (not just token)
const processedRequests = new Map<string, number>();
const MAX_REQUEST_AGE_MS = 60000; // 1 minute

// Cleanup old requests
setInterval(() => {
    const now = Date.now();
    for (const [hash, timestamp] of processedRequests.entries()) {
        if (now - timestamp > MAX_REQUEST_AGE_MS) {
            processedRequests.delete(hash);
        }
    }
}, 30000);

// Use an existing secret or fallback (Must match trap/image/route.ts)
// Use an existing secret or fallback (Must match trap/image/route.ts)
const TRAP_SECRET = process.env.CHALLENGE_SECRET || process.env.TOKEN_VALIDATION_SECRET || 'fallback-trap-secret';
const TRAP_COOKIE_NAME = process.env.TRAP_COOKIE_NAME || 'cf_trap_proof_v4';

function signTrap(value: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', TRAP_SECRET).update(value).digest('hex');
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        // BOT KILLER: Strict Header Validation
        const referer = request.headers.get('referer') || '';
        const origin = request.headers.get('origin') || '';
        const host = request.headers.get('host') || '';
        const secFetchSite = request.headers.get('sec-fetch-site');
        const secFetchDest = request.headers.get('sec-fetch-dest');

        // 1. Origin/Referer must match host
        const isSelfReferenced = referer.includes(host) || origin.includes(host);
        if (!isSelfReferenced) {
            return NextResponse.json({ error: 'Direct access forbidden' }, { status: 403 });
        }

        // 2. Browser-specific behavior check (Sec-Fetch headers)
        // Most bots don't implement these or set them to 'cross-site'
        if (secFetchSite && secFetchSite !== 'same-origin') {
            return NextResponse.json({ error: 'Security violation: Cross-site request blocked' }, { status: 403 });
        }

        const body = await request.json();
        const { challenge_id, encrypted, iv } = body;

        // Decryption Layer:
        // 1. Look up challenge to get nonce
        if (!challenge_id || !encrypted || !iv) {
            return NextResponse.json({ error: 'Invalid payload format (Encryption required)' }, { status: 400 });
        }

        const { verifyChallenge, decryptPayload } = await import('@/utils/challenge');

        // We verify purely to get the nonce securely (and check expiry)
        const challengeResult = await verifyChallenge(challenge_id);
        if (!challengeResult.valid || !challengeResult.challenge) {
            return NextResponse.json({ error: 'Security Session Expired' }, { status: 403 });
        }

        const nonce = challengeResult.challenge.nonce;
        let decryptedBody;
        try {
            decryptedBody = await decryptPayload(encrypted, iv, nonce);
        } catch (e) {
            console.error('Decryption failed', e);
            return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
        }

        const { slug, captchaToken, timing, entropy, counter, _sig, _ts } = decryptedBody;

        // Ensure challenge_id from body matches challenge_id in decrypted payload if present? 
        // Actually, the decrypted payload usually contains what we signed. 
        // In page.tsx we put challenge_id inside payload too. Let's verify match.
        if (decryptedBody.challenge_id !== challenge_id) {
            return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
        }

        // ===== Phase B: Request Timestamp Validation =====
        // Ensure timing is recent (within 60s)
        if (timing) {
            const requestAge = Date.now() - timing;
            if (requestAge > 120000) { // 120 seconds max age
                return NextResponse.json(
                    { error: 'Request expired. Please refresh and try again.' },
                    { status: 403 }
                );
            }
            if (requestAge < -5000) { // 5s tolerance for clock skew
                return NextResponse.json(
                    { error: 'Invalid request timing' },
                    { status: 403 }
                );
            }
        }

        // ===== Security Layer -1: Trap Cookie Verification (Bot Killer) =====
        // Check if the client has loaded the trap image (thus proving they load images)
        if (CAPTCHA_CONFIG.own === 2) {
            const trapCookie = request.cookies.get(TRAP_COOKIE_NAME);

            if (!trapCookie) {
                // Bot detected (blocked image loading)
                return NextResponse.json({ error: 'Security Check Failed: Resources not loaded' }, { status: 403 });
            }

            try {
                const [nonce, timestampStr, signature] = trapCookie.value.split('.');
                const timestamp = parseInt(timestampStr, 10);

                // 1. Verify Signature (now includes challenge_id as kid)
                // challenge_id is passed in the body
                const kid = challenge_id || 'nokid';
                const payload = `trap-proof:${nonce}:${timestamp}:${kid}`;
                const expectedSignature = signTrap(payload);

                if (signature !== expectedSignature) {
                    // console.log(`[TRAP ERROR] Sig Mismatch. KID: ${kid.substring(0,8)}. ClientIp: ${getClientIp(request)}`);
                    // Debug: expectedSignature, signature
                    return NextResponse.json({ error: 'Security Check Failed: Invalid proof signature' }, { status: 403 });
                }

                // 2. Verify Freshness (1 hour)
                const currentHour = Math.floor(Date.now() / 3600000);
                if (Math.abs(currentHour - timestamp) > 1) { // Allow 1 hour drift
                    return NextResponse.json({ error: 'Security Check Failed: Proof expired' }, { status: 403 });
                }

            } catch (e) {
                return NextResponse.json({ error: 'Security Check Failed: Malformed proof' }, { status: 403 });
            }
        }

        // ===== Phase B: Request Deduplication =====
        // Create a hash of the unique request identifiers
        const crypto = await import('crypto');
        const requestHash = crypto.createHash('sha256')
            .update(`${slug}:${challenge_id}:${captchaToken?.substring(0, 50)}`)
            .digest('hex')
            .substring(0, 32);

        if (processedRequests.has(requestHash)) {
            console.log(`[SECURITY] Duplicate request detected: ${requestHash.substring(0, 8)}`);
            return NextResponse.json(
                { error: 'Request already processed' },
                { status: 409 }
            );
        }

        // ===== Security Layer 0: Request Integrity (if signature provided) =====
        // If client provides signature, verify request hasn't been tampered with
        if (_sig && _ts) {
            // Extract the original body (without signature fields)
            const { _sig: _, _ts: __, ...originalBody } = body;
            const sigResult = verifyRequestSignature(originalBody, _ts, _sig);

            if (!sigResult.valid) {
                console.log(`[SECURITY] Request signature verification failed: ${sigResult.error}`);
                return NextResponse.json(
                    { error: 'Request integrity verification failed' },
                    { status: 403 }
                );
            }
        }

        // Security Layer 1: Challenge Verification
        const clientProof = request.headers.get('x-client-proof');

        if (!challenge_id || !clientProof || timing === undefined || !entropy || counter === undefined) {
            return NextResponse.json(
                { error: 'Security challenge required' },
                { status: 403 }
            );
        }

        // Security Layer 2: Client Proof Verification
        const { verifyClientProof } = await import('@/utils/challenge');
        const ipForBind = getClientIp(request);
        const ua = request.headers.get('user-agent') || '';
        const proofResult = await verifyClientProof(challenge_id, clientProof, timing, entropy, counter, ipForBind, ua);

        if (!proofResult.valid) {
            return NextResponse.json(
                { error: `Security verification failed: ${proofResult.error}` },
                { status: 403 }
            );
        }

        // Validate inputs
        if (!slug || !captchaToken) {
            return NextResponse.json(
                { error: 'Slug and CAPTCHA token are required' },
                { status: 400 }
            );
        }

        // ===== Phase B: Enhanced Token Validation =====
        const clientIp = getClientIp(request);

        // Generate request fingerprint for binding verification
        const requestFingerprint = generateRequestFingerprint(
            Object.fromEntries(request.headers.entries()) as Record<string, string>
        );

        // Check if token already used (replay attack prevention)
        const tokenUsageCheck = isTokenUsed(captchaToken);
        if (tokenUsageCheck.used) {
            console.log(`[SECURITY] Token replay attack from ${clientIp}, original IP: ${tokenUsageCheck.originalIp}`);
            return NextResponse.json(
                { error: 'Token already used. Please complete a new CAPTCHA.' },
                { status: 403 }
            );
        }

        // Validate token with enhanced checks (Only for Own Captcha which uses JWT)
        if (CAPTCHA_CONFIG.own === 1) {
            const tokenValidation = await validateCaptchaToken(captchaToken, clientIp, requestFingerprint);
            if (!tokenValidation.valid) {
                console.log(`[SECURITY] Token validation failed: ${tokenValidation.error}`);
                return NextResponse.json(
                    { error: tokenValidation.error || 'Token validation failed' },
                    { status: 403 }
                );
            }
        }

        // Verify CAPTCHA (legacy verification - may be redundant with token validation)
        let isCaptchaValid = false;

        if (CAPTCHA_CONFIG.own === 1) {
            // If clientIp is localhost (dev/tunnel), verifyCustomCaptcha will fail IP check on server
            // So we omit the IP in that case to skip the server-side check
            const ipForVerify = (clientIp === '::1' || clientIp === '127.0.0.1') ? undefined : clientIp;
            isCaptchaValid = await verifyCustomCaptcha(captchaToken, ipForVerify);
        } else if (CAPTCHA_CONFIG.own === 2) {
            isCaptchaValid = await verifyTurnstile(captchaToken);
        } else {
            isCaptchaValid = await verifyTurnstile(captchaToken);
        }

        if (!isCaptchaValid) {
            return NextResponse.json(
                { error: 'CAPTCHA verification failed. Please try again.' },
                { status: 403 }
            );
        }

        // Mark request as processed (after all validations pass)
        processedRequests.set(requestHash, Date.now());


        // Decode the V4 link
        const decodedUrl = decodeLinkV4(slug);

        if (!decodedUrl) {
            return NextResponse.json(
                { error: 'Invalid or expired link' },
                { status: 400 }
            );
        }

        // Return the decoded URL
        return NextResponse.json({
            success: true,
            url: decodedUrl,
        });

    } catch (error) {
        console.error('V4 redirect API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
