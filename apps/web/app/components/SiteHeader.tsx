import { auth } from "@/auth"
import { HeaderBar } from "./HeaderBar"

// Server half: reads the session. HeaderBar owns the markup and the route check,
// which needs the pathname and therefore the client.
export async function SiteHeader() {
    const session = await auth()
    return <HeaderBar userName={session?.user?.name ?? null} />
}
