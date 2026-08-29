import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Share links (e.g. /register?ref=CODE) pre-fill the referral code.
  const raw = await searchParams;
  const ref = typeof raw.ref === "string" ? raw.ref.trim().toUpperCase() : undefined;

  return <RegisterForm initialReferralCode={ref} />;
}
