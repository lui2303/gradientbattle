import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Routes that work signed out. Everything else stays deny-by-default via the matcher
 * below, so a new route is protected unless it is added here deliberately.
 *
 * Free play is public, which means the endpoint it posts runs to has to be public as
 * well — it only records an anonymous Run row and carries no user identity.
 */
const PUBLIC_PATHS = new Set(["/", "/api/run_optimizers"]);

export default auth((req) => {
    if (PUBLIC_PATHS.has(req.nextUrl.pathname)) return;

    if (!req.auth) {
        const loginUrl = new URL("/login", req.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
        return Response.redirect(loginUrl);
    }
});

export const config = {
    matcher: [
        // `icon.svg` is the app-router favicon; without an exemption the browser's
        // tab-icon request is redirected to /login and no icon ever loads.
        "/((?!api/auth|api/battle/[^/]+/evaluate|login|_next/static|_next/image|favicon.ico|icon.svg).*)",
    ],
};
