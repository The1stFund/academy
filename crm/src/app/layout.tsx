import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "The 1st Academy – Admin",
  description: "Panel administracyjny The 1st Academy",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className={`${montserrat.variable} h-full`}>
      <body className="min-h-full" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
