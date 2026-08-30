import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { RouteLoaderVeil } from "@/components/ui/route-loader-veil";
import { RealtimeProvider } from "@/lib/realtime/provider";
import { LanguageProvider } from "@/components/i18n/language-provider";
import type { Locale } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

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

const bangla = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const locale: Locale = store.get("locale")?.value === "bn" ? "bn" : "en";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(inter.variable, jakarta.variable, bangla.variable)}
    >
      <body
        className={cn(
          "min-h-full bg-background text-foreground antialiased",
          locale === "bn" && "font-bangla",
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <LanguageProvider initialLocale={locale}>
            <RealtimeProvider>
              <ToastProvider>{children}</ToastProvider>
              {/* Shows the branded loader for a minimum duration on navigation. */}
              <RouteLoaderVeil />
            </RealtimeProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
