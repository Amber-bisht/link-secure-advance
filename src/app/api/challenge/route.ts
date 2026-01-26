import { NextRequest, NextResponse } from 'next/server';
import { generateChallenge } from '@/utils/challenge';
import { getClientIp } from '@/utils/ip';

/**
 * Challenge Generation Endpoint
 * GET /api/challenge
 * 
 * Returns a server-issued challenge for API protection
 */
export async function GET(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        const userAgent = request.headers.get('user-agent') || '';

        // Generate challenge with rate limiting
        const challenge = await generateChallenge(ip);

        if (!challenge) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Maximum 10 challenges per minute.' },
                { status: 429 }
            );
        }


        // Bind UA (optional, but helps reduce replay across different clients)
        // Stored on server only; client doesn't need it.
        const crypto = require('crypto');
        challenge.uaHash = crypto.createHash('sha256').update(userAgent).digest('hex');
        await challenge.save();

        // Return challenge data to client (NO server secret shipped)
        return NextResponse.json({
            challenge_id: challenge.challenge_id,
            nonce: challenge.nonce,
            difficulty: challenge.difficulty,
            signature: challenge.signature,
            expiresAt: challenge.expiresAt
        });

    } catch (error) {
        console.error('Challenge generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate challenge' },
            { status: 500 }
        );
    }
}
