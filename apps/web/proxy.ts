import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);


const PUBLIC_PATHS = new Set(["/", "/api/run_optimizers", "/leaderboards/battle"]);

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
