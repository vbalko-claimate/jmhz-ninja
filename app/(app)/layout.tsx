import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';

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
            <Link href="/dashboard" className="font-semibold tracking-tight">
              JMHZ Ninja
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
              <button className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100">
                Odhlásit
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
