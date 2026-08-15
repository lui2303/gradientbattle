import Link from "next/link"
import { auth } from "@/auth"
import { Separator } from "@/components/ui/separator"
import { NavLinks } from "./NavLinks"
import { SignOutButton } from "./SignOutButton"

export async function SiteHeader() {
    const session = await auth()

    // /login is the only unauthenticated route; leave it bare.
    if (!session?.user) return null

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-12 w-full max-w-[1400px] items-center gap-4 px-4 md:px-6">
                <Link
                    href="/"
                    className="font-mono text-sm font-medium tracking-widest text-foreground uppercase"
                >
                    Gradient<span className="text-muted-foreground">Battle</span>
                </Link>

                <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-center" />

                <NavLinks />

                <div className="ml-auto flex items-center gap-2">
                    <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                        {session.user.name}
                    </span>
                    <SignOutButton />
                </div>
            </div>
        </header>
    )
}
