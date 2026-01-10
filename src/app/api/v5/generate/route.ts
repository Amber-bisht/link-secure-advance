import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';
import Link from '@/models/Link';
import User from '@/models/User';
import { verifyCaptcha } from '@/utils/captcha';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { slug, captchaToken } = await req.json();

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        // 0. Verify CAPTCHA
        if (captchaToken) {
            const isCaptchaValid = await verifyCaptcha(captchaToken);
            if (!isCaptchaValid) {
                return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 403 });
            }
        }

        // 1. Find the Link
        const link = await Link.findOne({ slug });
        if (!link) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        // 2. Find the Owner
        const owner = await User.findById(link.ownerId);
        if (!owner) {
            return NextResponse.json({ error: 'Link owner not found' }, { status: 404 });
        }

        // 3. Check Owner Validity
        const now = new Date();
        if (!owner.validUntil || new Date(owner.validUntil) < now) {
            return NextResponse.json({
                error: 'This link is currently inactive because the owner\'s subscription has expired.',
                code: 'OWNER_EXPIRED'
            }, { status: 403 });
        }

        // 4. Capture IP Address
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

        // 5. Generate Session Token
        const token = crypto.randomBytes(16).toString('hex');
        await Session.create({
            token,
            targetUrl: link.targetUrl, // Get target from DB
            ipAddress: ip,
        });

        // 6. Construct Resolution URL (Frontend Page)
        const host = req.headers.get('host');
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        const resolveUrl = `${baseUrl}/v5/resolve/${token}`;

        // 7. Call LinkShortify API (STRICTLY Using Owner's Key)
        const shortenerKey = owner.linkShortifyKey;

        if (!shortenerKey) {
            console.error(`[V5 Generate Error] Link owner ${owner._id} has no API Key configured. Cannot generate link.`);
            return NextResponse.json({
                error: 'This link is currently unavailable because the owner has not configured their shortener API key.',
                code: 'OWNER_KEY_MISSING'
            }, { status: 403 });
        }

        const apiUrl = `https://linkshortify.com/api?api=${shortenerKey}&url=${encodeURIComponent(resolveUrl)}&format=text`;

        // 7. Handle localhost (LinkShortify doesn't support local IPs)
        if (resolveUrl.includes('localhost') || resolveUrl.includes('127.0.0.1')) {
            console.log(`[V5 Generate] Localhost detected. Bypassing provider.`);
            return NextResponse.json({
                success: true,
                shortenedUrl: resolveUrl,
                note: "LinkShortify does not support localhost. Returning direct link for testing."
            });
        }

        // Safety timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            console.log(`[LinkShortify Request] URL: ${resolveUrl}`);
            // Log masked key for debugging
            const maskedKey = shortenerKey.length > 8 ? shortenerKey.slice(0, 4) + '...' + shortenerKey.slice(-4) : '***';
            console.log(`[LinkShortify Debug] Using Owner Key: ${maskedKey}`);

            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            const shortLink = await response.text();

            console.log(`[LinkShortify Response] Status: ${response.status} ${response.statusText}`);
            console.log(`[LinkShortify Response] Content: "${shortLink}"`);

            if (!response.ok || !shortLink || shortLink.includes('error') || shortLink.trim() === '') {
                console.error("[LinkShortify Error Details]:", {
                    status: response.status,
                    statusText: response.statusText,
                    body: shortLink
                });
                return NextResponse.json({ error: 'Shortener Provider Error' }, { status: 502 });
            }

            return NextResponse.json({
                success: true,
                shortenedUrl: shortLink.trim()
            });
        } catch (e: any) {
            console.error(`[LinkShortify Timeout/Fetch Error]: ${e.message}`);
            return NextResponse.json({ error: 'Shortener API Timeout or Network Error' }, { status: 504 });
        }

    } catch (error) {
        console.error('V5 Generate Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
