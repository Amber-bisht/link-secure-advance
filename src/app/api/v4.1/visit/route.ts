import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';
import Link from '@/models/Link';
import User from '@/models/User';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const cookieStore = await cookies();
        const body = await request.json();
        const { slug, token, verified } = body;

        // 1. Check for Active Session via Cookie or Token (Verified or Active)
        // If we have a verified token incoming, we verify it and set cookie
        // If we have a cookie, we check limits

        const sessionToken = token || cookieStore.get('v41_sid')?.value;

        if (sessionToken) {
            const session = await Session.findOne({ token: sessionToken });

            if (session) {
                // If this is a callback verification (token + verified=true)
                if (token && verified && session.status === 'pending') {
                    // Mark as active
                    session.status = 'active';
                    session.usageCount += 1; // First use
                    await session.save();

                    // Set Cookie
                    cookieStore.set('v41_sid', session.token, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        maxAge: 360 // 6 minutes
                    });

                    return NextResponse.json({
                        action: 'redirect',
                        url: session.targetUrl
                    });
                }

                // Normal Visit with Cookie/Token
                if (session.status === 'active') {
                    // Check Limits
                    if (session.usageCount >= session.maxUses) {
                        return NextResponse.json(
                            { error: 'Link Limit Reached (3/3 Uses)' },
                            { status: 410 }
                        );
                    }

                    // Increment
                    session.usageCount += 1;
                    await session.save();

                    return NextResponse.json({
                        action: 'redirect',
                        url: session.targetUrl
                    });
                }
            }
        }

        // 2. New Session Creation
        // Find the Parent Link
        const link = await Link.findOne({ slug: slug });
        if (!link) {
            return NextResponse.json(
                { error: 'Link not found' },
                { status: 404 }
            );
        }

        // Find Owner for API Key
        const owner = await User.findById(link.ownerId);
        if (!owner || !owner.linkShortifyKey) {
            return NextResponse.json(
                { error: 'Link configuration error (Owner Key Missing)' },
                { status: 500 }
            );
        }

        // Create Pending Session
        const newSessionToken = crypto.randomBytes(12).toString('hex');
        await Session.create({
            token: newSessionToken,
            targetUrl: link.targetUrl, // Use parent's target
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
            linkId: link._id,
            status: 'pending',
            maxUses: 3,
            usageCount: 0,
        });

        // Generate Callback/Intermediate URL
        // format: domain/v4.1/slug?session=token&verified=true
        // We actually want the user to visit LinkShortify, then LS redirects back to...
        // LS redirects to the URL we send it.
        // So we send it: origin/v4.1/slug?token=xyz&verified=true
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://links.asprin.dev';
        const callbackUrl = `${origin}/v4.1/${slug}?token=${newSessionToken}&verified=true`;

        // Shorten with LinkShortify
        const linkShortifyUrl = `https://linkshortify.com/api?api=${owner.linkShortifyKey}&url=${encodeURIComponent(callbackUrl)}&format=text`;

        const lsResponse = await fetch(linkShortifyUrl);
        const shortLink = await lsResponse.text();

        if (!lsResponse.ok || !shortLink.startsWith('http')) {
            console.error('LinkShortify Error:', shortLink);
            return NextResponse.json(
                { error: 'LinkShortify Generation Failed' },
                { status: 502 }
            );
        }

        return NextResponse.json({
            action: 'shorten',
            url: shortLink.trim()
        });

    } catch (error) {
        console.error('V4.1 Visit API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
