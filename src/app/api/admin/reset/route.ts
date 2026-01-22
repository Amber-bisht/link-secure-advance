import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// CAPTCHA server URL
const CAPTCHA_API_URL = process.env.CAPTCHA_METRICS_URL || process.env.CAPTCHA_API_URL || 'http://localhost:3001';

// POST: Reset rate limits, unban devices, or reset metrics
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        // @ts-ignore - role is added to session in auth.ts
        if (session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        const adminKey = process.env.CAPTCHA_ADMIN_KEY;
        if (!adminKey) {
            console.error('CAPTCHA_ADMIN_KEY not configured');
            return NextResponse.json({ error: 'Server misconfiguration: Missing Admin Key' }, { status: 500 });
        }

        const body = await request.json();
        const { action } = body;

        let endpoint = '';
        switch (action) {
            case 'reset-rate-limits':
                endpoint = '/api/admin/reset-rate-limits';
                break;
            case 'unban-all':
                endpoint = '/api/admin/unban-all';
                break;
            case 'reset-metrics':
                endpoint = '/api/admin/reset-metrics';
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const response = await fetch(`${CAPTCHA_API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`Failed to ${action}:`, response.status, errorData);
            return NextResponse.json(
                { error: errorData.error || `Failed to ${action}` },
                { status: response.status }
            );
        }

        const result = await response.json();

        return NextResponse.json({
            success: true,
            ...result,
        });

    } catch (error) {
        console.error('Admin Reset Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
