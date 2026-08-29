# Live Classes (External Meeting Links)

Live classes are **scheduled free events with an external meeting link**
(Zoom, Google Meet, …). There is no built-in classroom: the teacher
schedules a class, students register, and everyone joins through the
teacher's link.

## Lifecycle

`SCHEDULED → (teacher Mark-as-ended) → ENDED`
or `SCHEDULED → (teacher Cancel) → CANCELLED`

- **Schedule** — `scheduleLiveClass` in `src/lib/actions/teacher.ts`
  (Zod schema `liveClassSchema` in `src/lib/validation/profile.ts`):
  title, description, date/time, duration, capacity and a validated
  `meetingUrl`.
- **Register** — `registerLiveClass` in `src/lib/actions/student.ts`
  (free — no checkout). Creates a `LiveClassParticipant` row and sends the
  student a `LIVE_CLASS_REGISTERED` notification with title, date/time and
  the meeting link (`data.liveClassId`). The teacher gets a `NEW_BOOKING`
  notification. `unregisterLiveClass` frees the seat.
- **Cancel** — `cancelLiveClass` notifies every registered student
  (`BOOKING_CANCELLED`).
- **End** — `markLiveClassEnded` moves a scheduled class to `ENDED`.

## Notifications & reminders

- Registration confirmation carries the meeting link (shown in the bell
  popup and the notification center — the row links to `/dashboard/live`).
- `sendDueBookingReminders` (`src/lib/reminders.ts`) sends a
  `LIVE_CLASS_REMINDER` (with date and link) to every participant of
  classes starting within 24h, once per class (`remindedAt` guard). Runs
  via `/api/cron/reminders` (CRON_SECRET-gated) and opportunistically from
  dashboard layouts.

## Student & teacher surfaces

- Students: `/dashboard/live` — register/leave; once the class has started,
  registered students see "Join meeting →" (opens `meetingUrl` in a new
  tab with `rel="noopener noreferrer"`).
- Teachers: `/teacher/live-classes` — schedule modal (meeting link
  required), upcoming list with the link, Mark-as-ended and Cancel
  actions, history with ENDED/CANCELLED badges. The calendar and the
  overview page list SCHEDULED classes only.
- Marketing home / search / teacher profiles show upcoming scheduled
  classes via `LiveClassCard` ("Free to join →").
- Scheduled classes count as teacher commitments in
  `src/lib/availability.ts` (booking conflict checks).

## Data model

`LiveClass`: title, description, startsAt/endsAt, durationMinutes,
maxStudents, status (SCHEDULED|ENDED|CANCELLED), `meetingUrl`.
`LiveClassParticipant`: plain registration rows (one per student per
class, `@@unique([liveClassId, userId])`).
