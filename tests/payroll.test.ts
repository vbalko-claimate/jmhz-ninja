import { describe, it, expect } from 'vitest';
import { calculatePayroll, type LegalParams } from '../lib/payroll';

const PARAMS_2026: LegalParams = {
  insuranceThreshold: '4499.00',
  taxRate: '0.15',
  taxDiscountMonthly: '2570.00',
};

describe('calculatePayroll — threshold validation', () => {
  it('accepts exactly at threshold (4499)', () => {
    const r = calculatePayroll(
      { baseReward: '4499', extraReward: '0', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects 4500 (above 4499 limit)', () => {
    const r = calculatePayroll(
      { baseReward: '4500', extraReward: '0', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('THRESHOLD_EXCEEDED');
  });

  it('rejects when base + extra crosses limit', () => {
    const r = calculatePayroll(
      { baseReward: '4000', extraReward: '500', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(false);
  });
});

describe('calculatePayroll — withholding tax (no declaration)', () => {
  it('rounds 4000 * 15% = 600 (exact)', () => {
    const r = calculatePayroll(
      { baseReward: '4000', extraReward: '0', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.taxAmount.toString()).toBe('600');
      expect(r.netAmount.toString()).toBe('3400');
    }
  });

  it('ceils 3333 * 15% = 499.95 → 500', () => {
    const r = calculatePayroll(
      { baseReward: '3333', extraReward: '0', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.taxAmount.toString()).toBe('500');
  });

  it('ceils 3334 * 15% = 500.10 → 501', () => {
    const r = calculatePayroll(
      { baseReward: '3334', extraReward: '0', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.taxAmount.toString()).toBe('501');
  });
});

describe('calculatePayroll — signed tax declaration', () => {
  it('zeros tax when computed < discount', () => {
    const r = calculatePayroll(
      { baseReward: '4000', extraReward: '0', isTaxDeclarationSigned: true },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.taxAmount.toString()).toBe('0');
      expect(r.netAmount.toString()).toBe('4000');
    }
  });

  it('clamps at 0 when discount > computed tax', () => {
    const r = calculatePayroll(
      { baseReward: '100', extraReward: '0', isTaxDeclarationSigned: true },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.taxAmount.toString()).toBe('0');
  });
});

describe('calculatePayroll — extra reward (bonus)', () => {
  it('combines base + extra in totalGross', () => {
    const r = calculatePayroll(
      { baseReward: '3000', extraReward: '1000', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.totalGross.toString()).toBe('4000');
      expect(r.taxAmount.toString()).toBe('600');
      expect(r.netAmount.toString()).toBe('3400');
    }
  });
});

describe('calculatePayroll — decimal inputs', () => {
  it('handles halíře in input but rounds tax to whole CZK up', () => {
    const r = calculatePayroll(
      { baseReward: '3333.33', extraReward: '0', isTaxDeclarationSigned: false },
      PARAMS_2026,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 3333.33 * 0.15 = 499.9995 → ceil → 500
      expect(r.taxAmount.toString()).toBe('500');
      expect(r.netAmount.toString()).toBe('2833.33');
    }
  });
});
