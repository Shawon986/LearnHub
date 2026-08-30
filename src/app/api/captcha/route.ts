import { NextResponse } from "next/server";
import { createCaptchaChallenge } from "@/lib/captcha";

export const dynamic = "force-dynamic";

/** A fresh human-check challenge for the register/login forms. */
export function GET() {
  return NextResponse.json(createCaptchaChallenge());
}
