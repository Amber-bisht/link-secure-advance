import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';
import { verifyCaptcha } from '@/utils/captcha';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { token, captchaToken } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        // 0. Verify CAPTCHA
        if (!captchaToken && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Security verification required' }, { status: 400 });
        }

        if (captchaToken) {
            const isCaptchaValid = await verifyCaptcha(captchaToken);
            if (!isCaptchaValid) {
                return NextResponse.json({ error: 'Security verification failed' }, { status: 403 });
            }
        }

        // 1. Find Session
        const session = await Session.findOne({ token });

        if (!session) {
            return NextResponse.json({ error: 'Link expired or invalid' }, { status: 404 });
        }

        // 2. Check Anti-Replay
        if (session.used) {
            return NextResponse.json({ error: 'Link already used' }, { status: 410 });
        }

        // 3. Verify IP Pinning
        const forwarded = req.headers.get('x-forwarded-for');
        const currentIp = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

        if (session.ipAddress !== currentIp) {
            console.warn(`[V5 Security Check] IP Mismatch for token ${token}. Expected ${session.ipAddress}, got ${currentIp}`);

            // Allow mismatch in development for easier testing
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({
                    error: 'Security Check Failed: IP Mismatch. Please regenerate the link and don\'t use proxies or extractors.',
                    code: 'IP_MISMATCH'
                }, { status: 403 });
            }
        }

        // 4. Verify Referer (Prevent Direct API Calls)
        const referer = req.headers.get('referer');
        const host = req.headers.get('host');
        if (process.env.NODE_ENV === 'production' && (!referer || !referer.includes(host || ''))) {
            console.warn(`[V5 Security Check] Invalid Referer: ${referer} for host: ${host}`);
            return NextResponse.json({
                error: 'Security Check Failed: Direct API access is prohibited.',
                code: 'INVALID_REFERER'
            }, { status: 403 });
        }

        // 5. Mark as Used
        session.used = true;
        await session.save();

        // 5. Return Target URL
        return NextResponse.json({
            success: true,
            url: session.targetUrl
        });

    } catch (error) {
        console.error('V5 Resolve Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
