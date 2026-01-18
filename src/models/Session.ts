import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    token: string;
    targetUrl: string;
    ipAddress: string;
    status: 'pending' | 'active';
    linkId?: mongoose.Types.ObjectId;
    createdAt: Date;
    used: boolean;
    usageCount: number;
    maxUses: number;
    userId?: string;
}

const SessionSchema: Schema = new Schema({
    token: { type: String, required: true, unique: true, index: true },
    targetUrl: { type: String, required: true },
    ipAddress: { type: String, required: true },
    status: { type: String, enum: ['pending', 'active'], default: 'pending' },
    linkId: { type: Schema.Types.ObjectId, ref: 'Link' }, // Reference to parent persistent link
    used: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    maxUses: { type: Number, default: 3 },
    userId: { type: String },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 360 // TTL logic remains 6 mins
    },
});

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
