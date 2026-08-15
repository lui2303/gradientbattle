'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const LINKS = [
    { href: "/", label: "Play" },
    { href: "/battle", label: "Battle" },
    { href: "/leaderboards/battle", label: "Ladder" },
]

export function NavLinks() {
    const pathname = usePathname()

    return (
        <nav className="flex items-center gap-1">
            {LINKS.map(({ href, label }) => {
                // "/" would otherwise prefix-match every route.
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                            "rounded-md px-2.5 py-1 text-sm transition-colors",
                            active
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                    >
                        {label}
                    </Link>
                )
            })}
        </nav>
    )
}
