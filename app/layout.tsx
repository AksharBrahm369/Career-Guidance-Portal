import type { Metadata, Viewport } from "next";
import { fontHeading, fontSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning  Portal",
 
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale — never disable pinch-zoom (a11y).
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontHeading.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
