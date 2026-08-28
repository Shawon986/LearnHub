import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "LearnHub — Live Classes, Courses & Expert Teachers",
    template: "%s · LearnHub",
  },
  description:
    "Bangladesh's premium education marketplace. Learn from verified teachers through live classes, recorded courses and 1-on-1 tutoring.",
  keywords: [
    "online courses",
    "live classes",
    "Bangladesh",
    "tutoring",
    "learn programming",
    "e-learning",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "LearnHub",
    title: "LearnHub — Live Classes, Courses & Expert Teachers",
    description:
      "Bangladesh's premium education marketplace. Live classes, recorded courses and 1-on-1 tutoring with verified teachers.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LearnHub — Live Classes, Courses & Expert Teachers",
    description:
      "Bangladesh's premium education marketplace. Live classes, recorded courses and 1-on-1 tutoring with verified teachers.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
