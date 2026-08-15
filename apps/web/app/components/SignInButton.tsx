'use client'

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { GitHubMark } from "./GitHubMark"

export function SignInButton() {
    return (
        <Button variant="outline" size="sm" onClick={() => signIn("github")}>
            <GitHubMark className="size-3.5" />
            Sign in
        </Button>
    )
}
