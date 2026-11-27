"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, RotateCcw, Sparkles } from "lucide-react";
import { LanguageSwitcher } from "@/components/custom/common/language-switcher";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";
import { startBackgroundPreload } from "@/service/asset-preloader";
import { isLocalDevEnvironment } from "@/service/dev-mode-service";
import { soundService } from "@/service/sound-service";
import { useGameStore } from "@/state-manager/game-store";

export function FirstRunGate() {
  const assetsReady = useGameStore((s) => s.assetsReady);
  const assetsPercent = useGameStore((s) => s.assetsPercent);
  const assetsError = useGameStore((s) => s.assetsError);
  const startFirstRun = useGameStore((s) => s.startFirstRun);
  const completeFirstRunOnboarding = useGameStore((s) => s.completeFirstRunOnboarding);
  const trans = useTransClientSide();

  const [queuedStart, setQueuedStart] = useState(false);
  const [isLocalEnv, setIsLocalEnv] = useState(false);

  useEffect(() => {
    setIsLocalEnv(isLocalDevEnvironment());
  }, []);

  useEffect(() => {
    if (queuedStart && assetsReady) {
      setQueuedStart(false);
      startFirstRun();
    }
  }, [queuedStart, assetsReady, startFirstRun]);

  const handleStartClick = () => {
    soundService.unlock();
    if (assetsReady) {
      startFirstRun();
      return;
    }
    setQueuedStart(true);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0A0D14] px-4 py-8 text-[#E1E2EC] select-none">
      {/* Nền Cyber Arena nhẹ */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(0, 240, 255, 0.22), transparent 60%), radial-gradient(circle at 50% 80%, rgba(254, 152, 0, 0.14), transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #00F0FF 0px, #00F0FF 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, #00F0FF 0px, #00F0FF 1px, transparent 1px, transparent 28px)",
        }}
      />

      {/* Bộ chọn ngôn ngữ ở góc phải */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher variant="hud" />
      </div>

      {/* Thẻ Start Stage 1 nằm giữa màn hình tải */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center rounded-2xl border border-[#00F0FF]/45 bg-[#191B23]/95 p-6 sm:p-8 text-center shadow-[0_0_60px_rgba(0,240,255,0.18)] backdrop-blur-xl">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00F0FF]/45 bg-[#00F0FF]/12 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7DF4FF]">
          <Sparkles className="h-3 w-3 text-[#00F0FF]" />
          <span>{trans.firstRun.badge}</span>
        </div>

        <h1 className="mt-4 font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#DBFCFF]">
          {trans.app.name}
        </h1>
        <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-[#FE9800]">
          {trans.firstRun.title}
        </p>
        <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-[#B9CACB]">
          {trans.firstRun.subtitle}
        </p>

        {/* Thanh tiến độ tải dữ liệu trận đấu */}
        <div className="mt-6 w-full rounded-xl border border-[#272A32] bg-[#0B0E15]/85 p-3.5">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className={assetsReady ? "font-bold text-[#34D399]" : "text-[#B9CACB]"}>
              {assetsReady ? trans.firstRun.readyLabel : trans.firstRun.loadingLabel}
            </span>
            <span className="font-extrabold text-[#FFC080] tabular-nums">{assetsPercent}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1D1F27]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#006970] via-[#00F0FF] to-[#FE9800] transition-all duration-300"
              style={{ width: `${assetsPercent}%` }}
            />
          </div>
        </div>

        {assetsError && (
          <div className="mt-4 w-full rounded-xl border border-[#FF2A6D]/50 bg-[#93000A]/30 p-3 text-xs text-[#FFB4AB]">
            <p className="font-medium">{trans.firstRun.loadErrorHint}</p>
            <button
              type="button"
              onClick={() => void startBackgroundPreload()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#FFB4AB]/40 bg-[#1D1F27] px-3 py-1 font-mono text-[11px] font-bold uppercase text-[#FFE5E2] hover:bg-[#272A32] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{trans.firstRun.retryBtn}</span>
            </button>
          </div>
        )}

        {/* Nút Start Game duy nhất ở giữa màn load */}
        <button
          type="button"
          id="btnFirstRunStart"
          disabled={Boolean(assetsError) || queuedStart}
          onClick={handleStartClick}
          className={`mt-5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl px-5 font-['Space_Grotesk'] text-sm sm:text-base font-extrabold uppercase tracking-wider transition-all ${
            assetsError
              ? "bg-[#272A32] text-[#849495] cursor-not-allowed"
              : assetsReady
                ? "bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#00363A] shadow-[0_0_28px_rgba(0,240,255,0.42)] cursor-pointer active:translate-y-0.5"
                : queuedStart
                  ? "bg-[#00F0FF]/80 text-[#00363A] cursor-wait"
                  : "bg-[#1D1F27] hover:bg-[#272A32] border-2 border-[#00F0FF]/65 text-[#DBFCFF] shadow-[0_0_20px_rgba(0,240,255,0.2)] cursor-pointer"
          }`}
        >
          {queuedStart || !assetsReady ? (
            <Loader2 className={`h-5 w-5 ${queuedStart ? "animate-spin" : ""}`} />
          ) : (
            <Play className="h-5 w-5 fill-current" />
          )}
          <span>
            {assetsReady
              ? trans.firstRun.startBtnReady
              : formatText(trans.firstRun.startBtnLoading, { pct: assetsPercent })}
          </span>
        </button>

        {queuedStart && !assetsReady && (
          <p className="mt-2 font-mono text-[11px] text-[#7DF4FF]">
            {formatText(trans.firstRun.startingHint, { pct: assetsPercent })}
          </p>
        )}

        <p className="mt-5 font-mono text-[10px] leading-relaxed text-[#849495]">
          {trans.firstRun.controlsTip}
        </p>

        {isLocalEnv && (
          <button
            type="button"
            onClick={completeFirstRunOnboarding}
            className="mt-3 font-mono text-[10px] text-[#849495] underline hover:text-[#FE9800] cursor-pointer"
          >
            [Local Dev] Bỏ qua vào Menu chính
          </button>
        )}
      </div>
    </div>
  );
}
