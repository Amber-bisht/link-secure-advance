import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { decodeLinkV5 } from '@/utils/linkWrapper';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';
import { getClientIp } from '@/utils/ip';
import { validateCaptchaToken, generateRequestFingerprint, isTokenUsed } from '@/utils/tokenValidator';

const processedRequests = new Map<string, number>();
const MAX_REQUEST_AGE_MS = 60000;

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

        const referer = request.headers.get('referer') || '';
        const origin = request.headers.get('origin') || '';
        const host = request.headers.get('host') || '';
        const secFetchSite = request.headers.get('sec-fetch-site');

        const isSelfReferenced = referer.includes(host) || origin.includes(host);
        if (!isSelfReferenced) {
            return NextResponse.json({ error: 'Direct access forbidden' }, { status: 403 });
        }

        if (secFetchSite && secFetchSite !== 'same-origin') {
            return NextResponse.json({ error: 'Security violation: Cross-site request blocked' }, { status: 403 });
        }

        const body = await request.json();
        const { challenge_id, encrypted, iv } = body;

        if (!challenge_id || !encrypted || !iv) {
            return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
        }

        const { verifyChallenge, decryptPayload } = await import('@/utils/challenge');
        const challengeResult = await verifyChallenge(challenge_id);
        if (!challengeResult.valid || !challengeResult.challenge) {
            return NextResponse.json({ error: 'Security Session Expired' }, { status: 403 });
        }

        const nonce = challengeResult.challenge.nonce;
        let decryptedBody;
        try {
            decryptedBody = await decryptPayload(encrypted, iv, nonce);
        } catch (e) {
            return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
        }

        const { slug, captchaToken, timing, entropy, counter } = decryptedBody;

        if (decryptedBody.challenge_id !== challenge_id) {
            return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
        }

        // Request timing validation
        if (timing) {
            const requestAge = Date.now() - timing;
            if (requestAge > 120000 || requestAge < -5000) {
                return NextResponse.json({ error: 'Invalid request timing' }, { status: 403 });
            }
        }

        // Deduplication
        const crypto = await import('crypto');
        const requestHash = crypto.createHash('sha256')
            .update(`${slug}:${challenge_id}:${captchaToken?.substring(0, 50)}`)
            .digest('hex')
            .substring(0, 32);

        if (processedRequests.has(requestHash)) {
            return NextResponse.json({ error: 'Request already processed' }, { status: 409 });
        }

        // Client Proof Verification
        const clientProof = request.headers.get('x-client-proof');
        const { verifyClientProof } = await import('@/utils/challenge');
        const clientIp = getClientIp(request);
        const ua = request.headers.get('user-agent') || '';

        const proofResult = await verifyClientProof(challenge_id, clientProof || '', timing, entropy, counter, clientIp, ua);
        if (!proofResult.valid) {
            return NextResponse.json({ error: `Security verification failed: ${proofResult.error}` }, { status: 403 });
        }

        // Token Replay Prevention
        const tokenUsageCheck = isTokenUsed(captchaToken);
        if (tokenUsageCheck.used) {
            return NextResponse.json({ error: 'Token already used' }, { status: 403 });
        }

        // CAPTCHA Verification – V5 Archery Token (HMAC-signed)
        let isCaptchaValid = false;

        if (captchaToken && captchaToken.startsWith('v5_archery_')) {
            try {
                const tokenBody = captchaToken.slice('v5_archery_'.length);
                const dotIdx = tokenBody.lastIndexOf('.');

                if (dotIdx === -1) {
                    return NextResponse.json({ error: 'Malformed archery token' }, { status: 403 });
                }

                const payloadB64 = tokenBody.slice(0, dotIdx);
                const clientSig = tokenBody.slice(dotIdx + 1);

                // Reconstruct HMAC using challenge nonce
                const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf-8');
                const key = crypto.createHash('sha256').update(nonce).digest();
                const expectedSig = crypto.createHmac('sha256', key).update(payloadStr).digest('hex');

                // Constant-time comparison
                if (clientSig.length !== expectedSig.length ||
                    !crypto.timingSafeEqual(Buffer.from(clientSig), Buffer.from(expectedSig))) {
                    return NextResponse.json({ error: 'Invalid archery token signature' }, { status: 403 });
                }

                // Validate payload contents
                const payload = JSON.parse(payloadStr);

                // Token age check (max 60 seconds)
                if (!payload.ts || Date.now() - payload.ts > 60000) {
                    return NextResponse.json({ error: 'Archery token expired' }, { status: 403 });
                }

                // Minimum interaction check (anti-bot)
                if (payload.moves !== undefined && payload.moves < 3) {
                    return NextResponse.json({ error: 'Insufficient interaction detected' }, { status: 403 });
                }

                // Duration check – at least 1 second of gameplay
                if (payload.dur !== undefined && payload.dur < 1000) {
                    return NextResponse.json({ error: 'Suspicious timing: too fast' }, { status: 403 });
                }

                isCaptchaValid = true;
            } catch (e) {
                console.error('Archery token validation error:', e);
                return NextResponse.json({ error: 'Invalid archery token' }, { status: 403 });
            }
        } else if (CAPTCHA_CONFIG.own === 2) {
            isCaptchaValid = await verifyTurnstile(captchaToken);
        } else {
            isCaptchaValid = await verifyTurnstile(captchaToken);
        }

        if (!isCaptchaValid) {
            return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 403 });
        }

        processedRequests.set(requestHash, Date.now());

        // Decode URL (v5 logic)
        const decodedUrl = decodeLinkV5(slug);
        if (!decodedUrl) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
        }

        return NextResponse.json({ success: true, url: decodedUrl });

    } catch (error) {
        console.error('V5 redirect API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
