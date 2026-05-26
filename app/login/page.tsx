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
      <div className="relative w-full max-w-sm">
        <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-br from-indigo-300/30 via-purple-300/20 to-teal-300/30 blur-2xl" />
        <div className="relative animate-[rise_380ms_cubic-bezier(0.21,1.02,0.73,1)_both] rounded-2xl border border-slate-200/70 bg-white/90 p-8 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400/40 to-teal-400/40 blur" />
              <Image
                src="/ninja.jpg"
                alt=""
                width={56}
                height={56}
                priority
                className="relative h-14 w-14 rounded-xl object-contain ring-1 ring-slate-200"
              />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 via-indigo-700 to-teal-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                JMHZ Ninja
              </h1>
              <p className="text-sm text-slate-500">Správa odměn výboru SVJ.</p>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
            <SubmitButton className="w-full" pendingLabel="Přesměrovávám na Google…">
              Přihlásit se přes Google
            </SubmitButton>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            Po přihlášení dostane účet roli z DB. Nepovolené e-maily budou odmítnuty.
          </p>
        </div>
      </div>
    </main>
  );
}
