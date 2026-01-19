import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(req: Request) {
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

        // Fallback: If validUntil is missing (buggy previous registrations), initialize it now
        if (!user.validUntil) {
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 2);
            user.validUntil = validUntil;
            await user.save();
        }

        return NextResponse.json({
            validUntil: user.validUntil,
            role: user.role,
            hasKey: !!user.linkShortifyKey,
            keys: {
                linkShortify: user.linkShortifyKey,
                aroLinks: user.aroLinksKey,
                vpLink: user.vpLinkKey,
                inShortUrl: user.inShortUrlKey
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
