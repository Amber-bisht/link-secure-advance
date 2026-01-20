import mongoose, { Schema, Document } from 'mongoose';

export interface ISuspiciousIP extends Document {
    ipAddress: string;
    reason: string;
    createdAt: Date;
}

const SuspiciousIPSchema: Schema = new Schema({
    ipAddress: { type: String, required: true },
    reason: { type: String, default: 'Captcha verification failed' },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // 24 hours expiry
    },
});

export default mongoose.models.SuspiciousIP || mongoose.model<ISuspiciousIP>('SuspiciousIP', SuspiciousIPSchema);
