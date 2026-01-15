import { NextRequest, NextResponse } from 'next/server';
import { decodeLinkV4 } from '@/utils/linkWrapper';
import { verifyCaptcha, verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';

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
