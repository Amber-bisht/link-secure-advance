import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const validateKey = async (provider: string, apiUrlPattern: string, key: string) => {
    if (!key) return { valid: true }; // Empty key is valid (skipping)

    const testUrl = 'https://google.com';
    const apiUrl = apiUrlPattern
        .replace('${key}', key)
        .replace('${url}', encodeURIComponent(testUrl));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        const shortLink = await response.text();

        if (!response.ok || !shortLink || shortLink.includes('error') || shortLink.trim() === '') {
            return { valid: false, error: `${provider} key is invalid: ${shortLink}` };
        }
        return { valid: true };
    } catch (e) {
        return { valid: false, error: `${provider} check failed: Timeout or Network Error` };
    }
};

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { linkShortifyKey, aroLinksKey, vpLinkKey, inShortUrlKey } = body;

        // At least one key should be provided or updated?
        // Actually we allow clearing keys too if they send empty strings.

        const validations = await Promise.all([
            validateKey('LinkShortify', 'https://linkshortify.com/api?api=${key}&url=${url}&format=text', linkShortifyKey),
            validateKey('AroLinks', 'https://arolinks.com/api?api=${key}&url=${url}&alias=TestAlias&format=text', aroLinksKey),
            validateKey('VPLink', 'https://vplink.in/api?api=${key}&url=${url}&alias=TestAlias&format=text', vpLinkKey),
            validateKey('InShortUrl', 'https://inshorturl.com/api?api=${key}&url=${url}&alias=TestAlias&format=text', inShortUrlKey),
        ]);

        const errors = validations.filter(v => !v.valid).map(v => v.error);
        if (errors.length > 0) {
            return NextResponse.json({ error: errors.join('. ') }, { status: 400 });
        }

        // All provided keys are valid (or empty)
        await dbConnect();
        const updateData: any = {};
        if (linkShortifyKey !== undefined) updateData.linkShortifyKey = linkShortifyKey;
        if (aroLinksKey !== undefined) updateData.aroLinksKey = aroLinksKey;
        if (vpLinkKey !== undefined) updateData.vpLinkKey = vpLinkKey;
        if (inShortUrlKey !== undefined) updateData.inShortUrlKey = inShortUrlKey;

        const user = await User.findOneAndUpdate(
            { email: session.user.email },
            updateData,
            { new: true }
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'API Keys validated and saved successfully.'
        });

    } catch (error) {
        console.error('Update Key Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
