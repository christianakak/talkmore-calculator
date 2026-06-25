import type { Metadata, Viewport } from "next";
import { Poppins, Questrial } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Questrial ships a single weight (400), used for headings and price numerals.
const questrial = Questrial({
  variable: "--font-questrial",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Talkmore · Priskalkulator",
  description: "Regn ut månedspris, rabatt og første faktura for Talkmore-abonnement.",
  // Behaves like an app when a rep adds it to the iPhone home screen
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Priskalkulator",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`${poppins.variable} ${questrial.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">{children}</body>
    </html>
  );
}
