import { auth } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';

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
      desc: 'Limit pojistného, sazba daně, sleva — verzované.',
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
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Image
          src="/ninja.jpg"
          alt="JMHZ Ninja"
          width={140}
          height={140}
          priority
          className="h-32 w-32 shrink-0 object-contain"
        />
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight">
            Vítej, {session?.user?.name?.split(' ')[0] ?? 'admine'}.
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Měsíční odměny členů výboru SVJ a JMHZ pro ČSSZ — bez papírů.
          </p>
        </div>
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
    </div>
  );
}
