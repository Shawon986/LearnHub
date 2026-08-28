import { getNumberSetting, getWithdrawalMinimum } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/constants";

export { getWithdrawalMinimum };

/** Withdrawal processing fee as a percentage (0–20). */
export async function getWithdrawalFeeRate(): Promise<number> {
  return getNumberSetting(SETTING_KEYS.WITHDRAWAL_FEE_PERCENT, 0);
}

/**
 * Split a sale between teacher and platform.
 * Returns the net (teacher) and commission amounts in integer BDT.
 */
export function splitEarnings(amount: number, commissionPercent: number) {
  const commission = Math.round((amount * commissionPercent) / 100);
  const net = amount - commission;
  return { commission, net };
}

/** Net amount after withdrawal fee. */
export function applyWithdrawalFee(amount: number, feePercent: number) {
  const fee = Math.round((amount * feePercent) / 100);
  return { fee, net: amount - fee };
}
