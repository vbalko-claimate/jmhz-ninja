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
 * - Withholding tax = ceil(totalGross * taxRate) on whole CZK (§ 146 ZDP).
 * - Signed tax declaration → subtract monthly personal discount, clamp at 0.
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

  const computedTax = totalGross.times(taxRate).toDecimalPlaces(0, Decimal.ROUND_UP);

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
 * The forward tax is a step function — tax = ceil(gross * rate) on whole CZK —
 * so we cannot simply divide by (1 - rate). Instead we enumerate the whole-CZK
 * pre-discount tax `t`, derive the only gross that could yield it
 * (gross = net + finalTax(t)), and keep it iff the forward rounding reproduces
 * the same `t`. With rate < 1 a solution always exists for any reachable net;
 * when two grosses map to the same net (rounding band), the smaller — i.e. the
 * tightest grossing-up — wins.
 *
 * The chosen gross is then run back through {@link calculatePayroll} so the
 * returned breakdown comes from the single authoritative forward code path
 * (and the insurance-threshold guard fires identically).
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

  // Largest whole-CZK tax achievable on a gross at the insurance threshold.
  const maxTax = threshold.times(taxRate).toDecimalPlaces(0, Decimal.ROUND_UP).toNumber();

  let best: Decimal | null = null;
  for (let t = 0; t <= maxTax; t++) {
    const wholeTax = new Decimal(t);
    const finalTax = input.isTaxDeclarationSigned
      ? Decimal.max(new Decimal(0), wholeTax.minus(discount))
      : wholeTax;
    const gross = net.plus(finalTax);
    const recomputed = gross.times(taxRate).toDecimalPlaces(0, Decimal.ROUND_UP);
    if (recomputed.equals(wholeTax) && (best === null || gross.lt(best))) {
      best = gross;
    }
  }

  // No gross at or below the threshold reaches this net → let the forward
  // calculation surface THRESHOLD_EXCEEDED from the analytic estimate.
  const gross = best ?? net.dividedBy(new Decimal(1).minus(taxRate)).toDecimalPlaces(2);
  return forward(gross);
}
