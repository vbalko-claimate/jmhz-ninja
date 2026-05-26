import Decimal from 'decimal.js';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = string | number | Decimal;

export const D = (v: MoneyInput): Decimal => new Decimal(v);

export const toDb = (v: Decimal): string => v.toFixed(2);

export const fromDb = (v: string | null | undefined): Decimal => (v == null ? D(0) : D(v));

export const formatCZK = (v: Decimal | string | number): string => {
  const d = v instanceof Decimal ? v : D(v);
  return d.toFixed(2).replace('.', ',') + ' Kč';
};
