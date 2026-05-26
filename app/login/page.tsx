import { signIn, auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import SubmitButton from '@/components/SubmitButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;
  if (session?.user) redirect(callbackUrl ?? '/dashboard');

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/ninja.jpg"
            alt=""
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">JMHZ Ninja</h1>
            <p className="text-sm text-slate-500">Správa odměn výboru SVJ.</p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Přihlášení odmítnuto. Tento účet není oprávněn.
          </p>
        )}

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: callbackUrl ?? '/dashboard' });
          }}
          className="mt-6"
        >
          <SubmitButton
            className="w-full"
            pendingLabel="Přesměrovávám na Google…"
          >
            Přihlásit se přes Google
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
