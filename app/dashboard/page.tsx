import { auth, signOut } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role ?? 'viewer';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const cards: Array<{ href: string; title: string; desc: string; roles: string[] }> = [
    {
      href: `/payroll/${year}/${String(month).padStart(2, '0')}`,
      title: `Měsíční payroll ${month}/${year}`,
      desc: 'Vytvořit nebo upravit odměny aktuálního měsíce.',
      roles: ['admin', 'user', 'viewer'],
    },
    {
      href: '/exports',
      title: 'Exporty a reporty',
      desc: 'CSV, TXT, PDF výplatnice, XML JMHZ pro ČSSZ.',
      roles: ['admin', 'user', 'viewer'],
    },
    {
      href: '/settings/employees',
      title: 'Zaměstnanci',
      desc: 'Spravovat členy výboru, RČ, OIC, ID PPV, bankovní účet.',
      roles: ['admin'],
    },
    {
      href: '/settings/legal',
      title: 'Zákonné parametry',
      desc: 'Limit pojistného, sazba daně, sleva na poplatníka — verzované.',
      roles: ['admin'],
    },
    {
      href: '/settings/app',
      title: 'Nastavení SVJ',
      desc: 'IČO, adresa, účet finančního úřadu, VS ČSSZ.',
      roles: ['admin'],
    },
    {
      href: '/settings/users',
      title: 'Uživatelé',
      desc: 'Pozvat admina / usera / viewera. Login JIT přes Google.',
      roles: ['admin'],
    },
    {
      href: '/settings/backup',
      title: 'Zálohy',
      desc: 'Google Drive backup, šifrování, manuální spuštění.',
      roles: ['admin'],
    },
  ];

  const visible = cards.filter((c) => c.roles.includes(role));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">JMHZ Ninja</h1>
          <p className="text-sm text-slate-500">
            Přihlášen: {session?.user?.email}{' '}
            <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium uppercase">
              {role}
            </span>
          </p>
        </div>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
            Odhlásit
          </button>
        </form>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {visible.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="font-medium">{c.title}</div>
            <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
