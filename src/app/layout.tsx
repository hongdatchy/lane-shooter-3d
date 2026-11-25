import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProvider } from "@/context/app-context";

export const viewport: Viewport = {
  themeColor: "#0A0D14",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "LANE SHOOTER 3D",
  description: "Arcade lane shooter — survive the onslaught, upgrade your arsenal.",
};

const isCrazyGamesBuild = process.env.NEXT_PUBLIC_PLATFORM === "crazygames";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#0A0D14] text-[#E1E2EC] antialiased">
        {isCrazyGamesBuild && (
          <Script
            id="crazygames-sdk-script"
            src="https://sdk.crazygames.com/crazygames-sdk-v3.js"
            strategy="beforeInteractive"
          />
        )}
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
