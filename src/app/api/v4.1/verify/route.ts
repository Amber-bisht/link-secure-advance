import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha, verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug, captchaToken } = body;

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
            return NextResponse.json(
                { error: 'CAPTCHA verification failed. Please try again.' },
                { status: 403 }
            );
        }

        // Look up Session
        await dbConnect();
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
