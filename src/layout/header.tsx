"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Home } from "lucide-react";
import { vi } from "@/lang/vi";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-600 text-white shadow-sm flex items-center justify-center">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight uppercase">
              {vi.app_name}
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:block">
              {vi.app_subtitle}
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              pathname === "/"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{vi.nav.home}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
