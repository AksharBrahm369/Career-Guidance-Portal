import { Inter, Poppins } from "next/font/google";

// Body / UI — Inter. Mapped to --font-sans (Tailwind `font-sans`).
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Friendly geometric headings — Poppins. Mapped to --font-heading
// (Tailwind `font-heading`). Weights kept tight: 500/600/700.
export const fontHeading = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});
