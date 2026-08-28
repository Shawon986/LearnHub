import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { SETTING_KEYS } from "@/lib/constants";

// Platform settings store (admin-controlled, JSON values).
// Numeric settings are read through the typed helpers below.

export async function getSetting(key: string): Promise<unknown | null> {
  const row = await db.platformSetting.findUnique({ where: { key } });
  return row ? safeJsonParse(row.value, null) : null;
}

export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const value = await getSetting(key);
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function setSetting(
  key: string,
  value: unknown,
  updatedById: string,
  description?: string,
) {
  return db.platformSetting.upsert({
    where: { key },
    update: { value: value as object, updatedById, description },
    create: { key, value: value as object, updatedById, description },
  });
}

export async function getCommissionRate(): Promise<number> {
  return getNumberSetting(SETTING_KEYS.COMMISSION_RATE, 15);
}

export async function getReferralReward(): Promise<number> {
  return getNumberSetting(SETTING_KEYS.REFERRAL_REWARD, 100);
}

export async function getWithdrawalMinimum(): Promise<number> {
  return getNumberSetting(SETTING_KEYS.WITHDRAWAL_MIN, 500);
}
