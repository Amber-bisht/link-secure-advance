import { NextRequest, NextResponse } from 'next/server';
import { decodeLinkV4 } from '@/utils/linkWrapper';
import { verifyCaptcha, verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';
import SuspiciousIP from '@/models/SuspiciousIP';
import { getClientIp } from '@/utils/ip';
import { verifyRequestSignature } from '@/utils/requestIntegrity';

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

        // Verify CAPTCHA
        let isCaptchaValid = false;
        const clientIp = getClientIp(request);

        if (CAPTCHA_CONFIG.own === 1) {
            isCaptchaValid = await verifyCustomCaptcha(captchaToken, clientIp);
        } else if (CAPTCHA_CONFIG.own === 2) {
            isCaptchaValid = await verifyTurnstile(captchaToken);
        } else {
            isCaptchaValid = await verifyCaptcha(captchaToken);
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

        // Security Check: Too many recent failures?
        const ip = getClientIp(request);
        const recentFailures = await SuspiciousIP.countDocuments({
            ipAddress: ip,
            createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last 1 hour
        });

        if (recentFailures >= 5) {
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
