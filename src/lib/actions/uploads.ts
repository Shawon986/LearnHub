"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

// Chat attachments: images AND documents. Both MIME type and extension must
// be on the same allowlist entry — a file whose type/extension disagree is
// rejected (blocks polyglot tricks: renamed HTML/SVG/scripts).
const IMAGE_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
const FILE_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/zip": [".zip"],
};
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const FILE_MAX_BYTES = 15 * 1024 * 1024;

export interface ChatUploadResult {
  ok: true;
  path: string;
  kind: "image" | "file";
}
export interface ChatUploadError {
  ok: false;
  error: string;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/**
 * Authenticated chat attachment upload (images + documents).
 * Validates type + size server-side, stores under the uploads root
 * (VIDEO_LOCAL_DIR so Vercel's writable /tmp dir is used in production),
 * returns the protected /api/uploads path. The same upload powers
 * student↔teacher chat and the admin oversight view.
 */
export async function uploadChatAttachment(
  file: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
): Promise<ChatUploadResult | ChatUploadError> {
  try {
    const user = await requireUser();
    const ext = extOf(file.name);

    // Some browsers (especially mobile) send an empty MIME for docs —
    // derive it from the extension, then require BOTH to agree anyway.
    const mime =
      file.type || (ext === ".pdf" ? "application/pdf" : ext === ".zip" ? "application/zip" : "");

    let kind: "image" | "file" = "file";
    let allowedExts = FILE_TYPES[mime];
    let maxBytes = FILE_MAX_BYTES;
    if (allowedExts) {
      kind = "file";
    } else {
      allowedExts = IMAGE_TYPES[mime];
      kind = "image";
      maxBytes = IMAGE_MAX_BYTES;
    }

    if (!allowedExts || !allowedExts.includes(ext)) {
      return {
        ok: false,
        error:
          "That file type isn't supported. Images (JPG/PNG/WebP) and documents (PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP) only.",
      };
    }
    if (file.size > maxBytes) {
      const limit = kind === "image" ? "5 MB" : "15 MB";
      return { ok: false, error: `${kind === "image" ? "Image" : "File"} exceeds the ${limit} limit.` };
    }

    const { mkdir, writeFile } = await import("fs/promises");
    const pathModule = await import("path");
    // Same root the /api/uploads serving route reads from — on Vercel that
    // is the writable VIDEO_LOCAL_DIR (/tmp/uploads), never the read-only
    // function bundle.
    const root = pathModule.resolve(process.cwd(), env.VIDEO_LOCAL_DIR, "chat");
    await mkdir(root, { recursive: true });

    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(pathModule.join(root, unique), buffer);

    const rel = pathModule.posix.join("chat", unique);
    await db.resource.create({
      data: {
        title: kind === "image" ? "Chat image" : "Chat file",
        type: kind === "image" ? "IMAGE" : "FILE",
        url: rel,
        uploadedById: user.id,
      },
    });

    revalidatePath("/messages");
    return { ok: true, path: rel, kind };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
