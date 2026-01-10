import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    token: string;
    targetUrl: string;
    ipAddress: string;
    createdAt: Date;
    used: boolean;
}

const SessionSchema: Schema = new Schema({
    token: { type: String, required: true, unique: true, index: true },
    targetUrl: { type: String, required: true },
    ipAddress: { type: String, required: true },
    used: { type: Boolean, default: false },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 360 // TTL: 6 minutes (360 seconds)
    },
});

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
