# Database Architecture

- **ORM**: Prisma 6 (`prisma/schema.prisma`) — 63 models, fully relational.
- **Dev**: SQLite (`prisma/dev.db`) — zero-install, real persistence.
- **Production**: PostgreSQL. Switch = set `DATABASE_URL` to a Postgres
  connection string, `prisma db push` (or migrate), reseed if desired.
- **Enums**: status/"enum" values are typed strings (source of truth:
  `src/lib/constants.ts`), validated with Zod at every API boundary.
- **Money**: integer BDT everywhere — no float rounding (commission math
  is integer math; see `src/lib/earnings.ts`).
- **IDs**: cuid(). **Timestamps**: createdAt/updatedAt on all entities.
- **Indexes**: hot paths indexed — enrollments by student/course, lessons
  by module, messages by conversation, notifications by user+read,
  bookings by teacher+status, payments by status/date, audit by entity.

## Key domain groups

| Group | Models |
|---|---|
| Identity | User (6 roles), StudentProfile, TeacherProfile, TeacherSkill/Education/Experience/Document, TeacherVerification |
| Catalog | Category, Course, CourseModule, Lesson, Quiz, Question, Assignment, Resource |
| Learning | Enrollment, CourseProgress, LessonProgress, QuizAttempt, AssignmentSubmission |
| Live | LiveClass, LiveClassParticipant, LiveClassRecording |
| Recorded | Video, CaptionTrack, RecordedClass, VideoProgress, Bookmark, VideoNote |
| Commerce | Payment, Transaction, Refund, Commission, TeacherWallet, WalletTransaction, Withdrawal, Coupon, CouponRedemption |
| Community | Review, Conversation, ConversationParticipant, Message, Notification(+Preference) |
| Trust | Referral, Dispute, DisputeMessage, AuditLog, Certificate |
| AI | AIConversation, AIMessage, AIRecommendation |
| Admin | PlatformSetting, Announcement, Banner, AuthToken, Badge, Achievement, WishlistItem |

## Test database

`vitest` uses a dedicated `prisma/test.db` created in
`vitest.global-setup.ts` — the dev database is never touched by tests.
