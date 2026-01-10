import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// GET: List all users (Admin Only)
export async function GET() {
    try {
        const session = await auth();
        // @ts-ignore
        if (session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const users = await User.find({}).sort({ createdAt: -1 });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Admin List Users Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH: Update user validity or role (Admin Only)
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        // @ts-ignore
        if (session?.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, validUntil, role } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        await dbConnect();

        const updateData: any = {};
        if (validUntil) updateData.validUntil = new Date(validUntil);
        if (role) updateData.role = role;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error('Admin Update User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
