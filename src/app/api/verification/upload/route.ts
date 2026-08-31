import path from "path";
import { apiHandler, json } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per document
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Anonymous document upload for teacher REGISTRATION (before the account
 * exists): NID, resume/CV, education certificates and photos. Bytes are
 * stored IN THE DATABASE (VerificationDocument) so admins can open them
 * from any device or serverless instance — the registration request then
 * carries the returned `vdoc:<id>` references.
 */
export const POST = apiHandler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`verif-upload:${ip}`, { limit: 12, windowMs: 60 * 60_000 });
  if (!rl.ok) {
    return json({ error: "rate_limited", message: "Too many uploads. Try again later." }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "file", message: "A file is required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return json({ error: "size", message: "File exceeds the 10 MB limit." }, { status: 413 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return json(
      { error: "invalid_file", message: "Only PDF, JPG, PNG or WebP files are allowed." },
      { status: 400 },
    );
  }

  const doc = await db.verificationDocument.create({
    data: {
      mime: file.type || MIME_BY_EXT[ext],
      name: file.name,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    },
  });

  return json({ ok: true, path: `vdoc:${doc.id}` }, { status: 201 });
});
