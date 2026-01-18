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
                    // Check Time Duration (Anti-Bot)
                    const now = new Date().getTime();
                    const created = new Date(session.createdAt).getTime();
                    const durationSeconds = (now - created) / 1000;

                    if (durationSeconds < 75) { // 1.25 minutes
                        // Bot Detected / Too Fast
                        await Session.deleteOne({ _id: session._id }); // Destroy session

                        return NextResponse.json({
                            error: 'Bypass Detected: You are moving too fast! (Under 1m 25s). Please disable any "Bypass Bots" and follow the link manually.',
                            action: 'error_bot'
                        });
                    }

                    // Mark as active
                    session.status = 'active';
                    session.usageCount += 1; // First use
                    await session.save();

                    // Set Cookie
                    cookieStore.set('v41_sid', session.token, {
                        httpOnly: true, // Secure cookie
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
                    // Check Limits & Expiry
                    const isLimitReached = session.usageCount >= session.maxUses;
                    const isExpired = (new Date().getTime() - new Date(session.createdAt).getTime()) > 360000; // 6 mins

                    if (!isLimitReached && !isExpired) {
                        // Valid Session - Increment & Redirect
                        session.usageCount += 1;
                        await session.save();

                        return NextResponse.json({
                            action: 'redirect',
                            url: session.targetUrl
                        });
                    }

                    // IF INVALID (Expired or Limit Reached):
                    // Do NOT return error.
                    // Fall through to "New Session Creation" below.
                    // This allows the user to start a new flow (re-shorten).
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

        // Optimization: Check if there is already a PENDING session for this IP and Link
        // This prevents creating multiple sessions if the user refreshes the "Connecting..." page
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

        const existingPending = await Session.findOne({
            linkId: link._id,
            ipAddress: ip,
            status: 'pending'
        });

        if (existingPending && existingPending.shortLink) {
            return NextResponse.json({
                action: 'shorten',
                url: existingPending.shortLink
            });
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

        // Generate Callback/Intermediate URL
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://links.asprin.dev';
        const callbackUrl = `${origin}/v4.1/${slug}?token=${newSessionToken}&verified=true`;

        // Shorten with LinkShortify
        const linkShortifyUrl = `https://linkshortify.com/api?api=${owner.linkShortifyKey}&url=${encodeURIComponent(callbackUrl)}&format=text`;

        let shortLink = '';
        try {
            const lsResponse = await fetch(linkShortifyUrl);
            shortLink = await lsResponse.text();
            shortLink = shortLink.trim();

            if (!lsResponse.ok || !shortLink.startsWith('http')) {
                console.error('LinkShortify Error:', shortLink);
                throw new Error('LinkShortify API returned invalid response');
            }
        } catch (lsError) {
            console.error('LinkShortify Generation Failed:', lsError);
            return NextResponse.json(
                { error: 'LinkShortify Generation Failed' },
                { status: 502 }
            );
        }

        // Save Session WITH successful shortLink
        await Session.create({
            token: newSessionToken,
            targetUrl: link.targetUrl, // Use parent's target
            ipAddress: ip,
            linkId: link._id,
            status: 'pending',
            shortLink: shortLink,
            maxUses: 3,
            usageCount: 0,
        });

        return NextResponse.json({
            action: 'shorten',
            url: shortLink
        });

    } catch (error) {
        console.error('V4.1 Visit API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
