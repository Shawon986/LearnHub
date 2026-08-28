# Live Classes & Realtime

## Architecture

```
Server action (chat/hand/poll/whiteboard/…)
   → classroomBus (in-process event bus, src/lib/live/bus.ts)
   → SSE stream GET /api/classrooms/[id]/stream (force-dynamic)
   → every connected participant
```

- The bus keeps session-scoped state: open polls (with votes), whiteboard
  stroke buffer (replayed to late joiners), presence.
- **Multi-instance production**: swap the bus store for Redis pub/sub —
  the exported API (`subscribe`/`publish`/poll helpers) stays identical.
- SSE gotchas already solved in this codebase: `export const dynamic =
  "force-dynamic"` is required, an immediate first byte (`: connected`) is
  required or headers never flush, and every `controller.enqueue` is
  wrapped in try/catch (client disconnects otherwise raise
  `uncaughtException`).

## Lifecycle

SCHEDULED → (teacher Start) → LIVE → (teacher End) → ENDED
- End performs attendance rollup: joined ≤15 min after start = PRESENT,
  later = LATE, registered but never joined = ABSENT.
- Start notifies all registered participants; reminders run via
  `/api/cron/reminders` (CRON_SECRET-gated) and opportunistically from
  dashboard layouts.

## Video/audio (WebRTC)

`src/lib/live/webrtc.ts` — provider abstraction:
- **dev** (default): no media transport; the classroom shows avatar tiles.
- **livekit**: mints real LiveKit access tokens with `jose` (HS256, no SDK).
  Requires `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
  (`LIVE_PROVIDER=livekit`). The frontend then connects the SFU and media
  replaces the avatar tiles.

## Classroom UI

`/classroom/[id]` — video tiles, chat (host-lockable), participants with
raised hands + host mute/remove, polls with live result bars, emoji
reactions, collaborative whiteboard (strokes synced via the bus), bottom
control bar, mobile drawer layout. Host-only actions are enforced
server-side in `src/lib/actions/live.ts`.
