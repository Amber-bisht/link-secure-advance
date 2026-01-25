import mongoose, { Schema, Document } from 'mongoose';

export interface IV41Link extends Document {
    slug: string;
    originalUrl: string;
    linkShortifyUrl?: string;
    aroLinksUrl?: string;
    vpLinkUrl?: string;
    inShortUrlUrl?: string;
    urls: string[];
    ownerId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const V41LinkSchema: Schema = new Schema({
    slug: { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true },
    linkShortifyUrl: String,
    aroLinksUrl: String,
    vpLinkUrl: String,
    inShortUrlUrl: String,
    urls: { type: [String], default: [] }, // Legacy/Fallback
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.V41Link || mongoose.model<IV41Link>('V41Link', V41LinkSchema);
