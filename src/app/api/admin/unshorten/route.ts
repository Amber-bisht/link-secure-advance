
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
    decodeLink,
    decodeLinkV1,
    decodeLinkV2,
    decodeLinkV3,
    decodeLinkV4,
    decodeLinkV41
} from '@/utils/linkWrapper';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            // If just a slug or partial URL is provided, try to handle it. 
            // But usually we expect a full URL. If it's just a slug, we might need more info.
            // For now, assume full URL is passed or ensure it has protocol.
            // If the user inputs just "v4/slug", we can prepend.
            // But let's assume the admin pastes the full link.
            if (!targetUrl.startsWith('http')) {
                targetUrl = 'https://' + targetUrl; // default protocol
            }
        }

        // Parse the URL to get the pathname
        let pathname = '';
        try {
            const parsedUrl = new URL(targetUrl);
            pathname = parsedUrl.pathname;
        } catch (e) {
            // Fallback if URL parsing fails (maybe just a path was given)
            pathname = targetUrl;
        }

        // Clean up pathname
        if (pathname.startsWith('/')) {
            pathname = pathname.substring(1);
        }

        let originalUrl = '';
        let version = '';

        if (pathname.startsWith('v4.1/')) {
            version = 'v4.1';
            const slug = pathname.replace('v4.1/', '');
            originalUrl = decodeLinkV41(slug);
        } else if (pathname.startsWith('v4/')) {
            version = 'v4';
            const slug = pathname.replace('v4/', '');
            originalUrl = decodeLinkV4(slug);
        } else if (pathname.startsWith('v3/')) {
            version = 'v3';
            const slug = pathname.replace('v3/', '');
            originalUrl = decodeLinkV3(slug);
        } else if (pathname.startsWith('v2/')) {
            version = 'v2';
            const slug = pathname.replace('v2/', '');
            originalUrl = decodeLinkV2(slug);
        } else if (pathname.startsWith('v1/')) {
            version = 'v1';
            const slug = pathname.replace('v1/', '');
            originalUrl = decodeLinkV1(slug);
        } else {
            // Default v0 / base version
            version = 'v0 (Original)';
            // In v0, the slug is the pathname itself (after removing domain)
            // But we need to be careful about other paths.
            // Assuming the entire pathname is the slug for v0 if no version prefix.
            originalUrl = decodeLink(pathname);
        }

        if (!originalUrl) {
            return NextResponse.json({ error: 'Failed to decode link. Invalid slug or format.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            originalUrl,
            version
        });

    } catch (error) {
        console.error('Unshorten API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
