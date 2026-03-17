import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter, Geist_Mono } from "next/font/google"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarOverlay,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isClerkConfigured } from "@/lib/clerk"
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
  const appShell = (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarOverlay />
      <SidebarInset>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium text-foreground">Betting Dashboards</span>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} ${inter.variable} ${geistMono.variable} antialiased`}
      >
        {isClerkConfigured ? <ClerkProvider>{appShell}</ClerkProvider> : appShell}
      </body>
    </html>
  )
}

