"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_LOCALES } from "@/lang/useTransClientSide";
import { useAppStore } from "@/state-manager/app-store";
import { useGameStore } from "@/state-manager/game-store";

interface LanguageSwitcherProps {
  variant?: "header" | "hud";
}

export function LanguageSwitcher({ variant = "header" }: LanguageSwitcherProps) {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current =
    SUPPORTED_LOCALES.find((item) => item.code === locale) || SUPPORTED_LOCALES[0];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const isHud = variant === "hud";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          setOpen((prev) => !prev);
        }}
        aria-label="Language"
        className={
          isHud
            ? "flex h-7 sm:h-8 items-center gap-1 rounded-md border border-slate-700 bg-slate-950/80 px-2 text-[11px] sm:text-xs font-semibold text-white backdrop-blur-md hover:bg-slate-800 transition-colors"
            : "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        }
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span>{current.short}</span>
        <ChevronDown className="h-3 w-3 opacity-75" />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border shadow-xl backdrop-blur-md ${
            isHud
              ? "border-slate-700 bg-slate-950/95 text-white"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          }`}
        >
          {SUPPORTED_LOCALES.map((item) => {
            const active = item.code === current.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setLocale(item.code);
                  void useGameStore.getState().saveLocalePreference(item.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  active
                    ? isHud
                      ? "bg-blue-600/30 text-sky-300"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-sky-300"
                    : isHud
                      ? "hover:bg-slate-800"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{item.flag}</span>
                  <span>{item.label}</span>
                </span>
                <span className="text-[10px] opacity-65">{item.short}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
