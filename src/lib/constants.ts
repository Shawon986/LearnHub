// ============================================================
// Domain constants — the source of truth for "enum" string
// values stored in the database (SQLite has no native enums).
// API boundaries validate against these via Zod.
// ============================================================

export const ROLES = [
  "STUDENT",
  "TEACHER",
  "ADMIN",
  "MODERATOR",
  "SUPPORT",
  "SUPER_ADMIN",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles that can access any admin area. */
export const ADMIN_ROLES = ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"] as const;
/** Roles that can make destructive/platform-wide decisions. */
export const POWER_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "BANNED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const COURSE_TYPES = ["RECORDED", "LIVE", "HYBRID", "ONE_ON_ONE"] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

export const COURSE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const DIFFICULTIES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"] as const;
export const LESSON_TYPES = ["VIDEO", "ARTICLE", "QUIZ", "ASSIGNMENT", "LIVE", "RESOURCE"] as const;

export const ENROLLMENT_STATUSES = ["ACTIVE", "COMPLETED", "REFUNDED", "EXPIRED"] as const;

export const BOOKING_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const LIVE_CLASS_STATUSES = ["SCHEDULED", "ENDED", "CANCELLED"] as const;

export const RECORDED_CLASS_STATUSES = [
  "DRAFT",
  "PROCESSING",
  "READY",
  "PUBLISHED",
  "ARCHIVED",
  "FAILED",
] as const;
export type RecordedClassStatus = (typeof RECORDED_CLASS_STATUSES)[number];

export const VIDEO_STATUSES = ["UPLOADING", "QUEUED", "PROCESSING", "READY", "FAILED"] as const;

export const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["BKASH", "NAGAD", "ROCKET", "STRIPE", "DEV"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_PURPOSES = ["COURSE_PURCHASE", "BOOKING"] as const;

export const TRANSACTION_TYPES = [
  "PAYMENT",
  "REFUND",
  "COMMISSION_CREDIT",
  "WITHDRAWAL",
  "REFERRAL_REWARD",
  "ADJUSTMENT",
] as const;

export const WITHDRAWAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID", "CANCELLED"] as const;
export const WITHDRAWAL_METHODS = ["BKASH", "NAGAD", "ROCKET", "BANK"] as const;

export const VERIFICATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
  "SUSPENDED",
] as const;

export const REVIEW_STATUSES = ["PUBLISHED", "FLAGGED", "REMOVED"] as const;
export const REVIEW_TARGETS = ["TEACHER", "COURSE", "BOOKING", "RECORDED_CLASS"] as const;

export const COUPON_TYPES = ["PERCENTAGE", "FIXED"] as const;
export const COUPON_STATUSES = ["ACTIVE", "INACTIVE", "EXPIRED", "DEPLETED"] as const;

export const DISPUTE_STATUSES = [
  "OPEN",
  "TEACHER_RESPONSE",
  "UNDER_REVIEW",
  "RESOLVED_REFUNDED",
  "RESOLVED_RELEASED",
  "CLOSED",
] as const;
export const DISPUTE_REASONS = ["PAYMENT_ISSUE", "COURSE_ISSUE", "BOOKING_ISSUE", "OTHER"] as const;

export const MESSAGE_TYPES = ["TEXT", "IMAGE", "FILE", "SYSTEM"] as const;
export const CONVERSATION_TYPES = ["DIRECT", "GROUP", "SUPPORT"] as const;

export const COMMISSION_STATUSES = ["PENDING", "CAPTURED", "REVERSED"] as const;

export const WITHDRAWAL_METHOD_LABELS: Record<string, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  BANK: "Bank Transfer",
};

export const NOTIFICATION_TYPES = [
  "NEW_BOOKING",
  "BOOKING_ACCEPTED",
  "BOOKING_CANCELLED",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "NEW_MESSAGE",
  "LIVE_CLASS_REMINDER",
  "LIVE_CLASS_REGISTERED",
  "COURSE_PURCHASED",
  "COURSE_COMPLETED",
  "NEW_REVIEW",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
  "CERTIFICATE_ISSUED",
  "ADMIN_ANNOUNCEMENT",
  "SYSTEM",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const AI_CONVERSATION_TYPES = [
  "STUDY_ASSISTANT",
  "TEACHER_MATCHING",
  "COURSE_RECOMMENDATION",
  "TEACHER_ASSISTANT",
] as const;

export const BADGE_CODES = {
  FIRST_COURSE_COMPLETED: "FIRST_COURSE_COMPLETED",
  STREAK_7: "STREAK_7",
  STREAK_30: "STREAK_30",
  COURSE_100: "COURSE_100",
  TOP_LEARNER: "TOP_LEARNER",
} as const;

/** Platform setting keys (value stored as JSON in PlatformSetting). */
export const SETTING_KEYS = {
  COMMISSION_RATE: "commission.ratePercent", // e.g. 15
  REFERRAL_REWARD: "referral.rewardAmountBdt", // e.g. 100
  REFERRAL_MIN_PURCHASE: "referral.minPurchaseBdt",
  PLATFORM_NAME: "platform.name",
  PLATFORM_TAGLINE: "platform.tagline",
  CONTACT_EMAIL: "platform.contactEmail",
  WITHDRAWAL_MIN: "withdrawal.minAmountBdt",
  WITHDRAWAL_FEE_PERCENT: "withdrawal.feePercent",
} as const;
