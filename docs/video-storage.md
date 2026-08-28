# Video Storage & Protected Playback

## Provider abstraction

All video handling goes through `VideoProvider` (`src/lib/video/provider.ts`).
Set `VIDEO_PROVIDER` to pick the implementation:

| Provider | Use | Credentials |
|---|---|---|
| `local` (default) | Development — files on disk under `VIDEO_LOCAL_DIR` (default `./uploads`) | none |
| `cloudflare` | Cloudflare Stream (TUS upload + Stream playback) | `CLOUDFLARE_STREAM_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_STREAM_CUSTOMER_CODE` |
| `mux` | Mux Video | `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` |

The local provider stores files under `uploads/{video,thumbnail,resource}/` — **nothing under
that directory is ever served statically**. All access goes through signed routes.

## Protected playback

```
Watch page (server)
  ├─ canWatchRecording(rcId, userId)   ← access rules (below)
  └─ provider.playbackUrl()            ← HMAC-signed token (2h TTL, tied to the user)
        ↓
GET /api/videos/[id]/stream?token=…&exp=…
  ├─ verify token (timing-safe HMAC, expiry, user match)
  ├─ re-check canWatchRecording()       ← enforced at the byte level
  └─ stream with HTTP Range support    (200 full / 206 partial)
```

**Raw file paths are never exposed.** Tokens are minted server-side only for authorized
viewers, expire in 2 hours, and are bound to the authenticated user.

## Access rules

- Recording must be `PUBLISHED` and its video `READY`.
- **Standalone recordings** → anyone can watch.
- **Course-linked recordings** → the viewer must be enrolled in the linked course
  (teacher of the course and admins are exempt).
- Resources attached to a recording follow the same rule via
  `GET /api/uploads/[...path]`.

## Upload flow (admin)

1. `POST /api/admin/videos` (multipart) — validates extension + MIME + 500 MB cap,
   writes via the provider, creates the central `Video` asset row
   (`UPLOADING → QUEUED → PROCESSING → READY/FAILED` lifecycle; local = READY immediately).
2. Upload wizard: video + optional thumbnail/resources, course→module→lesson linking,
   metadata (title, description, tags, language, duration).
3. `RecordedClass` lifecycle: `DRAFT → PROCESSING → READY → PUBLISHED / ARCHIVED`,
   with retry (delete draft + re-upload) and unpublish.

## Verified

- Upload via API: 200 + asset row + file on disk; JSON rejected with clean 400
- Full stream 200 (200,000 bytes) · Range request 206 `bytes 100-199/200000` · forged token 401 · missing token 401
- Unenrolled student blocked from a course-tied recording (enroll prompt);
  enrolled student gets the player with a signed URL
- Watch page renders player controls with the signed token
