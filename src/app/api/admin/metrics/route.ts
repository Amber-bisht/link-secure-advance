import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// CAPTCHA server URL - strip /api/image suffix if present
const rawUrl = process.env.CAPTCHA_METRICS_URL || process.env.CAPTCHA_API_URL || 'http://localhost:3001';
const CAPTCHA_BASE_URL = rawUrl.replace(/\/api\/image\/?$/, '');

// GET: Fetch CAPTCHA metrics (Admin Only)
export async function GET() {
    try {
        const session = await auth();

        // @ts-ignore - role is added to session in auth.ts
        if (session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Fetch metrics from CAPTCHA server
        const adminKey = process.env.CAPTCHA_ADMIN_KEY;
        if (!adminKey) {
            console.error('CAPTCHA_ADMIN_KEY not configured in Next.js');
            return NextResponse.json({ error: 'Server misconfiguration: Missing Admin Key' }, { status: 500 });
        }

        const metricsUrl = `${CAPTCHA_BASE_URL}/api/metrics`;
        console.log(`[Admin Metrics] Fetching from: ${metricsUrl}`);

        const response = await fetch(metricsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
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
        console.log('[Admin Metrics] Raw data from captcha server:', JSON.stringify(metricsData, null, 2));

        // Get verifications data
        const verifySuccess = metricsData.metrics?.verifications?.success || 0;
        const verifyFail = metricsData.metrics?.verifications?.fail || 0;
        const totalVerifications = verifySuccess + verifyFail;

        // Transform the data to match frontend expectations
        const transformedMetrics = {
            success: true,
            timestamp: new Date().toISOString(),
            metrics: {
                totals: {
                    challenges: totalVerifications,
                    verifications: totalVerifications,
                    successRate: totalVerifications > 0
                        ? Math.round((verifySuccess / totalVerifications) * 100)
                        : 0,
                },
                byType: {
                    spatial: { success: 0, fail: 0 },
                    text: { success: verifySuccess, fail: verifyFail },
                },
                security: {
                    bannedAttempts: metricsData.metrics?.security?.bannedAttempts || 0,
                    honeypotTriggered: metricsData.metrics?.security?.honeypotTriggered || 0,
                    fingerprintAnomalies: metricsData.metrics?.security?.fingerprintAnomalies || 0,
                    uniqueDailyFingerprints: metricsData.metrics?.security?.uniqueDailyFingerprints || 0,
                    replays: metricsData.metrics?.security?.replays || 0,
                    timingAttacks: metricsData.metrics?.security?.timingAttacks || 0,
                },
                performance: {
                    avgSolveTimeMs: metricsData.metrics?.performance?.avgSolveTimeMs || 0,
                },
            },
            hourlyStats: metricsData.hourlyStats || [],
        };

        return NextResponse.json(transformedMetrics);

    } catch (error) {
        console.error('Admin Metrics Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
