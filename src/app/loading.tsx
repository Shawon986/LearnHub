import { LoadingWatchdog } from "@/components/ui/loading-watchdog";

/**
 * Root loading boundary. Route changes show a slim standard progress bar
 * (no full-screen loader — the branded PageLoader veil is reserved for
 * initial entry / navigating home). LoadingWatchdog additionally guarantees
 * the screen can never hang forever: after 12s it offers Retry / Go home.
 */
export default function Loading() {
  return <LoadingWatchdog />;
}
