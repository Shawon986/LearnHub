import { promises as fs } from "fs";
import path from "path";
import { apiHandler, json } from "@/lib/api";
import { env } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per document
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

/**
 * Anonymous document upload for teacher REGISTRATION (before the account
 * exists): NID, resume/CV, education certificates and photos. Files land in
 * uploads/verification/ and the registration request carries the returned
 * paths, which the register route then attaches to the teacher's
 * verification record.
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

  const root = path.resolve(process.cwd(), env.VIDEO_LOCAL_DIR, "verification");
  await fs.mkdir(root, { recursive: true });
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  await fs.writeFile(path.join(root, unique), Buffer.from(await file.arrayBuffer()));

  return json({ ok: true, path: `verification/${unique}` }, { status: 201 });
});
