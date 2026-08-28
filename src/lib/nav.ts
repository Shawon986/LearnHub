import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileVideo,
  GraduationCap,
  Heart,
  LayoutDashboard,
  MessageSquare,
  MonitorPlay,
  PlayCircle,
  Settings,
  ShieldCheck,
  Star,
  Tags,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

/** Where a signed-in user of a given role lands. */
export function homeFor(role: string): string {
  if (["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(role)) return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/dashboard";
}

export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/live", label: "Live Classes", icon: Video },
  { href: "/dashboard/recordings", label: "Recorded Classes", icon: PlayCircle },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/certificates", label: "Certificates", icon: Award },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "Overview", icon: LayoutDashboard },
  { href: "/teacher/profile", label: "Profile", icon: GraduationCap },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/courses", label: "Courses", icon: BookOpen },
  { href: "/teacher/live-classes", label: "Live Classes", icon: MonitorPlay },
  { href: "/teacher/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/teacher/availability", label: "Availability", icon: Clock3 },
  { href: "/teacher/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/teacher/reviews", label: "Reviews", icon: Star },
  { href: "/teacher/earnings", label: "Earnings", icon: CircleDollarSign },
  { href: "/teacher/coupons", label: "Coupons", icon: Tags },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/teacher/notifications", label: "Notifications", icon: Bell },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/recorded-classes", label: "Recorded Classes", icon: FileVideo },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/payments", label: "Payments", icon: CircleDollarSign },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/coupons", label: "Coupons", icon: Tags },
  { href: "/admin/referrals", label: "Referrals", icon: Users },
  { href: "/admin/certificates", label: "Certificates", icon: Award },
  { href: "/admin/disputes", label: "Disputes", icon: ShieldCheck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/notifications", label: "Announcements", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function navFor(role: string): NavItem[] {
  if (["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(role)) return ADMIN_NAV;
  if (role === "TEACHER") return TEACHER_NAV;
  return STUDENT_NAV;
}
