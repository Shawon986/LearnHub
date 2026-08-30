"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Authenticated image upload for chat attachments.
 * Validates type + size server-side, stores under the uploads root,
 * returns the protected /api/uploads path.
 */
export async function uploadChatImage(
  file: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    if (!ALLOWED.includes(file.type)) {
      return { ok: false, error: "Only JPEG, PNG or WebP images are allowed." };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "Image exceeds the 5 MB limit." };
    }

    const { mkdir, writeFile } = await import("fs/promises");
    const pathModule = await import("path");
    const root = pathModule.resolve(process.cwd(), "uploads", "chat");
    await mkdir(root, { recursive: true });

    const ext = file.name.includes(".")
      ? `.${file.name.split(".").pop()!.toLowerCase()}`
      : ".png";
    // SECURITY: raster images only — SVG/HTML payloads can carry scripts.
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      return { ok: false, error: "Only JPG, PNG or WebP images are allowed." };
    }
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(pathModule.join(root, unique), buffer);

    const rel = pathModule.posix.join("chat", unique);
    await db.resource.create({
      data: { title: "Chat image", type: "IMAGE", url: rel, uploadedById: user.id },
    });

    revalidatePath("/messages");
    return { ok: true, path: rel };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
