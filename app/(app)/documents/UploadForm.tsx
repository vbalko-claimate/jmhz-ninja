'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Spinner } from '@/components/Spinner';

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'podklady', label: 'Podklady od účetní' },
  { value: 'oic', label: 'OIČ (ČSSZ identifikátory)' },
  { value: 'vs', label: 'VS / usnesení ČSSZ' },
  { value: 'mzdove-listy', label: 'Mzdové listy' },
  { value: 'jmhz-podani', label: 'JMHZ podání (XML)' },
  { value: 'protokol', label: 'Protokol z e-Podání' },
  { value: 'smlouva', label: 'Smlouva' },
  { value: 'jine', label: 'Jiné' },
];

export default function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) {
      toast.warning('Vyberte soubor.');
      return;
    }

    setPending(true);
    const promise = (async () => {
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail ?? data?.error ?? `HTTP ${res.status}`);
      return data;
    })();

    toast.promise(promise, {
      loading: `Nahrávám ${file.name}…`,
      success: (d) => `Nahráno: ${(d as { filename: string }).filename}`,
      error: (err) => `Nahrání selhalo: ${err instanceof Error ? err.message : String(err)}`,
    });

    try {
      await promise;
      formRef.current?.reset();
      router.refresh();
    } catch {
      // toast handled
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-xs font-medium text-slate-600">Soubor (PDF, obrázek, XLSX, DOCX, XML… max 25 MB)</span>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc,.xml,.txt,.csv"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-slate-600">Kategorie</span>
        <select
          name="category"
          defaultValue="podklady"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-slate-600">Popis (volitelné)</span>
        <input
          name="description"
          placeholder="např. podklady od předchozí účetní"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-all duration-150 ease-out hover:from-indigo-500 hover:to-indigo-600 hover:shadow-md active:scale-[0.98] disabled:from-slate-400 disabled:to-slate-400"
        >
          {pending && <Spinner className="h-3 w-3" />}
          {pending ? 'Nahrávám…' : 'Nahrát dokument'}
        </button>
      </div>
    </form>
  );
}
