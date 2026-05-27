import { auth } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';
import PeriodPicker from '@/components/PeriodPicker';

type Card = {
  href: string;
  title: string;
  desc: string;
  roles: string[];
  accent: 'indigo' | 'teal' | 'amber' | 'rose' | 'sky' | 'violet' | 'emerald';
  emoji: string;
};

const ACCENTS: Record<Card['accent'], string> = {
  indigo: 'from-indigo-500/10 to-indigo-500/0 ring-indigo-500/20 group-hover:ring-indigo-500/40 group-hover:shadow-indigo-500/10',
  teal: 'from-teal-500/10 to-teal-500/0 ring-teal-500/20 group-hover:ring-teal-500/40 group-hover:shadow-teal-500/10',
  amber: 'from-amber-500/10 to-amber-500/0 ring-amber-500/20 group-hover:ring-amber-500/40 group-hover:shadow-amber-500/10',
  rose: 'from-rose-500/10 to-rose-500/0 ring-rose-500/20 group-hover:ring-rose-500/40 group-hover:shadow-rose-500/10',
  sky: 'from-sky-500/10 to-sky-500/0 ring-sky-500/20 group-hover:ring-sky-500/40 group-hover:shadow-sky-500/10',
  violet: 'from-violet-500/10 to-violet-500/0 ring-violet-500/20 group-hover:ring-violet-500/40 group-hover:shadow-violet-500/10',
  emerald: 'from-emerald-500/10 to-emerald-500/0 ring-emerald-500/20 group-hover:ring-emerald-500/40 group-hover:shadow-emerald-500/10',
};

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role ?? 'viewer';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const cards: Card[] = [
    {
      href: `/payroll/${year}/${String(month).padStart(2, '0')}`,
      title: `Měsíční payroll ${month}/${year}`,
      desc: 'Vytvořit nebo upravit odměny aktuálního měsíce.',
      roles: ['admin', 'user', 'viewer'],
      accent: 'indigo',
      emoji: '🧮',
    },
    {
      href: '/exports',
      title: 'Exporty a reporty',
      desc: 'CSV, TXT, PDF výplatnice, XML JMHZ pro ČSSZ.',
      roles: ['admin', 'user', 'viewer'],
      accent: 'teal',
      emoji: '📤',
    },
    {
      href: '/documents',
      title: 'Dokumenty',
      desc: 'Podklady od účetní, sdělení ČSSZ, mzdové listy, smlouvy.',
      roles: ['admin', 'user', 'viewer'],
      accent: 'sky',
      emoji: '🗂️',
    },
    {
      href: '/settings/employees',
      title: 'Zaměstnanci',
      desc: 'Spravovat členy výboru, RČ, OIC, ID PPV, bankovní účet.',
      roles: ['admin'],
      accent: 'violet',
      emoji: '👥',
    },
    {
      href: '/settings/legal',
      title: 'Zákonné parametry',
      desc: 'Limit pojistného, sazba daně, sleva — verzované.',
      roles: ['admin'],
      accent: 'amber',
      emoji: '⚖️',
    },
    {
      href: '/settings/app',
      title: 'Nastavení SVJ',
      desc: 'IČO, adresa, účet finančního úřadu, VS ČSSZ.',
      roles: ['admin'],
      accent: 'sky',
      emoji: '🏢',
    },
    {
      href: '/settings/users',
      title: 'Uživatelé',
      desc: 'Pozvat admina / usera / viewera. Login JIT přes Google.',
      roles: ['admin'],
      accent: 'rose',
      emoji: '🔐',
    },
    {
      href: '/settings/backup',
      title: 'Zálohy',
      desc: 'Google Drive backup, šifrování, manuální spuštění.',
      roles: ['admin'],
      accent: 'emerald',
      emoji: '☁️',
    },
  ];

  const visible = cards.filter((c) => c.roles.includes(role));
  const firstName = session?.user?.name?.split(' ')[0] ?? 'admine';

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-indigo-50/40 to-teal-50/40 p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-200/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-teal-200/30 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <div className="relative animate-[float_6s_ease-in-out_infinite]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400/30 to-teal-400/30 blur-xl" />
            <Image
              src="/ninja.jpg"
              alt="JMHZ Ninja"
              width={140}
              height={140}
              priority
              className="relative h-32 w-32 shrink-0 rounded-2xl object-contain shadow-md ring-1 ring-slate-200"
            />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="bg-gradient-to-r from-slate-900 via-indigo-700 to-teal-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Vítej, {firstName}.
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Měsíční odměny členů výboru SVJ a JMHZ pro ČSSZ — bez papírů.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs sm:justify-start">
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
                aktuálně {month}/{year}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600">
                role: <strong className="ml-1 text-slate-800">{role}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-600">Vybrat období:</span>
          <PeriodPicker defaultYear={year} defaultMonth={month} label="Otevřít payroll →" />
        </div>
      </header>

      <section className="stagger grid gap-4 sm:grid-cols-2">
        {visible.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100 transition-opacity duration-300 ${ACCENTS[c.accent]}`}
            />
            <div className="relative flex items-start gap-3">
              <div className="text-2xl">{c.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">{c.title}</div>
                <div className="mt-1 text-sm text-slate-500">{c.desc}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 opacity-0 transition-all duration-200 group-hover:opacity-100">
                  Otevřít
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
