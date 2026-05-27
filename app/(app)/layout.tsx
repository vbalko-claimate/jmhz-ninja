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
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 font-semibold tracking-tight"
            >
              <Image
                src="/ninja.jpg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-md object-contain ring-1 ring-slate-200 transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3"
                priority
              />
              <span className="bg-gradient-to-r from-indigo-700 to-teal-600 bg-clip-text text-transparent">
                JMHZ Ninja
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm text-slate-600">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/exports">Exporty</NavLink>
              <NavLink href="/documents">Dokumenty</NavLink>
              {isAdmin && <NavLink href="/settings/employees">Nastavení</NavLink>}
              <NavLink href="/help">Nápověda</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden sm:inline">{session.user.email}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium uppercase text-indigo-700">
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
      <main className="animate-[fade-in_320ms_ease-out_both] mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
