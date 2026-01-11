import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Link from '@/models/Link';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        const link = await Link.findOne({ slug });

        if (!link) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            // targetUrl and ownerApiKey removed for security
        });

    } catch (error) {
        console.error('Get Link Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
