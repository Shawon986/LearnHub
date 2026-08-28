import { env } from "@/lib/env";

// ============================================================
// Email provider abstraction.
// Development: console provider (prints email to server log,
// the dev UI surfaces verification/reset links directly).
// Production: Resend (fetch-based, no extra dependency) or SMTP.
// Swap providers via EMAIL_PROVIDER without touching call sites.
// ============================================================

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const line = "═".repeat(72);
    console.log(
      `\n${line}\n📧 [DEV EMAIL]\n  To:      ${message.to}\n  Subject: ${message.subject}\n${line}\n${message.text}\n${line}\n`,
    );
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "LearnHub <onboarding@resend.dev>",
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error ${res.status}: ${body}`);
    }
  }
}

export function getEmailProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "resend":
      return new ResendEmailProvider();
    case "console":
    default:
      return new ConsoleEmailProvider();
  }
}

// --- Transactional templates ----------------------------------

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5f0">
    <tr><td style="background:linear-gradient(135deg,#6d28d9,#0d9488);padding:28px 32px;color:#fff">
      <div style="font-size:20px;font-weight:700">🎓 LearnHub</div>
    </td></tr>
    <tr><td style="padding:32px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">${title}</h2>
      ${bodyHtml}
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${env.APP_URL}/verify-email?token=${token}`;
  const provider = getEmailProvider();
  await provider.send({
    to,
    subject: "Verify your email — LearnHub",
    text: `Hi ${name},\n\nVerify your email to activate your account:\n${url}\n\nThis link expires in 24 hours.`,
    html: layout(
      "Verify your email",
      `<p style="margin:0 0 16px;color:#374151">Hi ${name}, thanks for joining! Verify your email to activate your account.</p>
       <a href="${url}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Verify email</a>
       <p style="margin:20px 0 0;color:#9ca3af;font-size:13px">This link expires in 24 hours.</p>`,
    ),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${env.APP_URL}/reset-password?token=${token}`;
  const provider = getEmailProvider();
  await provider.send({
    to,
    subject: "Reset your password — LearnHub",
    text: `Hi ${name},\n\nReset your password here:\n${url}\n\nThis link expires in 1 hour.`,
    html: layout(
      "Reset your password",
      `<p style="margin:0 0 16px;color:#374151">Hi ${name}, we received a request to reset your password.</p>
       <a href="${url}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Reset password</a>
       <p style="margin:20px 0 0;color:#9ca3af;font-size:13px">This link expires in 1 hour.</p>`,
    ),
  });
}
