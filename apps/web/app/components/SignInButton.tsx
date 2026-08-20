'use client'

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { GitHubMark } from "./GitHubMark"

export function SignInButton() {
    return (
        <Button variant="outline" size="lg" onClick={() => signIn("github")}>
            <GitHubMark className="size-4" />
            Sign in
        </Button>
    )
}
