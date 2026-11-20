import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/layout/header";
import Footer from "@/layout/footer";
import { AppProvider } from "@/context/app-context";

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "3D Lane Shooter",
  description: "Base project Next.js + TypeScript + Tailwind + Zustand cho ứng dụng và game 3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors">
        <AppProvider>
          <Header />
          <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
