import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// Edge-safe config: providers, pages, session strategy + callbacks.
// NO Prisma adapter here. Imported by both auth.ts (Node) and proxy.ts (Edge).
export const authConfig = {
    // `prompt: "login"` forces GitHub to show the login/consent screen on every
    // sign-in instead of silently re-authenticating an already-authorized user.
    // Useful for testing the auth flow; remove for production if you want the
    // seamless re-login UX.
    providers: [GitHub({ authorization: { params: { prompt: "login" } } })],
    pages: {
        signIn: "/login",
    },
    // JWT sessions are self-contained (signed with AUTH_SECRET), so the Edge
    // proxy can verify them without a database lookup.
    session: {
        strategy: "jwt",
    },
    callbacks: {
        // Runs whenever a JWT is created/updated. At sign-in `user` is present,
        // so we copy the DB user id into the token to persist it.
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        // Shapes the session object exposed to auth()/useSession.
        // Surface the id from the token so we can do ownership checks.
        session({ session, token }) {
            if (token.id && session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
} satisfies NextAuthConfig;
