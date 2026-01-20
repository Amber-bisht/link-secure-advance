import { NextRequest, NextResponse } from 'next/server';
import { decodeLinkV4 } from '@/utils/linkWrapper';
import { verifyCaptcha, verifyCustomCaptcha } from '@/utils/captcha';
import { verifyTurnstile } from '@/utils/turnstile';
import { CAPTCHA_CONFIG } from '@/config/captcha';
import dbConnect from '@/lib/db';
import SuspiciousIP from '@/models/SuspiciousIP';
import { getClientIp } from '@/utils/ip';

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
            // Log Suspicious IP
            await dbConnect();
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
