import { NextRequest, NextResponse } from 'next/server';
import { encodeLinkV4 } from '@/utils/linkWrapper';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const now = new Date();
        if (!user.validUntil || new Date(user.validUntil) < now) {
            return NextResponse.json({
                error: 'Subscription Expired. Please contact admin to renew.',
                code: 'EXPIRED'
            }, { status: 403 });
        }

        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        // Generate encoded slug (reusing v4 encoder for consistency in storage/decoding)
        const slug = encodeLinkV4(targetUrl);

        if (!slug) {
            return NextResponse.json({ error: 'Failed to encode URL' }, { status: 500 });
        }

        const origin = request.headers.get('origin') || '';
        // V5 links point to the /v5/ prefix
        const generatedLink = `${origin}/v5/${slug}`;

        user.howmanycreatedlinks = (user.howmanycreatedlinks || 0) + 1;
        await user.save();

        return NextResponse.json({
            success: true,
            link: generatedLink,
            slug: slug,
        });

    } catch (error) {
        console.error('V5 Generation API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
