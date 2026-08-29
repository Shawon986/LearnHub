import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getVideoProvider } from "@/lib/video/provider";

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

// Video upload (multipart) — teachers AND admins upload recorded classes
// through this endpoint. Creates the central Video asset row; processing
// status is provider-driven (local = READY immediately).
export const POST = apiHandler(async (req) => {
  const actor = await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "video");
  const title = String(form.get("title") ?? file ? (file as File).name : "Untitled");

  if (!(file instanceof File)) {
    return json({ error: "file", message: "A file is required." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: "size", message: "File exceeds the 500 MB limit." }, { status: 413 });
  }

  const provider = getVideoProvider();
  let result;
  try {
    result = await provider.upload({ file, kind: kind as "video" | "thumbnail" | "resource" });
  } catch (e) {
    return json(
      { error: "invalid_file", message: e instanceof Error ? e.message : "Upload rejected." },
      { status: 400 },
    );
  }

  const video = await db.video.create({
    data: {
      title,
      source: provider.key.toUpperCase() === "LOCAL" ? "LOCAL" : provider.key.toUpperCase(),
      filePath: result.path,
      durationSeconds: 0,
      sizeBytes: result.sizeBytes,
      mimeType: result.mimeType,
      status: "READY",
      processingProgress: 100,
      uploadedById: actor.id,
    },
  });

  return json(
    {
      ok: true,
      upload: { id: video.id, title, kind, sizeBytes: result.sizeBytes, path: result.path, mimeType: result.mimeType },
    },
    { status: 201 },
  );
});
