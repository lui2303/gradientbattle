'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { NavLinks } from "./NavLinks"
import { SignOutButton } from "./SignOutButton"
import { SignInButton } from "./SignInButton"
import { Logo } from "./Logo"
import { GitHubMark } from "./GitHubMark"

/**
 * The header renders signed out too, since free play is public — otherwise an
 * anonymous visitor would have no route to signing in. It stays hidden on /login,
 * where the card already carries the brand.
 */
export function HeaderBar({ userName }: { userName: string | null }) {
    const pathname = usePathname()
    if (pathname === "/login") return null

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-12 w-full max-w-[1400px] items-center gap-4 px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="size-6 text-foreground" />
                    <span className="font-mono text-sm font-medium tracking-tight text-foreground">
                        gradient<span className="text-muted-foreground">battle</span>
                    </span>
                </Link>

                <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-center" />

                <NavLinks />

                <div className="ml-auto flex items-center gap-2">
                    {userName ? (
                        <>
                            {/* Sign-in is GitHub-only, so the mark labels whose account this is. */}
                            <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground sm:inline-flex">
                                <GitHubMark className="size-3.5" />
                                {userName}
                            </span>
                            <SignOutButton />
                        </>
                    ) : (
                        <SignInButton />
                    )}
                </div>
            </div>
        </header>
    )
}
