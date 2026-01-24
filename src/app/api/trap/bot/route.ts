import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // If this endpoint is hit, it's a bot/crawler that disregarded the hidden/nofollow nature

    // Create a generic response
    const response = new NextResponse(JSON.stringify({ status: 'ok' }), {
        status: 200, // Pretend to be a valid endpoint
        headers: {
            'Content-Type': 'application/json'
        }
    });

    // Set the "Poison Pill" cookie
    // Any request with this cookie will be rejected by middleware
    response.cookies.set({
        name: 'cf_bot_flag',
        value: 'true',
        httpOnly: true, // Hide from JS so they don't know they're marked easily
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 365 // 1 year
    });

    return response;
}
