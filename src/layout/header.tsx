"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Home, Moon, Sun } from "lucide-react";
import { useAppStore } from "@/state-manager/app-store";
import { useTransClientSide } from "@/lang/useTransClientSide";
import { LanguageSwitcher } from "@/components/custom/common/language-switcher";

export function Header() {
  const pathname = usePathname();
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const trans = useTransClientSide();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur transition-colors">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-600 text-white shadow-sm flex items-center justify-center">
            <Box className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight block leading-tight uppercase truncate">
              {trans.app.name}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block truncate">
              {trans.app.subtitle}
            </span>
          </div>
        </Link>

        {/* Navigation + Language Switcher + Theme Toggle */}
        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href="/"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              pathname === "/"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{trans.app.home}</span>
          </Link>

          <LanguageSwitcher variant="header" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? trans.app.toDark : trans.app.toLight}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === "light" ? (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span>{trans.app.themeDark}</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>{trans.app.themeLight}</span>
              </>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
