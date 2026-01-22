import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// CAPTCHA server URL - should be configured in environment
const CAPTCHA_METRICS_URL = process.env.CAPTCHA_METRICS_URL || process.env.CAPTCHA_API_URL || 'http://localhost:3001';

// GET: Fetch CAPTCHA metrics (Admin Only)
export async function GET() {
    try {
        const session = await auth();

        // @ts-ignore - role is added to session in auth.ts
        if (session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Fetch metrics from CAPTCHA server
        const response = await fetch(`${CAPTCHA_METRICS_URL}/api/metrics`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Don't cache metrics - always fetch fresh
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error('Failed to fetch CAPTCHA metrics:', response.status, response.statusText);
            return NextResponse.json(
                { error: 'Failed to fetch metrics from CAPTCHA server' },
                { status: response.status }
            );
        }

        const metricsData = await response.json();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...metricsData,
        });

    } catch (error) {
        console.error('Admin Metrics Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
