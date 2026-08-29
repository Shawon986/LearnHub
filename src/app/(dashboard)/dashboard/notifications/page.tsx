import type { Metadata } from "next";
import { NotificationCenter } from "@/components/notification-center";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationCenter role="STUDENT" />;
}
