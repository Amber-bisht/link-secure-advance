import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import V41Link from '@/models/V41Link';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';
import SuspiciousIP from '@/models/SuspiciousIP';
import { getClientIp } from '@/utils/ip';
import { verifyRequestSignature } from '@/utils/requestIntegrity';
import { validateCaptchaToken, generateRequestFingerprint, isTokenUsed } from '@/utils/tokenValidator';
import { verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';

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

        // 1. Origin/Referer must match host
        const isSelfReferenced = referer.includes(host) || origin.includes(host);
        if (!isSelfReferenced) {
            return NextResponse.json({ error: 'Direct access forbidden' }, { status: 403 });
        }

        // 2. Browser-specific behavior check
        if (secFetchSite && secFetchSite !== 'same-origin') {
            return NextResponse.json({ error: 'Security violation: Cross-site request blocked' }, { status: 403 });
        }

        const body = await request.json();
        const { slug, captchaToken, visitCount, challenge_id, timing, entropy, counter, _sig, _ts } = body;

        // Basic Validation
        if (!slug || !visitCount) {
            return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
        }

        // ===== Phase B: Request Timestamp Validation =====
        if (timing) {
            const requestAge = Date.now() - timing;
            if (requestAge > 60000) {
                return NextResponse.json({ error: 'Request expired. Please refresh and try again.' }, { status: 403 });
            }
        }

        // ===== Phase B: Request Deduplication =====
        const crypto = await import('crypto');
        const requestHash = crypto.createHash('sha256')
            .update(`${slug}:${challenge_id}:${captchaToken?.substring(0, 50)}`)
            .digest('hex')
            .substring(0, 32);

        if (processedRequests.has(requestHash)) {
            return NextResponse.json({ error: 'Request already processed' }, { status: 409 });
        }

        // ===== Security Layer 0: Request Integrity (if signature provided) =====
        if (_sig && _ts) {
            const { _sig: _, _ts: __, ...originalBody } = body;
            const sigResult = verifyRequestSignature(originalBody, _ts, _sig);

            if (!sigResult.valid) {
                const ip = getClientIp(request);
                await SuspiciousIP.create({ ipAddress: ip, reason: `Request tampering: ${sigResult.error}` });
                return NextResponse.json({ error: 'Request integrity verification failed' }, { status: 403 });
            }
        }

        // Security Layer 1: Challenge Verification
        const clientProof = request.headers.get('x-client-proof');

        if (!challenge_id || !clientProof || timing === undefined || !entropy || counter === undefined) {
            return NextResponse.json({ error: 'Security challenge required' }, { status: 403 });
        }

        // Security Layer 2: Client Proof Verification
        const { verifyClientProof } = await import('@/utils/challenge');
        const ipForBind = getClientIp(request);
        const ua = request.headers.get('user-agent') || '';
        const proofResult = await verifyClientProof(challenge_id, clientProof, timing, entropy, counter, ipForBind, ua);

        if (!proofResult.valid) {
            return NextResponse.json({ error: `Security verification failed: ${proofResult.error}` }, { status: 403 });
        }

        // ===== Phase B: Enhanced Token Validation =====
        const clientIp = getClientIp(request);
        const requestFingerprint = generateRequestFingerprint(Object.fromEntries(request.headers.entries()) as Record<string, string>);

        const tokenUsageCheck = isTokenUsed(captchaToken);
        if (tokenUsageCheck.used) {
            await SuspiciousIP.create({ ipAddress: clientIp, reason: `Token replay (orig: ${tokenUsageCheck.originalIp})` });
            return NextResponse.json({ error: 'Token already used. Please complete a new CAPTCHA.' }, { status: 403 });
        }

        if (CAPTCHA_CONFIG.own === 1) {
            const tokenValidation = await validateCaptchaToken(captchaToken, clientIp, requestFingerprint);
            if (!tokenValidation.valid) {
                await SuspiciousIP.create({ ipAddress: clientIp, reason: `Token validation failed: ${tokenValidation.error}` });
                return NextResponse.json({ error: tokenValidation.error || 'Token validation failed' }, { status: 403 });
            }
        }

        // Verify CAPTCHA
        let isCaptchaValid = false;
        if (CAPTCHA_CONFIG.own === 1) {
            const ipForVerify = (clientIp === '::1' || clientIp === '127.0.0.1') ? undefined : clientIp;
            isCaptchaValid = await verifyCustomCaptcha(captchaToken, ipForVerify);
        } else {
            isCaptchaValid = await verifyTurnstile(captchaToken);
        }

        if (!isCaptchaValid) {
            const ip = getClientIp(request);
            await SuspiciousIP.create({ ipAddress: ip, reason: 'Captcha verification failed (V4.1)' });
            return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 403 });
        }

        // Mark request as processed
        processedRequests.set(requestHash, Date.now());


        // 2. Fetch Link
        const link = await V41Link.findOne({ slug });
        if (!link) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        // 3. Rotation Logic (Traffic Loop)
        const requestedIndex = ((visitCount - 1) % 4) + 1; // 1, 2, 3, 4

        // Helper to get url by id
        const getUrl = (id: number): string | undefined => {
            switch (id) {
                case 1: return link.linkShortifyUrl;
                case 2: return link.aroLinksUrl;
                case 3: return link.vpLinkUrl;
                case 4: return link.inShortUrlUrl;
                default: return undefined;
            }
        };

        let targetUrl = getUrl(requestedIndex) || "";

        if (!targetUrl) {
            // Try 3, then 4, then 1... (Look ahead loop)
            for (let i = 1; i <= 4; i++) {
                const nextIndex = ((requestedIndex - 1 + i) % 4) + 1;
                const nextUrl = getUrl(nextIndex);
                if (nextUrl) {
                    targetUrl = nextUrl;
                    break;
                }
            }
        }

        // Final fallback
        if (!targetUrl) {
            if (link.urls && link.urls.length > 0) targetUrl = link.urls[0];
            else targetUrl = link.originalUrl;
        }

        return NextResponse.json({ url: targetUrl });

    } catch (error) {
        console.error("Redirection error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
