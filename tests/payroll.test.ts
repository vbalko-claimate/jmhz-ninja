import { describe, it, expect } from 'vitest';
import { calculatePayroll, grossFromNet, type LegalParams } from '../lib/payroll';

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

describe('grossFromNet — reverse calculation (no declaration)', () => {
  it('grosses up 3400 net → 4000 gross (exact inverse of forward case)', () => {
    const r = grossFromNet({ netReward: '3400', isTaxDeclarationSigned: false }, PARAMS_2026);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.totalGross.toString()).toBe('4000');
      expect(r.taxAmount.toString()).toBe('600');
      expect(r.netAmount.toString()).toBe('3400');
    }
  });

  it('picks the smallest gross when a net is reachable from two grosses', () => {
    // gross 1000 → tax ceil(150)=150 → net 850; gross 1001 → tax 151 → net 850.
    const r = grossFromNet({ netReward: '850', isTaxDeclarationSigned: false }, PARAMS_2026);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.totalGross.toString()).toBe('1000');
      expect(r.netAmount.toString()).toBe('850');
    }
  });

  it('handles halíře in the net target', () => {
    const r = grossFromNet({ netReward: '850.50', isTaxDeclarationSigned: false }, PARAMS_2026);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.netAmount.toString()).toBe('850.5');
      // gross 1001.50 → tax ceil(150.225)=151 → net 850.50
      expect(r.totalGross.toFixed(2)).toBe('1001.50');
      expect(r.taxAmount.toString()).toBe('151');
    }
  });

  it('blocks when grossing-up would exceed the insurance threshold', () => {
    const r = grossFromNet({ netReward: '4400', isTaxDeclarationSigned: false }, PARAMS_2026);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('THRESHOLD_EXCEEDED');
  });

  it('net 0 → gross 0', () => {
    const r = grossFromNet({ netReward: '0', isTaxDeclarationSigned: false }, PARAMS_2026);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.totalGross.toString()).toBe('0');
      expect(r.taxAmount.toString()).toBe('0');
    }
  });
});

describe('grossFromNet — reverse calculation (signed declaration)', () => {
  it('net equals gross when the monthly discount wipes out the tax', () => {
    // Max tax under threshold (~675) is far below the 2570 discount, so tax is 0.
    const r = grossFromNet({ netReward: '4000', isTaxDeclarationSigned: true }, PARAMS_2026);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.totalGross.toString()).toBe('4000');
      expect(r.taxAmount.toString()).toBe('0');
      expect(r.netAmount.toString()).toBe('4000');
    }
  });
});

describe('grossFromNet — round-trips with calculatePayroll', () => {
  for (const signed of [false, true]) {
    for (let gross = 100; gross <= 4499; gross += 137) {
      it(`gross ${gross} (signed=${signed}) survives net → gross round-trip`, () => {
        const forward = calculatePayroll(
          { baseReward: String(gross), extraReward: '0', isTaxDeclarationSigned: signed },
          PARAMS_2026,
        );
        expect(forward.ok).toBe(true);
        if (!forward.ok) return;
        const back = grossFromNet(
          { netReward: forward.netAmount.toFixed(2), isTaxDeclarationSigned: signed },
          PARAMS_2026,
        );
        expect(back.ok).toBe(true);
        if (back.ok) {
          // The grossed-up amount must reproduce the same net exactly.
          expect(back.netAmount.toFixed(2)).toBe(forward.netAmount.toFixed(2));
          // And it never exceeds the gross that produced that net.
          expect(back.totalGross.lte(forward.totalGross)).toBe(true);
        }
      });
    }
  }
});
