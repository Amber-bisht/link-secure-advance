import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Use an existing secret or fallback
const SECRET = process.env.CHALLENGE_SECRET || process.env.TOKEN_VALIDATION_SECRET || 'fallback-trap-secret';

function sign(value: string): string {
    return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

export async function GET(request: NextRequest) {
    // 1x1 Transparent GIF
    const imageBuffer = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    // Create a unique nonce for this session/request
    // This proves the client actually hit this endpoint (Proof of Work/Visit)
    // We bind to a nonce instead of IP to avoid false positives with dynamic IPs (mobile/IPv6)
    const nonce = crypto.randomUUID().replace(/-/g, '');

    // We rotate the proof every hour to prevent long-term replay, 
    // but allow it to persist for the session.
    const timestamp = Math.floor(Date.now() / 3600000); // Hourly bucket

    // Payload: trap-proof:{nonce}:{timestamp}
    const payload = `trap-proof:${nonce}:${timestamp}`;
    const signature = sign(payload);

    // Token format: [nonce].[timestamp].[sig]
    const token = `${nonce}.${timestamp}.${signature}`;

    const response = new NextResponse(imageBuffer, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });

    // Set the proof cookie
    // HttpOnly = true is safer so JS can't read it (bot script can't steal it easily from DOM).
    response.cookies.set({
        name: 'cf_trap_proof',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 3600 // 1 hour
    });

    return response;
}
