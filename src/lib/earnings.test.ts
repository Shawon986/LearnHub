import { describe, expect, it } from "vitest";
import { splitEarnings, applyWithdrawalFee } from "./earnings";

describe("splitEarnings (commission math)", () => {
  it("splits 15% on 1000 BDT", () => {
    const { commission, net } = splitEarnings(1000, 15);
    expect(commission).toBe(150);
    expect(net).toBe(850);
  });

  it("rounds fractional commission to integer BDT", () => {
    const { commission, net } = splitEarnings(999, 15);
    expect(commission).toBe(150); // 149.85 → 150
    expect(net).toBe(849);
  });

  it("handles 0% commission", () => {
    const { commission, net } = splitEarnings(500, 0);
    expect(commission).toBe(0);
    expect(net).toBe(500);
  });

  it("handles 100% commission", () => {
    const { commission, net } = splitEarnings(500, 100);
    expect(commission).toBe(500);
    expect(net).toBe(0);
  });
});

describe("applyWithdrawalFee", () => {
  it("applies a percentage fee", () => {
    const { fee, net } = applyWithdrawalFee(1000, 2);
    expect(fee).toBe(20);
    expect(net).toBe(980);
  });

  it("is zero-fee at 0%", () => {
    const { fee, net } = applyWithdrawalFee(1000, 0);
    expect(fee).toBe(0);
    expect(net).toBe(1000);
  });
});
