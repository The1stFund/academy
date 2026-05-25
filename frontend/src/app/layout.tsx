import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "The1st Academy – Profesjonalna platforma tradingowa",
  description: "Kursy wideo, codzienne analizy rynku, dziennik transakcji i społeczność traderów – wszystko w jednym miejscu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>{children}</body>
    </html>
  );
}
