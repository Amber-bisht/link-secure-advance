import NextAuth, { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            validUntil: Date;
            linkShortifyKey?: string;
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        role: string;
        validUntil: Date;
        linkShortifyKey?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        validUntil: Date;
        linkShortifyKey?: string;
    }
}
