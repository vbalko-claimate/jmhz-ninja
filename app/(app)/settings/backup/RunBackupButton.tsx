'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Spinner } from '@/components/Spinner';

export default function RunBackupButton({ disabled }: { disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function run() {
    setPending(true);
    const promise = (async () => {
      const res = await fetch('/api/backup/run', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      return data;
    })();

    toast.promise(promise, {
      loading: 'Spouštím zálohu… (snapshot DB → upload do Drive)',
      success: (data) => {
        const uploaded = (data as { uploaded?: string[] }).uploaded ?? [];
        return `Záloha hotová: ${uploaded.length} soubor(y) v Drive (${uploaded[0] ?? ''})`;
      },
      error: (e) => `Záloha selhala: ${e instanceof Error ? e.message : String(e)}`,
    });

    try {
      await promise;
      router.refresh();
    } catch {
      // toast handled it
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending || disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:bg-slate-300"
    >
      {pending && <Spinner className="h-3 w-3" />}
      {pending ? 'Zálohuji…' : 'Spustit zálohu nyní'}
    </button>
  );
}
