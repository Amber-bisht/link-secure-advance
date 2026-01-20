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

        // Generate challenge with rate limiting
        const challenge = generateChallenge(ip);

        if (!challenge) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Maximum 10 challenges per minute.' },
                { status: 429 }
            );
        }

        // Return challenge data to client
        // Note: rotating_secret is intentionally sent to client for proof computation
        return NextResponse.json({
            challenge_id: challenge.challenge_id,
            nonce: challenge.nonce,
            rotating_secret: challenge.rotating_secret,
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
