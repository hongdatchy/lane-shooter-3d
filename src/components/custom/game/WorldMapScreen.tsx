"use client";

import { useCallback, useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Bug,
  Building2,
  Check,
  Compass,
  Crosshair,
  Flame,
  FlaskConical,
  Hourglass,
  Infinity as InfinityIcon,
  Lock,
  Orbit,
  Play,
  Shield,
  Skull,
  Snowflake,
  Star,
  Swords,
  Wrench,
  Zap,
} from "lucide-react";
import { CHAPTER_CATALOG, ChapterConfig } from "@/service/chapter-catalog";
import { MAX_LOADOUT_SLOTS, getArmoryWeaponById } from "@/service/armory-catalog";
import { MAX_PLAYABLE_CHAPTER } from "@/service/weapon-service";
import { startBackgroundPreload } from "@/service/asset-preloader";
import { useGameStore } from "@/state-manager/game-store";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";

interface WorldMapScreenProps {
  onDeployCombat: () => void;
}

function ChapterNodeIcon({
  icon,
  className,
}: {
  icon: ChapterConfig["icon"];
  className?: string;
}) {
  switch (icon) {
    case "city":
      return <Building2 className={className} />;
    case "bio":
      return <FlaskConical className={className} />;
    case "ice":
      return <Snowflake className={className} />;
    case "hive":
      return <Bug className={className} />;
    case "orbit":
      return <Orbit className={className} />;
    case "mirror":
      return <Boxes className={className} />;
    case "magma":
      return <Flame className={className} />;
    case "time":
      return <Hourglass className={className} />;
    case "void":
      return <Shield className={className} />;
    case "apex":
      return <Crosshair className={className} />;
  }
}

export function WorldMapScreen({ onDeployCombat }: WorldMapScreenProps) {
  const selectedChapterId = useGameStore((s) => s.selectedChapter);
  const saveData = useGameStore((s) => s.saveData);
  const selectChapter = useGameStore((s) => s.selectChapter);
  const selectActiveLoadoutWeapon = useGameStore((s) => s.selectActiveLoadoutWeapon);
  const openLobby = useGameStore((s) => s.openLobby);
  const openArmory = useGameStore((s) => s.openArmory);

  const loadoutIds = saveData.equippedLoadoutIds;

  const assetsReady = useGameStore((s) => s.assetsReady);
  const assetsPercent = useGameStore((s) => s.assetsPercent);
  const assetsError = useGameStore((s) => s.assetsError);
  const platformReady = useGameStore((s) => s.platformReady);
  const platformError = useGameStore((s) => s.platformError);

  const trans = useTransClientSide();

  const unlockedChapter = Math.min(10, Math.max(1, saveData.unlockedChapter));
  const clearedCount = Math.max(0, unlockedChapter - 1);
  const selectedChapter =
    CHAPTER_CATALOG.find((ch) => ch.id === selectedChapterId) ?? CHAPTER_CATALOG[0];
  const isSelectedLocked = selectedChapter.id > unlockedChapter;
  const isChapterBuilt = selectedChapter.id <= MAX_PLAYABLE_CHAPTER;
  const canLaunchCombat =
    !isSelectedLocked && isChapterBuilt && assetsReady && !assetsError && platformReady && !platformError;

  const handleLaunchClick = useCallback(() => {
    if (!canLaunchCombat) return;
    onDeployCombat();
  }, [canLaunchCombat, onDeployCombat]);

  // Keyboard navigation on World Map: W/S/Arrows select chapter, Enter/Space launch, Esc back
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (
        !e.repeat &&
        (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "KeyD" || e.code === "ArrowRight")
      ) {
        e.preventDefault();
        selectChapter(Math.min(CHAPTER_CATALOG.length, selectedChapterId + 1));
        return;
      }

      if (
        !e.repeat &&
        (e.code === "KeyS" ||
          e.code === "ArrowDown" ||
          e.code === "KeyA" ||
          e.code === "ArrowLeft")
      ) {
        e.preventDefault();
        selectChapter(Math.max(1, selectedChapterId - 1));
        return;
      }

      if (!e.repeat && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        handleLaunchClick();
        return;
      }

      if (!e.repeat && e.code === "Escape") {
        e.preventDefault();
        openLobby();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedChapterId, selectChapter, handleLaunchClick, openLobby]);

  const filledBossSegments = Math.min(6, Math.max(2, Math.ceil((selectedChapter.hazardLevel / 10) * 6)));

  return (
    <div className="relative w-full flex-1 flex flex-col justify-between overflow-y-auto lg:overflow-hidden lg:h-[calc(100vh-3.5rem)] bg-[#0B0E15] select-none">
      {/* Ambient Sci-Fi Background Grids */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 40% 50%, rgba(0, 240, 255, 0.22) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundSize: "32px 32px",
            backgroundImage:
              "linear-gradient(to right, rgba(0, 240, 255, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.16) 1px, transparent 1px)",
          }}
        />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00F0FF]/40 to-transparent" />
      </div>

      {/* ─── 1. TOP SUB-BAR ─── */}
      <div className="relative z-20 px-3 md:px-5 pt-2.5 pb-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Back to Lobby + Mode Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191B23]/95 hover:bg-[#272A32] border border-[#3B494B]/60 text-[#7DF4FF] font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{trans.worldMap.backToLobby}</span>
          </button>

          <div className="flex items-center gap-1 bg-[#191B23]/95 p-1 rounded-xl border border-[#272A32] shadow-lg backdrop-blur-md">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00F0FF] text-[#00363A] font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(0,240,255,0.4)]"
            >
              <Compass className="w-4 h-4" />
              <span>{trans.worldMap.campaignTab}</span>
            </button>

            <button
              type="button"
              disabled
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#849495] font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-wider opacity-60 cursor-not-allowed"
            >
              <InfinityIcon className="w-4 h-4" />
              <span>{trans.worldMap.endlessTab}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#272A32] text-[#849495] font-mono text-[9px] font-bold">
                CH 5
              </span>
            </button>

            <button
              type="button"
              disabled
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#849495] font-['Space_Grotesk'] text-xs font-semibold uppercase tracking-wider opacity-60 cursor-not-allowed"
            >
              <Skull className="w-4 h-4" />
              <span>{trans.worldMap.bossGauntletTab}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#272A32] text-[#849495] font-mono text-[9px] font-bold">
                CH 10
              </span>
            </button>
          </div>
        </div>

        {/* Right: Difficulty & Sector Net */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#272A32]/85 text-[#FFC080] border border-[#3B494B]/40 backdrop-blur-sm">
            <AlertTriangle className="w-4 h-4 text-[#FE9800]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
              {formatText(trans.worldMap.difficultyLabel, { level: selectedChapter.hazardLevel })}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FE9800] animate-ping" />
          </div>

          <div className="hidden 2xl:flex items-center gap-1.5 text-[#B9CACB] font-mono text-[11px] bg-[#191B23] px-3 py-1.5 rounded-lg border border-[#272A32]">
            <span className="text-[#00F0FF] font-bold">{trans.worldMap.sectorNetLabel}</span>
            <span>{trans.worldMap.regionsCount}</span>
            <span className="text-[#3B494B]">|</span>
            <span className="text-[#FFC080] font-bold">
              {formatText(trans.worldMap.clearedCount, { count: clearedCount })}
            </span>
            <span className="text-[#3B494B]">|</span>
            <span className="text-[#00F0FF] animate-pulse">
              {formatText(trans.worldMap.engagedLabel, { ch: unlockedChapter })}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. MAIN SECTOR MAP + DOSSIER SIDEBAR ─── */}
      <div className="relative z-10 flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden">
        {/* Interactive Sector Hologram Canvas */}
        <div className="relative flex-1 min-h-[380px] lg:min-h-0 overflow-x-auto lg:overflow-hidden flex items-center justify-center p-3">
          <div className="relative w-full min-w-[780px] lg:min-w-0 h-full max-w-[1400px] max-h-[680px]">
            {/* SVG Circuit Lines between 10 Chapters */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="clearedBeam" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#7DF4FF" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.85" />
                </linearGradient>
                <filter height="140%" id="neonGlow" width="140%" x="-20%" y="-20%">
                  <feGaussianBlur result="blur" stdDeviation="3" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {CHAPTER_CATALOG.slice(0, -1).map((fromCh, idx) => {
                const toCh = CHAPTER_CATALOG[idx + 1];
                const isBuiltRoute = toCh.id <= MAX_PLAYABLE_CHAPTER;
                const isUnlockedRoute = isBuiltRoute && toCh.id <= unlockedChapter;
                const isFrontierRoute =
                  isBuiltRoute && fromCh.id <= unlockedChapter && toCh.id === unlockedChapter + 1;

                return (
                  <line
                    key={`${fromCh.id}-${toCh.id}`}
                    x1={`${fromCh.mapPos.xPct}%`}
                    y1={`${fromCh.mapPos.yPct}%`}
                    x2={`${toCh.mapPos.xPct}%`}
                    y2={`${toCh.mapPos.yPct}%`}
                    stroke={
                      isUnlockedRoute
                        ? "url(#clearedBeam)"
                        : isFrontierRoute
                          ? "#3B494B"
                          : "#272A32"
                    }
                    strokeWidth={isUnlockedRoute ? 4 : 2}
                    strokeDasharray={isUnlockedRoute ? "6,4" : isFrontierRoute ? "4,6" : undefined}
                    filter={isUnlockedRoute ? "url(#neonGlow)" : undefined}
                  />
                );
              })}
            </svg>

            {/* 10 Chapter Nodes (Stage >= 3: Coming Soon) */}
            {CHAPTER_CATALOG.map((ch) => {
              const isComingSoon = ch.id > MAX_PLAYABLE_CHAPTER;
              const isCleared = !isComingSoon && ch.id < unlockedChapter;
              const isUnlockedActive = !isComingSoon && ch.id === unlockedChapter;
              const isLocked = !isComingSoon && ch.id > unlockedChapter;
              const isSelected = ch.id === selectedChapter.id;
              const isApex = ch.id === 10;

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => selectChapter(ch.id)}
                  style={{
                    left: `${ch.mapPos.xPct}%`,
                    top: `${ch.mapPos.yPct}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-300 focus:outline-none ${
                    isSelected
                      ? "z-30 scale-105"
                      : isCleared
                        ? "z-20 hover:scale-110"
                        : isComingSoon || isLocked
                          ? "z-10 opacity-45 hover:opacity-80"
                          : "z-20 hover:scale-110"
                  }`}
                >
                  <div className="relative flex flex-col items-center">
                    {/* Pulse aura for selected playable unlocked node */}
                    {isSelected && !isLocked && !isComingSoon && (
                      <>
                        <span className="absolute w-24 h-24 -top-3 rounded-full bg-[#00F0FF]/20 animate-ping pointer-events-none" />
                        <span className="absolute w-20 h-20 -top-1 rounded-full bg-[#00F0FF]/30 blur-md pointer-events-none" />
                      </>
                    )}

                    {/* Node Tile */}
                    <div
                      className={`relative flex items-center justify-center rounded-xl transition-all ${
                        isSelected
                          ? "w-16 h-16 md:w-20 md:h-20 bg-[#32353D] ring-2 ring-[#00F0FF]"
                          : isCleared
                            ? "w-14 h-14 md:w-16 md:h-16 bg-[#272A32]"
                            : isApex
                              ? "w-14 h-14 md:w-16 md:h-16 bg-[#93000A]/35"
                              : "w-12 h-12 md:w-14 md:h-14 bg-[#191B23]"
                      }`}
                      style={
                        isSelected && !isLocked && !isComingSoon
                          ? { boxShadow: "0 0 36px rgba(0, 240, 255, 0.55)" }
                          : isCleared
                            ? { boxShadow: "0 0 20px rgba(0, 240, 255, 0.2)" }
                            : isApex
                              ? { boxShadow: "0 0 20px rgba(147, 0, 10, 0.45)" }
                              : undefined
                      }
                    >
                      <ChapterNodeIcon
                        icon={ch.icon}
                        className={`${
                          isSelected && !isComingSoon
                            ? "w-8 h-8 text-[#00F0FF]"
                            : isCleared
                              ? "w-7 h-7 text-[#00DBE9]"
                              : isApex
                                ? "w-7 h-7 text-[#FFB4AB]"
                                : "w-6 h-6 text-[#849495]"
                        }`}
                      />

                      {/* Status Corner Badges */}
                      {isCleared && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#00F0FF] text-[#00363A] flex items-center justify-center font-bold shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}

                      {(isUnlockedActive || (isSelected && !isLocked && !isComingSoon)) && (
                        <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-[#FE9800] text-[#2C1600] font-mono text-[9px] uppercase font-bold tracking-wider shadow-md whitespace-nowrap">
                          {trans.worldMap.inCombatBadge}
                        </span>
                      )}

                      {isComingSoon && (
                        <span className="absolute -top-2.5 px-1.5 py-0.5 rounded-full bg-[#272A32] border border-[#FE9800]/50 text-[#FE9800] font-mono text-[8px] uppercase font-bold tracking-wider whitespace-nowrap">
                          {trans.worldMap.comingSoonBtn}
                        </span>
                      )}

                      {(isLocked || isComingSoon) && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1D1F27] border border-[#3B494B] flex items-center justify-center text-[#849495]">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Label below Node */}
                    <div
                      className={`mt-1.5 text-center ${
                        isSelected
                          ? "bg-[#0B0E15]/90 px-2.5 py-1 rounded-lg border border-[#00F0FF]/30 backdrop-blur-sm"
                          : ""
                      }`}
                    >
                      <span
                        className={`font-mono text-[10px] tracking-wider uppercase block font-bold ${
                          isSelected && !isComingSoon
                            ? "text-[#00F0FF]"
                            : isCleared
                              ? "text-[#00DBE9]"
                              : isComingSoon
                                ? "text-[#FE9800]/80"
                                : "text-[#849495]"
                        }`}
                      >
                        {isSelected && !isComingSoon
                          ? formatText(trans.worldMap.activeTag, {
                              ch: String(ch.id).padStart(2, "0"),
                            })
                          : ch.shortLabel}
                      </span>
                      <span
                        className={`font-['Space_Grotesk'] text-[11px] uppercase font-bold whitespace-nowrap ${
                          isComingSoon
                            ? "text-[#849495]"
                            : isSelected
                              ? "text-[#DBFCFF]"
                              : isCleared
                                ? "text-[#E1E2EC]"
                                : "text-[#B9CACB]"
                        }`}
                      >
                        {isComingSoon ? trans.worldMap.comingSoonBtn : ch.title}
                      </span>

                      {isCleared && (
                        <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[#FE9800]">
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                        </div>
                      )}

                      {isSelected && !isComingSoon && (
                        <span className="font-mono text-[9px] text-[#FFDCBD] block mt-0.5">
                          {formatText(trans.worldMap.wavesMeta, { waves: ch.waves })}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Compass & Coordinate Watermark (Bottom Left) */}
          <div className="hidden lg:flex absolute left-4 bottom-3 pointer-events-none flex-col gap-1 text-[#B9CACB]/70 font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>{trans.worldMap.gridWatermark}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[#00F0FF]/40" />
              <span>{trans.worldMap.scannerStatus}</span>
            </div>
          </div>
        </div>

        {/* ─── 3. RIGHT TACTICAL INTEL DOSSIER SIDEBAR ─── */}
        <aside className="w-full lg:w-[400px] xl:w-[420px] shrink-0 lg:h-full bg-[#191B23]/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-[#272A32] shadow-2xl flex flex-col justify-between min-h-0 z-20">
          {/* Scrollable Intel Body */}
          <div className="p-3.5 md:p-4 flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
            {/* Dossier Header */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
                  <span className="font-mono text-[10px] text-[#00F0FF] tracking-widest uppercase font-bold">
                    {trans.worldMap.dossierTitle}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#272A32] text-[#B9CACB] font-mono text-[10px] font-bold">
                  {selectedChapter.code}
                </span>
              </div>
              <div className="mt-1">
                <span className="font-mono text-[11px] text-[#FFC080] uppercase font-bold">
                  {formatText(trans.worldMap.chapterLabel, {
                    ch: String(selectedChapter.id).padStart(2, "0"),
                  })}
                </span>
                <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-[#DBFCFF] uppercase tracking-tight leading-tight">
                  {selectedChapter.title}
                </h2>
              </div>
            </div>

            {!isChapterBuilt ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-xl bg-[#131722] border border-[#272A32] p-6 text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#FE9800]/10 border border-[#FE9800]/35 flex items-center justify-center text-[#FE9800]">
                  <Lock className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FE9800]/15 border border-[#FE9800]/45 font-mono text-xs font-bold tracking-widest text-[#FE9800] uppercase">
                  {trans.worldMap.comingSoonBtn}
                </span>
              </div>
            ) : (
              <>
                {/* Chapter Thematic Hologram Card */}
                <div
                  className={`relative w-full h-32 rounded-xl overflow-hidden shadow-inner border border-[#3B494B]/40 bg-gradient-to-br ${selectedChapter.themeGradient} shrink-0`}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundSize: "20px 20px",
                      backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-25">
                    <ChapterNodeIcon icon={selectedChapter.icon} className="w-20 h-20 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E15] via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-[#0B0E15]/85 text-[#7DF4FF]">
                      {selectedChapter.biome}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#FE9800]/90 text-[#2C1600] font-bold">
                      {formatText(trans.worldMap.hazardLabel, {
                        lv: selectedChapter.hazardLevel,
                      })}
                    </span>
                  </div>
                </div>

                {/* Encounter Hostiles */}
                <div className="bg-[#1D1F27] p-2.5 rounded-xl flex flex-col gap-2 border border-[#272A32]">
                  <span className="font-mono text-[10px] text-[#B9CACB] uppercase tracking-wider font-bold">
                    {trans.worldMap.encounterHostiles}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                    {selectedChapter.hostiles.map((hostile, idx) => (
                      <div
                        key={hostile}
                        className="flex items-center gap-1.5 p-1.5 rounded bg-[#272A32] text-[#E1E2EC]"
                      >
                        {idx === 0 ? (
                          <Zap className="w-3.5 h-3.5 text-[#FFB4AB] shrink-0" />
                        ) : idx === 1 ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#FFC080] shrink-0" />
                        ) : idx === 2 ? (
                          <Bug className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-[#FFB2BD] shrink-0" />
                        )}
                        <span className="truncate">{hostile}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sector Boss Card */}
                <div className="bg-[#1D1F27] p-2.5 rounded-xl flex flex-col gap-2 border border-[#272A32] shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#FFB4AB]">
                      <Skull className="w-4 h-4" />
                      <span className="font-mono text-[11px] uppercase font-bold tracking-wider">
                        {trans.worldMap.sectorBoss}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#FFB4AB] font-extrabold">
                      HP {selectedChapter.boss.hp.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-lg bg-[#93000A]/30 border border-[#FFB4AB]/30 flex items-center justify-center shrink-0 text-[#FFB4AB]">
                      <Skull className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-['Space_Grotesk'] text-sm text-[#DBFCFF] font-bold truncate">
                        {selectedChapter.boss.name}
                      </span>
                      <span className="text-[11px] text-[#B9CACB] leading-snug line-clamp-2">
                        {selectedChapter.boss.description}
                      </span>
                    </div>
                  </div>
                  {/* Segmented Boss HP Bar */}
                  <div className="w-full flex gap-1 mt-0.5">
                    {Array.from({ length: 6 }).map((_, segIdx) => (
                      <div
                        key={segIdx}
                        className={`h-2 flex-1 rounded-sm ${
                          segIdx < filledBossSegments
                            ? "bg-[#FFB4AB] shadow-[0_0_8px_rgba(255,180,171,0.45)]"
                            : "bg-[#272A32]"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Sector Weapon Rewards */}
                <div className="bg-[#1D1F27] p-2.5 rounded-xl flex flex-col gap-2 border border-[#272A32]">
                  <span className="font-mono text-[10px] text-[#B9CACB] uppercase tracking-wider font-bold">
                    {trans.worldMap.weaponUnlocks}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedChapter.weapons.map((w, idx) => (
                      <div
                        key={w.name}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[#272A32]"
                      >
                        <Swords
                          className={`w-4 h-4 shrink-0 ${
                            idx === 0 ? "text-[#00F0FF]" : "text-[#FFB2BD]"
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-[10px] text-[#DBFCFF] font-bold uppercase truncate">
                            {w.name}
                          </span>
                          <span className="font-mono text-[9px] text-[#00DBE9]">{w.tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pinned Bottom Deploy Combat CTA */}
          <div className="p-3.5 bg-[#0B0E15]/85 backdrop-blur-md border-t border-[#272A32] flex flex-col gap-1.5 shrink-0">
            {!assetsReady && !assetsError && (
              <div className="w-full flex flex-col gap-1 mb-1">
                <div className="flex justify-between font-mono text-[10px] text-[#B9CACB]">
                  <span>{trans.lobby.loadingCdn}</span>
                  <span>{assetsPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#272A32] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00F0FF] rounded-full transition-all duration-300"
                    style={{ width: `${assetsPercent}%` }}
                  />
                </div>
              </div>
            )}

            {assetsError && (
              <div className="w-full py-1.5 px-2.5 rounded-lg bg-[#93000A]/30 border border-[#FFB4AB]/40 flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-[10px] text-[#FFB4AB] truncate">
                  ⚠ {assetsError}
                </span>
                <button
                  type="button"
                  onClick={() => void startBackgroundPreload()}
                  className="px-2 py-0.5 rounded bg-[#FFB4AB]/20 text-[#FFB4AB] font-mono text-[10px] font-bold uppercase shrink-0 cursor-pointer"
                >
                  {trans.lobby.retryBtn}
                </button>
              </div>
            )}

            <button
              type="button"
              id="deploy-combat-btn"
              disabled={!canLaunchCombat}
              onClick={handleLaunchClick}
              className={`w-full py-3.5 px-4 rounded-xl font-['Space_Grotesk'] text-lg font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all duration-200 ${
                canLaunchCombat
                  ? "bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#00363A] shadow-[0_0_28px_rgba(0,240,255,0.45)] hover:shadow-[0_0_38px_rgba(0,240,255,0.7)] active:scale-[0.98] cursor-pointer"
                  : "bg-[#272A32] text-[#849495] cursor-not-allowed"
              }`}
            >
              {!isChapterBuilt ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>{trans.worldMap.comingSoonBtn}</span>
                </>
              ) : isSelectedLocked ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>{trans.worldMap.chapterLockedBtn}</span>
                </>
              ) : !assetsReady ? (
                <span>{formatText(trans.lobby.deployLoading, { pct: assetsPercent })}</span>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{trans.worldMap.deployCombat}</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[#B9CACB] font-mono text-[10px] px-1">
              <span>{trans.worldMap.keyboardHint}</span>
              <span
                className={`font-bold ${
                  !isChapterBuilt || isSelectedLocked ? "text-[#FE9800]" : "text-[#00F0FF]"
                }`}
              >
                {!isChapterBuilt
                  ? trans.worldMap.comingSoonBtn
                  : isSelectedLocked
                    ? formatText(trans.worldMap.lockedHint, { prev: selectedChapter.id - 1 })
                    : trans.worldMap.readyToLaunch}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── 4. BOTTOM TACTICAL ARSENAL STRIP ─── */}
      <div className="relative z-20 bg-[#191B23]/95 border-t border-[#272A32] px-3 md:px-5 py-2 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] text-[#B9CACB] uppercase font-bold tracking-wider">
              {trans.worldMap.activeLoadout}
            </span>
            <span className="font-['Space_Grotesk'] text-xs text-[#E1E2EC] font-bold uppercase">
              {trans.worldMap.presetLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: MAX_LOADOUT_SLOTS }, (_, slotIdx) => {
              const slotId = loadoutIds[slotIdx];
              const slotWeapon = slotId ? getArmoryWeaponById(slotId) : null;
              const slotLevel = slotWeapon
                ? Math.max(1, saveData.weaponLevels[slotWeapon.id] ?? 1)
                : 1;
              const isSelectedStarter = Boolean(
                slotWeapon && saveData.equippedWeaponId === slotWeapon.id
              );
              const slotLabels = [
                trans.worldMap.slot1Label,
                trans.worldMap.slot2Label,
                trans.worldMap.slot3Label,
              ];

              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => {
                    if (slotWeapon) {
                      void selectActiveLoadoutWeapon(slotWeapon.id);
                    } else {
                      openArmory("ARSENAL");
                    }
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelectedStarter
                      ? "bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.22)]"
                      : "bg-[#272A32] border-transparent hover:border-[#3B494B]"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded bg-[#32353D] flex items-center justify-center ${
                      slotWeapon ? "text-[#00F0FF]" : "text-[#849495]"
                    }`}
                  >
                    {slotIdx === 0 ? (
                      <Crosshair className="w-4 h-4" />
                    ) : (
                      <Swords className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1 rounded font-mono text-[9px] font-bold ${
                          isSelectedStarter || slotIdx === 0
                            ? "bg-[#00F0FF]/20 text-[#00F0FF]"
                            : "bg-[#FFC080]/20 text-[#FFC080]"
                        }`}
                      >
                        {slotLabels[slotIdx]}
                      </span>
                      <span className="font-['Space_Grotesk'] text-[11px] text-[#DBFCFF] font-bold uppercase max-w-[110px] truncate">
                        {slotWeapon ? slotWeapon.name : trans.worldMap.emptySlot}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-[#B9CACB]">
                      {slotWeapon
                        ? `${slotWeapon.classLabel} · LV.${slotLevel}`
                        : `CH.${unlockedChapter}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Controls & Shortcuts */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openArmory("ARSENAL")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#272A32] hover:bg-[#32353D] border border-[#00F0FF]/40 text-[#00F0FF] font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{trans.worldMap.modifyLoadout}</span>
          </button>

          <div className="hidden xl:flex items-center gap-2 font-mono text-[10px] text-[#B9CACB]">
            <span className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#272A32]">
              <kbd className="text-[#E1E2EC] font-bold">W</kbd>
              <kbd className="text-[#E1E2EC] font-bold">S</kbd>
              <span>{trans.worldMap.selectChapterHint}</span>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#272A32]">
              <kbd className="text-[#E1E2EC] font-bold">ESC</kbd>
              <span>{trans.worldMap.backHint}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
