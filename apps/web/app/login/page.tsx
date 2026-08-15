'use client';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '../components/Logo';
import { GitHubMark } from '../components/GitHubMark';


export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono tracking-tight">
            <Logo className="size-7 text-foreground" />
            gradient<span className="-ml-2 text-muted-foreground">battle</span>
          </CardTitle>
          <CardDescription>
            Tune gradient descent optimizers and race them to the minimum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full"
            onClick={() => signIn('github', { callbackUrl: callbackUrl })}
          >
            <GitHubMark />
            Continue with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
