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
