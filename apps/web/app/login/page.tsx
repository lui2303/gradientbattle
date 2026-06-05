'use client';
  import { signIn } from 'next-auth/react';
  import { useSearchParams } from 'next/navigation';

  export default function LoginPage() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') ?? '/';

    return (
      <button onClick={() => signIn('github', { callbackUrl: callbackUrl })}>
        Continue with GitHub
      </button>
    );
  }
