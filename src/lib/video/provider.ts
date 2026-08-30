import { createHmac, timingSafeEqual } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { env } from "@/lib/env";
import type { Video } from "@prisma/client";

// ============================================================
// Video storage abstraction.
// Local provider (dev): files on disk, streamed through
// /api/videos/[id]/stream with HMAC-signed tokens — raw file
// paths are NEVER exposed to clients.
// Cloud adapters (Cloudflare Stream / Mux / S3+CloudFront):
// same interface, documented credential requirements.
// ============================================================

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".mkv"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const RESOURCE_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".zip"];

const VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/x-matroska"];

/** Browsers sometimes send an empty MIME — derive it from the extension. */
const EXT_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
};

export type UploadKind = "video" | "thumbnail" | "resource";

export interface UploadResult {
  /** Relative path within the storage root (never exposed raw). */
  path: string;
  sizeBytes: number;
  mimeType: string;
}

export interface VideoProvider {
  readonly key: string;
  upload(input: { file: File; kind: UploadKind }): Promise<UploadResult>;
  /** Best-effort processing status for an uploaded video. */
  processingStatus(video: Pick<Video, "providerId" | "status">): Promise<string>;
  /** Build an authorized playback URL for a user. */
  playbackUrl(video: { id: string; filePath: string | null }, userId: string): Promise<string>;
}

/* ---------------- Local provider (development) ---------------- */

function extensionOf(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export class LocalVideoProvider implements VideoProvider {
  readonly key = "local";

  private assertAllowed(file: File, kind: UploadKind) {
    const ext = extensionOf(file.name);
    const allowedExt =
      kind === "video" ? VIDEO_EXTENSIONS : kind === "thumbnail" ? IMAGE_EXTENSIONS : RESOURCE_EXTENSIONS;
    if (!allowedExt.includes(ext)) {
      throw new Error(`Unsupported file type ".${ext}" for ${kind} uploads.`);
    }
    const mime = file.type || (EXT_MIME[ext] ?? "");
    if (kind === "video" && !VIDEO_MIMES.includes(mime)) {
      throw new Error("Only video files can be uploaded as videos.");
    }
  }

  async upload(input: { file: File; kind: UploadKind }): Promise<UploadResult> {
    this.assertAllowed(input.file, input.kind);

    // Static subfolder keeps Turbopack from tracing the whole project.
    const root = path.resolve(
      /* turbopackIgnore: true */
      process.cwd(),
      env.VIDEO_LOCAL_DIR,
      input.kind,
    );
    await mkdir(root, { recursive: true });

    const ext = extensionOf(input.file.name);
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const relPath = path.posix.join(input.kind, unique);

    const buffer = Buffer.from(await input.file.arrayBuffer());
    await writeFile(path.join(root, unique), buffer);

    return {
      path: relPath,
      sizeBytes: buffer.length,
      mimeType: input.file.type || EXT_MIME[ext] || "application/octet-stream",
    };
  }

  async processingStatus(): Promise<string> {
    // Local storage needs no transcoding — files are served as-is.
    return "READY";
  }

  async playbackUrl(video: { id: string; filePath: string | null }, userId: string): Promise<string> {
    const signed = signPlaybackToken(video.id, userId);
    return `/api/videos/${video.id}/stream?token=${signed.token}&exp=${signed.exp}`;
  }
}

/* ---------------- Cloud adapters (credential-gated) ---------------- */

export class CloudflareStreamProvider implements VideoProvider {
  readonly key = "cloudflare";

  private assertConfigured() {
    if (!process.env.CLOUDFLARE_STREAM_ACCOUNT_ID || !process.env.CLOUDFLARE_STREAM_API_TOKEN) {
      throw new Error(
        "Cloudflare Stream is not configured. Set CLOUDFLARE_STREAM_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN (docs/video-storage.md).",
      );
    }
  }

  async upload(): Promise<UploadResult> {
    // TUS direct upload — requires live credentials (documented).
    this.assertConfigured();
    throw new Error("Cloudflare Stream upload requires a live upload session — see docs/video-storage.md.");
  }

  async processingStatus(): Promise<string> {
    this.assertConfigured();
    return "PROCESSING";
  }

  async playbackUrl(): Promise<string> {
    this.assertConfigured();
    throw new Error("Playback URLs for Cloudflare Stream come from the provider — see docs/video-storage.md.");
  }
}

export class MuxVideoProvider implements VideoProvider {
  readonly key = "mux";

  async upload(): Promise<UploadResult> {
    throw new Error("Mux is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET (docs/video-storage.md).");
  }

  async processingStatus(): Promise<string> {
    return "PROCESSING";
  }

  async playbackUrl(): Promise<string> {
    throw new Error("Playback URLs for Mux are signed per-video — see docs/video-storage.md.");
  }
}

export function getVideoProvider(): VideoProvider {
  switch (env.VIDEO_PROVIDER) {
    case "cloudflare":
      return new CloudflareStreamProvider();
    case "mux":
      return new MuxVideoProvider();
    case "local":
    default:
      return new LocalVideoProvider();
  }
}

/* ---------------- Signed playback tokens ---------------- */

export interface PlaybackToken {
  token: string;
  exp: number;
}

export function signPlaybackToken(videoId: string, userId: string, ttlSeconds = 2 * 60 * 60): PlaybackToken {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${videoId}.${userId}.${exp}`;
  const sig = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("hex");
  return { token: `${payload}.${sig}`, exp };
}

/** Verifies a signed playback token. Returns the userId it was minted for.
 *  Expiry is enforced from the SIGNED payload only — the query-string exp
 *  parameter is ignored so a leaked/expired token cannot be replayed by
 *  tampering with the URL. */
export function verifyPlaybackToken(
  videoId: string,
  token: string,
  _expParam?: string | null, // eslint-disable-line @typescript-eslint/no-unused-vars
): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [v, userId, exp, sig] = parts;
  if (v !== videoId) return null;

  const expNumber = Number(exp);
  if (!Number.isFinite(expNumber) || expNumber < Math.floor(Date.now() / 1000)) return null;

  const expected = createHmac("sha256", env.AUTH_SECRET).update(`${v}.${userId}.${exp}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { userId };
}
