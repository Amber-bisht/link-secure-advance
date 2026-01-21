import mongoose, { Schema, Document } from 'mongoose';

export interface IChallenge extends Document {
    challenge_id: string;
    nonce: string;
    difficulty: number;
    signature: string;
    expiresAt: number;
    ip: string;
    uaHash?: string;
    createdAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>({
    challenge_id: { type: String, required: true, unique: true },
    nonce: { type: String, required: true },
    difficulty: { type: Number, required: true },
    signature: { type: String, required: true },
    expiresAt: { type: Number, required: true },
    ip: { type: String, required: true },
    uaHash: { type: String },
    createdAt: { type: Date, default: Date.now, expires: 300 } // TTL: 5 minutes (300s)
});

export default mongoose.models.Challenge || mongoose.model<IChallenge>('Challenge', ChallengeSchema);
