import { NextRequest, NextResponse } from 'next/server';
import { encodeLinkV41 } from '@/utils/linkWrapper';
import { verifyCaptcha, isRailwayDomain } from '@/utils/captcha';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        // Block Railway domains
        if (isRailwayDomain(request)) {
            return NextResponse.json(
                { error: 'Access denied from this domain' },
                { status: 403 }
            );
        }

        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Check Validity via DB to get latest status
        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const now = new Date();
        if (!user.validUntil || new Date(user.validUntil) < now) {
            return NextResponse.json({
                error: 'Subscription Expired. Please contact admin to renew.',
                code: 'EXPIRED'
            }, { status: 403 });
        }

        const body = await request.json();
        const { url, captchaToken } = body;

        // Validate inputs
        if (!url || !captchaToken) {
            return NextResponse.json(
                { error: 'URL and CAPTCHA token are required' },
                { status: 400 }
            );
        }

        // Verify CAPTCHA
        const isCaptchaValid = await verifyCaptcha(captchaToken);
        if (!isCaptchaValid) {
            return NextResponse.json(
                { error: 'CAPTCHA verification failed. Please try again.' },
                { status: 403 }
            );
        }

        // Validate URL format
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        // Generate V4.1 encoded link (uses different cipher than V4)
        const slug = encodeLinkV41(targetUrl);

        if (!slug) {
            return NextResponse.json(
                { error: 'Failed to encode URL' },
                { status: 500 }
            );
        }

        // Return the generated v4.1 link
        const origin = request.headers.get('origin') || '';
        const generatedLink = `${origin}/v4.1/${slug}`;

        return NextResponse.json({
            success: true,
            link: generatedLink,
            slug: slug,
            version: '4.1'
        });

    } catch (error) {
        console.error('V4.1 API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

