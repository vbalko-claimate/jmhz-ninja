'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '@/components/Spinner';

/**
 * Opravné podání: uživatel vybere původní řádné XML, my z něj vyrobíme opravné
 * ZIP (recyklované GUIDy) a rovnou ho stáhneme.
 */
export default function CorrectiveUploadButton({ year, month }: { year: number; month: number }) {
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mm = String(month).padStart(2, '0');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // umožní znovu vybrat týž soubor
    if (!file) return;

    setPending(true);
    try {
      const body = new FormData();
      body.set('original', file);
      const res = await fetch(`/api/exports/opravne/${year}/${mm}`, { method: 'POST', body });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.missing) {
          toast.warning(`Některým zaměstnancům chybí povinná pole pro JMHZ (${data.missing.length}).`);
        } else {
          toast.error(`Opravné se nepodařilo vytvořit: ${data?.detail ?? data?.error ?? `HTTP ${res.status}`}`);
        }
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JMHZ-${year}-${mm}-opravne.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Opravné podání pro ${month}/${year} vytvořeno.`);
    } catch (err) {
      toast.error(`Opravné selhalo: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xml,application/xml,text/xml"
        onChange={onFile}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        title="Nahrát původní řádné XML a vygenerovat opravné podání"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
      >
        {pending && <Spinner className="h-3 w-3" />}
        {pending ? 'Vytvářím…' : 'Opravné z XML'}
      </button>
    </>
  );
}
