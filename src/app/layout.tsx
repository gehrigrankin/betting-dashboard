import type { Metadata } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Betting Dashboards",
  description:
    "Build custom NBA research dashboards so you don't have to do 50 Google searches before every bet.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} ${inter.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider defaultOpen>
          <AppSidebar />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}

