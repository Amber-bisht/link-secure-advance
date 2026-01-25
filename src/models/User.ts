import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name?: string;
    email?: string;
    image?: string;
    role: 'user' | 'admin';
    validUntil: Date;
    howmanycreatedlinks: number;
    linkShortifyKey?: string;
    aroLinksKey?: string;
    vpLinkKey?: string;
    inShortUrlKey?: string;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    name: String,
    email: { type: String, unique: true },
    image: String,
    emailVerified: Date,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    validUntil: { type: Date }, // Will be set on creation via Auth events
    howmanycreatedlinks: { type: Number, default: 0 },
    linkShortifyKey: String,
    aroLinksKey: String,
    vpLinkKey: String,
    inShortUrlKey: String,
}, {
    timestamps: true,
    collection: 'users' // Explicitly map to NextAuth's default collection
});

// Prevent overwrite on hot reload
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
