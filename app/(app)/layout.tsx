import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import SubmitButton from '@/components/SubmitButton';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role;
  const isAdmin = role === 'admin';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
              <Image
                src="/ninja.jpg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-md object-contain"
                priority
              />
              <span>JMHZ Ninja</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/exports" className="hover:text-slate-900">
                Exporty
              </Link>
              {isAdmin && (
                <Link href="/settings/employees" className="hover:text-slate-900">
                  Nastavení
                </Link>
              )}
              <Link href="/help" className="hover:text-slate-900">
                Nápověda
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{session.user.email}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium uppercase">
              {role}
            </span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                Odhlásit
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
