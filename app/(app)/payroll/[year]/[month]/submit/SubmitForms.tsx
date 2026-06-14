'use client';

import { useActionState } from 'react';
import SubmitButton from '@/components/SubmitButton';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export type SubmitState = { error: string } | null;
type Action = (prevState: SubmitState, formData: FormData) => Promise<SubmitState>;

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
      {message}
    </div>
  );
}

export function ConfirmSubmitForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-slate-600">
          Reference / číslo potvrzení z e-Podání ČSSZ
        </span>
        <input
          name="reference"
          required
          placeholder="např. 2026-04-15/0001234"
          className="rounded-md border border-slate-300 px-3 py-1.5 font-mono text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>
      {state?.error && <ErrorBox message={state.error} />}
      <SubmitButton variant="success" pendingLabel="Archivuji do Drive a zamykám…">
        Potvrdit odeslání a zamknout
      </SubmitButton>
    </form>
  );
}

export function ReopenForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input
          name="reason"
          required
          placeholder="Důvod (audit log)"
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <ConfirmSubmitButton
          confirm="Skutečně odemknout zamčený měsíc? Bude vyžadováno nové generování XML a opětovné odeslání."
          pendingLabel="Odemykám…"
        >
          Odemknout
        </ConfirmSubmitButton>
      </div>
      {state?.error && <ErrorBox message={state.error} />}
    </form>
  );
}
