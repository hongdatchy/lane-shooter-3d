"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Volume2, VolumeX } from "lucide-react";
import { useGameStore } from "@/state-manager/game-store";
import { useTransClientSide } from "@/lang/useTransClientSide";

interface SoundSettingsControlProps {
  variant?: "header" | "hud";
}

export function SoundSettingsControl({ variant = "header" }: SoundSettingsControlProps) {
  const isMuted = useGameStore((s) => s.isMuted);
  const bgmVolume = useGameStore((s) => s.bgmVolume);
  const sfxVolume = useGameStore((s) => s.sfxVolume);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const setBgmVolume = useGameStore((s) => s.setBgmVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);
  const trans = useTransClientSide();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const effectiveSilent = isMuted || (bgmVolume <= 0 && sfxVolume <= 0);
  const btnClass =
    variant === "hud"
      ? `h-7 w-7 sm:h-8 sm:w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
          effectiveSilent
            ? "bg-[#93000A]/35 border-[#FFB4AB]/45 text-[#FFB4AB]"
            : "bg-[#1D1F27] border-[#3B494B]/45 text-[#B9CACB] hover:text-[#DBFCFF]"
        }`
      : `w-8 h-8 rounded flex items-center justify-center transition-colors cursor-pointer ${
          effectiveSilent
            ? "bg-[#93000A]/35 border border-[#FFB4AB]/45 text-[#FFB4AB]"
            : "bg-[#272A32] hover:bg-[#363941] text-[#B9CACB] hover:text-[#E1E2EC]"
        }`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={effectiveSilent ? trans.hud.unmute : trans.hud.mute}
        title={effectiveSilent ? trans.hud.unmute : trans.hud.mute}
        onClick={(e) => {
          e.currentTarget.blur();
          setOpen((prev) => !prev);
        }}
        className={btnClass}
      >
        {effectiveSilent ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl bg-[#131722] border border-[#3B494B] shadow-[0_12px_32px_rgba(0,0,0,0.85)] p-3 flex flex-col gap-3 z-[80] select-none">
          <div className="flex items-center justify-between border-b border-[#272A32] pb-2">
            <span className="font-mono text-[10px] font-bold text-[#7DF4FF] uppercase tracking-wider">
              {trans.hud.audioMixerTitle}
            </span>
            <button
              type="button"
              onClick={() => toggleMute()}
              className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                isMuted
                  ? "bg-[#93000A]/50 text-[#FFB4AB] border border-[#FFB4AB]/40"
                  : "bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40"
              }`}
            >
              {isMuted ? trans.hud.audioMuted : trans.hud.audioOn}
            </button>
          </div>

          {/* BGM / Nhạc nền */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="flex items-center gap-1.5 text-[#E1E2EC] font-bold uppercase">
                <Music className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>{trans.hud.audioBgm}</span>
              </span>
              <span className="text-[#00F0FF] tabular-nums">
                {Math.round(bgmVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(bgmVolume * 100)}
              onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
              className="w-full h-1.5 rounded-lg appearance-none bg-[#272A32] accent-[#00F0FF] cursor-pointer"
            />
          </div>

          {/* SFX / Tiếng súng & hiệu ứng */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="flex items-center gap-1.5 text-[#E1E2EC] font-bold uppercase">
                <Volume2 className="w-3.5 h-3.5 text-[#FE9800]" />
                <span>{trans.hud.audioSfx}</span>
              </span>
              <span className="text-[#FE9800] tabular-nums">
                {Math.round(sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(sfxVolume * 100)}
              onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
              className="w-full h-1.5 rounded-lg appearance-none bg-[#272A32] accent-[#FE9800] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
