import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// Edge-safe config: providers, pages, session strategy + callbacks.
// NO Prisma adapter here. Imported by both auth.ts (Node) and proxy.ts (Edge).
export const authConfig = {
    // GitHub's authorize endpoint only honours `prompt=select_account` — any other
    // value (e.g. the OIDC-standard "login") is ignored, so an already-authorized
    // user is silently re-authenticated from their github.com session and lands
    // back in the app under the same account right after signing out.
    // `select_account` forces the account picker so a different account can be used.
    providers: [GitHub({ authorization: { params: { prompt: "select_account" } } })],
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
