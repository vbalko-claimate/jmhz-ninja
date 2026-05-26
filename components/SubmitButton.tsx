'use client';

import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'success';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400',
  secondary: 'border border-slate-300 hover:bg-slate-100 disabled:bg-slate-50 disabled:text-slate-400',
  danger: 'border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50',
  success: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-slate-300',
};

/**
 * Submit button with automatic loading indicator while the surrounding
 * server action / form action is pending. Uses React 19's useFormStatus,
 * so it MUST live inside a <form>.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: Variant;
  size?: 'sm' | 'md';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const sizeCls = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm font-medium';
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition disabled:cursor-not-allowed',
        sizeCls,
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {pending && <Spinner className="h-3 w-3" />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
