'use client'

import { signOut } from "next-auth/react"
import { LogOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
    return (
        <Button variant="ghost" size="icon-sm" aria-label="Sign out" onClick={() => signOut()}>
            <LogOutIcon />
        </Button>
    )
}
