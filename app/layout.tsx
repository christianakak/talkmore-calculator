import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Talkmore · Salgskalkulator",
  description: "Regn ut månedspris og besparelse for Talkmore-abonnement.",
  // Behaves like an app when a rep adds it to the iPhone home screen
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Salgskalkulator",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#12352d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        {/* Ambient glows behind everything */}
        <div className="glows" aria-hidden="true">
          <span className="glow glow--1"></span>
          <span className="glow glow--2"></span>
        </div>

        {/* Signature inner frame */}
        <div className="frame" aria-hidden="true"></div>

        {children}
      </body>
    </html>
  );
}
