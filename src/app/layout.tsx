import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NoElons — the social network nobody owns",
    template: "%s · NoElons",
  },
  description:
    "Photos and quick posts in a chronological timeline. No billionaire's thumb on the scale, no paid reach, public moderation log, and your data leaves with you.",
  applicationName: "NoElons",
  metadataBase: new URL(process.env.PUBLIC_URL ?? "http://localhost:3000"),
  openGraph: { siteName: "NoElons", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e13" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
