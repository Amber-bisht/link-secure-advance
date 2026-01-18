import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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
        // @ts-ignore
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Check Validity via DB to get latest status and API Key
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

        // Check for LinkShortify API Key
        if (!user.linkShortifyKey) {
            return NextResponse.json({
                error: 'LinkShortify API Key missing.',
                code: 'KEY_MISSING'
            }, { status: 400 });
        }

        const body = await request.json();
        const { url, captchaToken, testMode } = body; // testMode for key verification

        // Validate inputs
        if (!url || (!captchaToken && !testMode)) {
            return NextResponse.json(
                { error: 'URL and CAPTCHA token are required' },
                { status: 400 }
            );
        }

        // Verify CAPTCHA (skip if testMode - strictly used for settings verification)
        if (!testMode) {
            const isCaptchaValid = await verifyCaptcha(captchaToken);
            if (!isCaptchaValid) {
                return NextResponse.json(
                    { error: 'CAPTCHA verification failed. Please try again.' },
                    { status: 403 }
                );
            }
        }

        // Validate URL format
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        // STRICT Validation: Only allow t.me links (or strictly no other shorteners)
        // For now, we prefer direct links. user requested "t.me/url link no link shorter allowed"
        const domain = new URL(targetUrl).hostname.replace('www.', '');
        const allowedDomains = ['t.me', 'telegram.me'];
        const blockedDomains = ['bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 'lksfy.com', 'linkshortify.com'];

        if (blockedDomains.some(d => domain.includes(d))) {
            return NextResponse.json(
                { error: 'Double shortening is not allowed. Please use the direct destination URL (e.g., t.me/...)' },
                { status: 400 }
            );
        }

        // Generate V4.1 Persistent Link
        // We use a custom slug or random one, but persist it in Link collection
        // This is the "Public URL" the owner shares

        const Link = (await import('@/models/Link')).default;

        // Check if user already has a link for this target? (Optional, skipping for now to allow multiple)

        // Generate a random slug for the persistent link
        const slug = crypto.randomBytes(4).toString('hex'); // 8 chars

        await Link.create({
            slug: slug,
            targetUrl: targetUrl,
            ownerId: user._id,
        });

        // Return the persistent link
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://links.asprin.dev';
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

