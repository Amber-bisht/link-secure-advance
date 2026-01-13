import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { decodeLinkV41 } from '@/utils/linkWrapper';
import { verifyCaptcha, verifyCustomCaptcha } from '@/utils/captcha';
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
        const isCaptchaValid = CAPTCHA_CONFIG.own === 1
            ? await verifyCustomCaptcha(captchaToken)
            : await verifyCaptcha(captchaToken);

        if (!isCaptchaValid) {
            return NextResponse.json(
                { error: 'CAPTCHA verification failed. Please try again.' },
                { status: 403 }
            );
        }

        // Decode the V4.1 link to get target URL (uses V4.1-specific cipher)
        const decodedUrl = decodeLinkV41(slug);

        if (!decodedUrl) {
            return NextResponse.json(
                { error: 'Invalid or expired link' },
                { status: 400 }
            );
        }

        // Generate session token for browser locking
        await dbConnect();
        const token = crypto.randomBytes(16).toString('hex');

        // Capture IP for pinning
        const forwarded = request.headers.get('x-forwarded-for');
        const ipAddress = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

        // Create session
        await Session.create({
            token,
            targetUrl: decodedUrl,
            ipAddress,
            used: false
        });

        // Set browser locking cookie
        const cookieStore = await cookies();
        cookieStore.set('v41_sid', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600 // 10 minutes
        });

        // Return target URL and token for client
        return NextResponse.json({
            success: true,
            targetUrl: decodedUrl,
            slug: slug,
            token: token
        });

    } catch (error) {
        console.error('V4.1 verify API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
