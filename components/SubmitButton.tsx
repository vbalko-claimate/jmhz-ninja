'use client';

import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'success';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-600 hover:shadow-md hover:shadow-indigo-500/30 active:scale-[0.98] disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none',
  secondary:
    'border border-slate-300 bg-white/80 backdrop-blur hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] disabled:bg-slate-50 disabled:text-slate-400',
  danger:
    'border border-rose-300 bg-white/80 backdrop-blur text-rose-700 hover:bg-rose-50 hover:border-rose-400 active:scale-[0.98] disabled:opacity-50',
  success:
    'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 hover:shadow-md hover:shadow-emerald-500/30 active:scale-[0.98] disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none',
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
        'inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 ease-out disabled:cursor-not-allowed',
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
