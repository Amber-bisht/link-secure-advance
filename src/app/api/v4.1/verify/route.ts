import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha, verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';
import SuspiciousIP from '@/models/SuspiciousIP';
import { getClientIp } from '@/utils/ip';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const body = await request.json();
        const { slug, captchaToken, challenge_id, timing, entropy, counter } = body;

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
        const proofResult = verifyClientProof(challenge_id, clientProof, timing, entropy, counter, ipForBind, ua);

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

        if (CAPTCHA_CONFIG.own === 1) {
            isCaptchaValid = await verifyCustomCaptcha(captchaToken);
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
                reason: 'Captcha verification failed'
            });

            return NextResponse.json(
                { error: 'CAPTCHA verification failed. Please try again.' },
                { status: 403 }
            );
        }

        // Look up Session
        // dbConnect already called at start

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

        // slug here is the token
        const session = await Session.findOne({ token: slug });

        if (!session) {
            return NextResponse.json(
                { error: 'Link Expired or Invalid' },
                { status: 404 }
            );
        }

        // Check Usage Limits
        if (session.usageCount >= session.maxUses) {
            return NextResponse.json(
                { error: 'Link Limit Reached (Max 3 uses)' },
                { status: 410 } // Gone
            );
        }

        // Check if expired (double check manual time)
        // 6 minutes = 360000 ms
        const isExpired = (new Date().getTime() - new Date(session.createdAt).getTime()) > 360000;
        if (isExpired) {
            return NextResponse.json(
                { error: 'Link Time Expired (6 mins)' },
                { status: 410 }
            );
        }

        // Increment Usage
        session.usageCount += 1;
        await session.save();

        // Browser Pinning Logic (Optional enhancement: check if same IP?)
        // The original requirement mentioned "session is of 6min total - session can be used 3 times only"
        // It didn't strictly say "per user", but usually "session" implies a specific flow.
        // We track usage on the session object which is unique per generated link.

        // Return target URL
        return NextResponse.json({
            success: true,
            targetUrl: session.targetUrl,
            slug: slug,
            token: slug // reusing token as id
        });

    } catch (error) {
        console.error('V4.1 verify API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
