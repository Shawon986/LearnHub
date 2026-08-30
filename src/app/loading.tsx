import { LoadingWatchdog } from "@/components/ui/loading-watchdog";

/**
 * Root loading boundary. The branded loader renders while a route is
 * pending; LoadingWatchdog guarantees the screen can never hang forever —
 * after 12s it offers Retry / Go home.
 */
export default function Loading() {
  return <LoadingWatchdog />;
}
