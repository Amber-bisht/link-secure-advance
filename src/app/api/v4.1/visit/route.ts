import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';
import Link from '@/models/Link';
import User from '@/models/User';
import { cookies } from 'next/headers';
import { verifyTurnstile } from '@/utils/turnstile';
import { getClientIp } from '@/utils/ip';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        // BOT KILLER: Strict Header Validation
        const referer = request.headers.get('referer') || '';
        const requestOrigin = request.headers.get('origin') || '';
        const host = request.headers.get('host') || '';
        const secFetchSite = request.headers.get('sec-fetch-site');

        // 1. Origin/Referer must match host
        const isSelfReferenced = referer.includes(host) || requestOrigin.includes(host);
        if (!isSelfReferenced) {
            return NextResponse.json({ error: 'Direct access forbidden', action: 'error_bot' }, { status: 403 });
        }

        // 2. Browser-specific behavior check (Sec-Fetch headers)
        if (secFetchSite && secFetchSite !== 'same-origin') {
            return NextResponse.json({ error: 'Security violation: Cross-site request blocked', action: 'error_bot' }, { status: 403 });
        }

        const cookieStore = await cookies();
        const body = await request.json();
        const { slug, token, verified, turnstileToken, challenge_id, timing, entropy, counter } = body;

        // Security Layer 1: Challenge Verification
        const clientProof = request.headers.get('x-client-proof');

        if (!challenge_id || !clientProof || timing === undefined || !entropy || counter === undefined) {
            return NextResponse.json({
                error: 'Security challenge required',
                action: 'error_bot'
            }, { status: 403 });
        }

        // Security Layer 2: Client Proof Verification
        const { verifyClientProof } = await import('@/utils/challenge');
        const ua = request.headers.get('user-agent') || '';
        const ipForBind = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
        const proofResult = verifyClientProof(challenge_id, clientProof, timing, entropy, counter, ipForBind, ua);

        if (!proofResult.valid) {
            return NextResponse.json({
                error: `Security verification failed: ${proofResult.error}`,
                action: 'error_bot'
            }, { status: 403 });
        }

        // 0. Cloudflare Turnstile Verification (Invisible RUM)
        if (!turnstileToken) {
            return NextResponse.json({
                error: 'Security challenge failed (missing token)',
                action: 'error_bot'
            }, { status: 403 });
        }

        const ip = getClientIp(request);
        const isTurnstileValid = await verifyTurnstile(turnstileToken);
        if (!isTurnstileValid) {
            return NextResponse.json({
                error: 'Security verification failed. Please refresh.',
                action: 'error_bot'
            }, { status: 403 });
        }

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
                            error: 'You have bypassed through bot or extension. Please re-open it to try again.',
                            action: 'error_bot'
                        }, { status: 403 });
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
        // ip is already defined above

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

        // --- Rotation Logic ---
        const visitNum = body.visitNumber || 1;

        let providerKey = owner.linkShortifyKey;
        let providerUrl = 'https://linkshortify.com/api';
        let providerName = 'LinkShortify';

        // Select Provider based on Visit Number with Sequential Fallback
        // Logic:
        // Visit 2: Try AroLinks -> VPLink -> InShortUrl -> LinkShortify
        // Visit 3: Try VPLink -> InShortUrl -> LinkShortify
        // Visit 4: Try InShortUrl -> LinkShortify
        // Visit 1, 5+: LinkShortify

        if (visitNum === 2) {
            if (owner.aroLinksKey) {
                providerKey = owner.aroLinksKey;
                providerUrl = 'https://arolinks.com/api';
                providerName = 'AroLinks';
            } else if (owner.vpLinkKey) {
                providerKey = owner.vpLinkKey;
                providerUrl = 'https://vplink.in/api';
                providerName = 'VPLink';
            } else if (owner.inShortUrlKey) {
                providerKey = owner.inShortUrlKey;
                providerUrl = 'https://inshorturl.com/api';
                providerName = 'InShortUrl';
            }
        } else if (visitNum === 3) {
            if (owner.vpLinkKey) {
                providerKey = owner.vpLinkKey;
                providerUrl = 'https://vplink.in/api';
                providerName = 'VPLink';
            } else if (owner.inShortUrlKey) {
                providerKey = owner.inShortUrlKey;
                providerUrl = 'https://inshorturl.com/api';
                providerName = 'InShortUrl';
            }
        } else if (visitNum === 4) {
            if (owner.inShortUrlKey) {
                providerKey = owner.inShortUrlKey;
                providerUrl = 'https://inshorturl.com/api';
                providerName = 'InShortUrl';
            }
        }
        // Fallback or Default is LinkShortify (already set)

        const shortenApiUrl = `${providerUrl}?api=${providerKey}&url=${encodeURIComponent(callbackUrl)}&format=text`;

        let shortLink = '';
        try {
            const lsResponse = await fetch(shortenApiUrl);
            shortLink = await lsResponse.text();
            shortLink = shortLink.trim();

            if (!lsResponse.ok || !shortLink.startsWith('http')) {
                console.error(`${providerName} Error:`, shortLink);

                // Fallback to LinkShortify if rotation failed and it wasn't LinkShortify
                if (providerName !== 'LinkShortify') {
                    console.log('Falling back to LinkShortify...');
                    const fallbackUrl = `https://linkshortify.com/api?api=${owner.linkShortifyKey}&url=${encodeURIComponent(callbackUrl)}&format=text`;
                    const fallbackRes = await fetch(fallbackUrl);
                    shortLink = await fallbackRes.text();
                    shortLink = shortLink.trim();
                    if (!fallbackRes.ok || !shortLink.startsWith('http')) {
                        throw new Error(`Fallback LinkShortify failed: ${shortLink}`);
                    }
                } else {
                    throw new Error(`${providerName} API returned invalid response`);
                }
            }
        } catch (lsError) {
            console.error('Shortener Generation Failed:', lsError);
            return NextResponse.json(
                { error: 'Link Generation Failed' },
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
