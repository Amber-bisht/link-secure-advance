import { NextRequest, NextResponse } from 'next/server';
import { decodeLinkV4 } from '@/utils/linkWrapper';
import { verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';
import SuspiciousIP from '@/models/SuspiciousIP';
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
        const { slug, captchaToken, challenge_id, timing, entropy, counter, _sig, _ts } = body;

        // ===== Phase B: Request Timestamp Validation =====
        // Ensure timing is recent (within 60s)
        if (timing) {
            const requestAge = Date.now() - timing;
            if (requestAge > 120000) { // 120 seconds max age
                console.log(`[SECURITY] Request too old: ${requestAge}ms`);
                const ip = getClientIp(request);
                await SuspiciousIP.create({
                    ipAddress: ip,
                    reason: `Stale request: ${Math.round(requestAge / 1000)}s old`
                });
                return NextResponse.json(
                    { error: 'Request expired. Please refresh and try again.' },
                    { status: 403 }
                );
            }
            if (requestAge < -5000) { // 5s tolerance for clock skew
                console.log(`[SECURITY] Request from future: ${requestAge}ms`);
                return NextResponse.json(
                    { error: 'Invalid request timing' },
                    { status: 403 }
                );
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
                const ip = getClientIp(request);
                await SuspiciousIP.create({
                    ipAddress: ip,
                    reason: `Request tampering detected: ${sigResult.error}`
                });
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
            await SuspiciousIP.create({
                ipAddress: clientIp,
                reason: `Token replay attack (original: ${tokenUsageCheck.originalIp})`
            });
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
                await SuspiciousIP.create({
                    ipAddress: clientIp,
                    reason: `Token validation failed: ${tokenValidation.error}`
                });
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
            // Log Suspicious IP
            const ip = getClientIp(request);
            await SuspiciousIP.create({
                ipAddress: ip,
                reason: 'Captcha verification failed (V4)'
            });

            return NextResponse.json(
                { error: 'CAPTCHA verification failed. Please try again.' },
                { status: 403 }
            );
        }

        // Mark request as processed (after all validations pass)
        processedRequests.set(requestHash, Date.now());

        // Security Check: Too many recent failures?
        const ip = getClientIp(request);
        const recentFailures = await SuspiciousIP.countDocuments({
            ipAddress: ip,
            createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last 1 hour
        });

        if (recentFailures >= 500) {
            return NextResponse.json(
                { error: 'Too many failed attempts. Please try again later.' },
                { status: 403 }
            );
        }

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
