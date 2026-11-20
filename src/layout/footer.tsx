"use client";

import { useTransClientSide } from "@/lang/useTransClientSide";

export function Footer() {
  const trans = useTransClientSide();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors">
      <div className="container mx-auto px-4">
        <p className="font-semibold text-slate-700 dark:text-slate-200">{trans.app.footerTitle}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          © {new Date().getFullYear()} {trans.app.footerDesc}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
