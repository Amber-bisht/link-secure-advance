import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
    trustHost: true,
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        Google,
    ],
    session: {
        strategy: "jwt"
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // @ts-ignore
                token.linkShortifyKey = user.linkShortifyKey;
                token.id = user.id;
                // @ts-ignore
                token.validUntil = user.validUntil;
                // @ts-ignore
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            // Attach custom fields from the JWT token to the session
            if (session.user && token) {
                // @ts-ignore
                session.user.linkShortifyKey = token.linkShortifyKey as string;
                session.user.id = token.id as string;
                // @ts-ignore
                session.user.validUntil = token.validUntil as Date;
                // @ts-ignore
                session.user.role = token.role as string;
            }
            return session;
        }
    },
    events: {
        async createUser({ user }) {
            try {
                // Set default validity to 2 days from now
                const validUntil = new Date();
                validUntil.setDate(validUntil.getDate() + 2); // 2 Days trial

                const client = await clientPromise;
                const users = client.db().collection("users");

                // @ts-ignore
                await users.updateOne({ _id: new ObjectId(user.id) }, {
                    $set: {
                        validUntil: validUntil,
                        role: 'user'
                    }
                });
                console.log(`Initialized user ${user.id} with validity until ${validUntil}`);
            } catch (e) {
                console.error("Failed to init user validity", e);
            }
        }
    }
})
