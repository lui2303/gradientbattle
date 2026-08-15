'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { GitHubMark } from "./GitHubMark"

const LINKS = [
    { href: "/", label: "Play" },
    { href: "/battle", label: "Battle" },
    // The ladder ranks GitHub accounts, so it carries the GitHub mark.
    { href: "/leaderboards/battle", label: "Leaderboard", icon: true },
]

export function NavLinks() {
    const pathname = usePathname()

    return (
        <nav className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon }) => {
                // "/" would otherwise prefix-match every route.
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors",
                            active
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                    >
                        {icon && <GitHubMark className="size-3.5" />}
                        {label}
                    </Link>
                )
            })}
        </nav>
    )
}
