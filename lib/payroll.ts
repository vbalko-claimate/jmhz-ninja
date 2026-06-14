import Decimal from 'decimal.js';
import { D, type MoneyInput } from './money';

export type CalcInput = {
  baseReward: MoneyInput;
  extraReward: MoneyInput;
  isTaxDeclarationSigned: boolean;
};

export type LegalParams = {
  insuranceThreshold: MoneyInput;
  taxRate: MoneyInput;
  taxDiscountMonthly: MoneyInput;
};

export type CalcOk = {
  ok: true;
  totalGross: Decimal;
  taxAmount: Decimal;
  netAmount: Decimal;
};

export type CalcFail = {
  ok: false;
  reason: 'THRESHOLD_EXCEEDED';
  totalGross: Decimal;
  threshold: Decimal;
};

export type CalcResult = CalcOk | CalcFail;

/**
 * Statutory body reward payroll calculation.
 *
 * Rules:
 * - If totalGross > insuranceThreshold → blocked (social/health insurance kicks in).
 * - No signed declaration → withholding tax (srážková daň, zvláštní sazba, § 36):
 *   the tax is rounded DOWN to whole CZK ("na celé koruny dolů"). This is what
 *   the bank account and prior JMHZ filings reflect.
 * - Signed declaration → advance tax (zálohová daň): rounded UP to whole CZK,
 *   minus the monthly personal discount, clamped at 0. (For rewards below the
 *   insurance threshold the discount always wipes the tax out, so this branch
 *   yields 0 in practice.)
 */
export function calculatePayroll(input: CalcInput, params: LegalParams): CalcResult {
  const baseReward = D(input.baseReward);
  const extraReward = D(input.extraReward);
  const threshold = D(params.insuranceThreshold);
  const taxRate = D(params.taxRate);
  const discount = D(params.taxDiscountMonthly);

  const totalGross = baseReward.plus(extraReward);

  if (totalGross.gt(threshold)) {
    return { ok: false, reason: 'THRESHOLD_EXCEEDED', totalGross, threshold };
  }

  const rounding = input.isTaxDeclarationSigned ? Decimal.ROUND_UP : Decimal.ROUND_DOWN;
  const computedTax = totalGross.times(taxRate).toDecimalPlaces(0, rounding);

  const finalTax = input.isTaxDeclarationSigned
    ? Decimal.max(new Decimal(0), computedTax.minus(discount))
    : computedTax;

  const netAmount = totalGross.minus(finalTax);

  return { ok: true, totalGross, taxAmount: finalTax, netAmount };
}

export type NetCalcInput = {
  netReward: MoneyInput;
  isTaxDeclarationSigned: boolean;
};

/**
 * Reverse ("grossing-up") calculation: given a desired NET payout, find the
 * GROSS reward whose statutory deductions produce exactly that net.
 *
 * The tax is a step function on whole CZK, so we cannot simply divide by
 * (1 - rate). We enumerate the whole-CZK pre-discount tax `t`, derive the only
 * gross that could yield it (gross = net + finalTax(t)), and keep it iff the
 * forward calculation actually reproduces this net — so the inverse always
 * stays consistent with {@link calculatePayroll}, whatever its rounding.
 *
 * A net can be reachable from two adjacent grosses (the rounding band where the
 * whole-CZK tax ticks over). The real reward that produced a given net — the
 * one in prior JMHZ filings and on the bank statement — is the LARGER gross in
 * that band (it sits at the boundary where the tax just stepped up), so the
 * largest gross at or below the insurance threshold wins.
 *
 * The chosen gross is run back through {@link calculatePayroll} so the returned
 * breakdown comes from the single authoritative forward path (and the
 * insurance-threshold guard fires identically).
 */
export function grossFromNet(input: NetCalcInput, params: LegalParams): CalcResult {
  const net = D(input.netReward).toDecimalPlaces(2);
  const taxRate = D(params.taxRate);
  const discount = D(params.taxDiscountMonthly);
  const threshold = D(params.insuranceThreshold);

  const forward = (gross: Decimal) =>
    calculatePayroll(
      { baseReward: gross, extraReward: '0', isTaxDeclarationSigned: input.isTaxDeclarationSigned },
      params,
    );

  if (net.lte(0)) {
    return forward(new Decimal(0));
  }

  // Whole-CZK tax never exceeds rate * threshold; +2 covers rounding slack.
  const maxTax = threshold.times(taxRate).toDecimalPlaces(0, Decimal.ROUND_UP).toNumber() + 2;

  let best: Decimal | null = null;
  for (let t = 0; t <= maxTax; t++) {
    const wholeTax = new Decimal(t);
    const finalTax = input.isTaxDeclarationSigned
      ? Decimal.max(new Decimal(0), wholeTax.minus(discount))
      : wholeTax;
    const gross = net.plus(finalTax);
    if (gross.gt(threshold)) continue;
    const result = forward(gross);
    if (result.ok && result.netAmount.equals(net) && (best === null || gross.gt(best))) {
      best = gross;
    }
  }

  // No gross at or below the threshold reaches this net → let the forward
  // calculation surface THRESHOLD_EXCEEDED from the analytic estimate.
  const gross = best ?? net.dividedBy(new Decimal(1).minus(taxRate)).toDecimalPlaces(2);
  return forward(gross);
}
