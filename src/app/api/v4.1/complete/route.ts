import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // 1. Find Session
        const session = await Session.findOne({ token });

        if (!session) {
            return NextResponse.json(
                { error: 'Session expired or invalid' },
                { status: 404 }
            );
        }

        // 2. Check Anti-Replay
        if (session.used) {
            return NextResponse.json(
                { error: 'Link already used' },
                { status: 410 }
            );
        }

        // 3. Verify IP Pinning
        const forwarded = request.headers.get('x-forwarded-for');
        const currentIp = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

        if (session.ipAddress !== currentIp) {
            console.warn(`[V4.1 Security] IP Mismatch for token ${token}. Expected ${session.ipAddress}, got ${currentIp}`);

            // Allow mismatch in development
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({
                    error: 'Security Check Failed: IP Mismatch',
                    code: 'IP_MISMATCH'
                }, { status: 403 });
            }
        }

        // 4. Verify Browser Locking Cookie
        const sidCookie = request.headers.get('cookie')
            ?.split('; ')
            .find(row => row.startsWith('v41_sid='))
            ?.split('=')[1];

        if (process.env.NODE_ENV === 'production' && sidCookie !== token) {
            console.warn(`[V4.1 Security] Cookie Mismatch for token ${token}. Cookie: ${sidCookie}`);
            return NextResponse.json({
                error: 'Security Check Failed: Browser mismatch',
                code: 'BROWSER_MISMATCH'
            }, { status: 403 });
        }

        // 5. Verify Time Delay (minimum 5 seconds for cookie loading)
        const now = new Date();
        const elapsedSeconds = (now.getTime() - new Date(session.createdAt).getTime()) / 1000;

        if (elapsedSeconds < 5) {
            console.warn(`[V4.1 Security] Request too fast. Token: ${token}, Elapsed: ${elapsedSeconds.toFixed(1)}s`);
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({
                    error: 'Security Check Failed: Request too fast. Please wait for cookie loading.',
                    code: 'TOO_FAST'
                }, { status: 403 });
            }
        }

        // 6. Mark session as used (anti-replay)
        session.used = true;
        await session.save();

        // 7. Return final URL
        return NextResponse.json({
            success: true,
            finalUrl: session.targetUrl
        });

    } catch (error) {
        console.error('V4.1 complete API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
