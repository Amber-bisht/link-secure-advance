import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const CAPTCHA_API_URL = process.env.CAPTCHA_API_URL;
const CAPTCHA_ADMIN_KEY = process.env.CAPTCHA_ADMIN_KEY;

export async function GET() {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CAPTCHA_API_URL || !CAPTCHA_ADMIN_KEY) {
        return NextResponse.json({ error: 'CAPTCHA API not configured' }, { status: 500 });
    }

    try {
        const res = await fetch(`${CAPTCHA_API_URL}/api/admin/ratelimit`, {
            headers: {
                'x-admin-key': CAPTCHA_ADMIN_KEY,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch rate limits' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Rate limit fetch error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!CAPTCHA_API_URL || !CAPTCHA_ADMIN_KEY) {
        return NextResponse.json({ error: 'CAPTCHA API not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();

        const res = await fetch(`${CAPTCHA_API_URL}/api/admin/ratelimit`, {
            method: 'POST',
            headers: {
                'x-admin-key': CAPTCHA_ADMIN_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const error = await res.json();
            return NextResponse.json({ error: error.error || 'Failed to update' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Rate limit update error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
