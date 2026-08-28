# Recorded Classes

## Pipeline

1. **Upload** (admin, `/admin/recorded-classes/upload`): multipart to
   `/api/admin/videos` — extension + MIME whitelist, 500 MB cap → central
   `Video` asset row (`UPLOADING → QUEUED → PROCESSING → READY/FAILED`;
   the local provider is READY immediately).
2. **Metadata + linking**: title, description, tags, language, duration,
   optional course→module→lesson attachment, thumbnail + resources.
3. **Publish**: `DRAFT → READY → PUBLISHED / ARCHIVED`; unpublish returns
   to READY; failed drafts can be deleted and re-uploaded.

## Protected playback

- Access rules in `src/lib/video/access.ts`: PUBLISHED + video READY;
  course-linked recordings require enrollment (course teacher + admins
  exempt); standalone recordings are public.
- The watch page mints a **2-hour HMAC-signed token** (bound to the user);
  `/api/videos/[id]/stream` re-verifies token + access and streams with
  HTTP Range support (206 partial content). Raw paths are never exposed.
- Resources follow the same rules via `/api/uploads/[...path]`.
- **Covered by tests** (`src/lib/video/access.test.ts`): unenrolled
  student blocked, enrolled allowed, teacher/admin allowed, standalone
  public, unpublished + processing blocked.

## Player

Custom player (`src/components/video/player.tsx`): play/seek/volume,
0.5–2× speed, PiP, fullscreen, keyboard shortcuts (space/k/←/→/f/m/b/n),
resume overlay, timeline bookmarks, in-player notes, throttled progress
persistence (5s), completion detection at ≥95%.

## Providers

`VIDEO_PROVIDER` = `local` (default) | `cloudflare` | `mux` — adapters
documented in `src/lib/video/provider.ts` with their credential
requirements (see `docs/video-storage.md` for full details).
