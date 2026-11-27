"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, GitFork, Lock, Play, Radar, Rocket, ShieldCheck, Wrench } from "lucide-react";
import { useGameStore } from "@/state-manager/game-store";
import { LeaderboardEntryDTO } from "@/dto/GameDTO";
import { startBackgroundPreload } from "@/service/asset-preloader";
import {
  ARMORY_WEAPONS,
  MAX_LOADOUT_SLOTS,
  MAX_WEAPON_LEVEL,
  getArmoryWeaponById,
} from "@/service/armory-catalog";
import { CHAPTER_CATALOG } from "@/service/chapter-catalog";
import { MAX_PLAYABLE_CHAPTER } from "@/service/weapon-service";
import { DEV_SPEED_OPTIONS, isLocalDevEnvironment } from "@/service/dev-mode-service";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRankColor(rank: number): string {
  if (rank === 1) return "text-[#FE9800]";
  if (rank === 2) return "text-[#7DF4FF]";
  if (rank === 3) return "text-[#FFB86F]";
  return "text-[#B9CACB]";
}

function getRankBg(rank: number): string {
  if (rank === 1) return "bg-[#FE9800]/20 border border-[#FE9800]/40";
  if (rank === 2) return "bg-[#00F0FF]/10 border border-[#00F0FF]/30";
  if (rank === 3) return "bg-[#FFB86F]/15 border border-[#FFB86F]/30";
  return "bg-[#1D1F27]";
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  rank,
  isMe,
  youBadge,
  ptsUnit,
  boardMetaTemplate,
}: {
  entry: LeaderboardEntryDTO;
  rank: number;
  isMe: boolean;
  youBadge: string;
  ptsUnit: string;
  boardMetaTemplate: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-2 py-1.5 transition-colors ${
        isMe
          ? "bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded"
          : rank <= 3
            ? "bg-[#1D1F27]/80"
            : "hover:bg-[#1D1F27]/60"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${getRankBg(rank)} ${getRankColor(rank)}`}
        >
          #{rank}
        </span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span
              className={`font-mono text-[11px] font-bold truncate leading-tight ${
                isMe ? "text-[#00F0FF]" : "text-[#E1E2EC]"
              }`}
            >
              {entry.playerName}
            </span>
            {isMe && (
              <span className="px-1 rounded bg-[#00F0FF] text-[#002022] font-mono text-[8px] font-bold uppercase shrink-0">
                {youBadge}
              </span>
            )}
          </div>
          <span className="font-mono text-[9px] text-[#B9CACB] leading-tight">
            {formatText(boardMetaTemplate, {
              chapter: entry.chapter,
              wave: entry.wave,
              kills: entry.kills,
            })}
          </span>
        </div>
      </div>
      <span className={`font-mono text-[11px] font-bold shrink-0 ${getRankColor(rank)}`}>
        {entry.score.toLocaleString()} {ptsUnit}
      </span>
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  valueColor = "text-[#00F0FF]",
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col p-2 rounded bg-[#272A32] items-center justify-center">
      <span className="font-mono text-[10px] text-[#B9CACB] uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-base font-bold leading-tight ${valueColor}`}>{value}</span>
      {sub && <span className="font-mono text-[9px] text-[#849495]">{sub}</span>}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MainMenu() {
  const openWorldMap = useGameStore((s) => s.openWorldMap);
  const openArmory = useGameStore((s) => s.openArmory);
  const assetsReady = useGameStore((s) => s.assetsReady);
  const assetsPercent = useGameStore((s) => s.assetsPercent);
  const assetsError = useGameStore((s) => s.assetsError);

  const platformTarget = useGameStore((s) => s.platformTarget);
  const platformCapabilities = useGameStore((s) => s.platformCapabilities);
  const platformReady = useGameStore((s) => s.platformReady);
  const platformError = useGameStore((s) => s.platformError);
  const profileLoaded = useGameStore((s) => s.profileLoaded);
  const player = useGameStore((s) => s.player);
  const authLoading = useGameStore((s) => s.authLoading);
  const authError = useGameStore((s) => s.authError);
  const loginWithPlatform = useGameStore((s) => s.loginWithPlatform);

  const saveData = useGameStore((s) => s.saveData);
  const saveError = useGameStore((s) => s.saveError);
  const highScore = useGameStore((s) => s.highScore);

  const devMode = useGameStore((s) => s.devMode);
  const devWeaponId = useGameStore((s) => s.devWeaponId);
  const devWeaponLevel = useGameStore((s) => s.devWeaponLevel);
  const devChapter = useGameStore((s) => s.devChapter);
  const devGameSpeed = useGameStore((s) => s.devGameSpeed);
  const devNarrowLane = useGameStore((s) => s.devNarrowLane);
  const toggleDevMode = useGameStore((s) => s.toggleDevMode);
  const setDevConfig = useGameStore((s) => s.setDevConfig);
  const startDevTestRun = useGameStore((s) => s.startDevTestRun);
  const setAssetsWaitingToStart = useGameStore((s) => s.setAssetsWaitingToStart);

  const [isLocalEnv, setIsLocalEnv] = useState(false);

  useEffect(() => {
    setIsLocalEnv(isLocalDevEnvironment());
  }, []);

  const leaderboard = useGameStore((s) => s.leaderboard);
  const leaderboardLoading = useGameStore((s) => s.leaderboardLoading);
  const leaderboardError = useGameStore((s) => s.leaderboardError);
  const scoreSyncError = useGameStore((s) => s.scoreSyncError);

  // Tạm ẩn phần Rewarded Ad theo yêu cầu
  // const adLoading = useGameStore((s) => s.adLoading);
  // const adError = useGameStore((s) => s.adError);
  // const rewardedAdClaimed = useGameStore((s) => s.rewardedAdClaimed);
  // const claimRewardedAdPerk = useGameStore((s) => s.claimRewardedAdPerk);

  const trans = useTransClientSide();

  const myRankIndex = player ? leaderboard.findIndex((e) => e.id === player.id) : -1;
  const myRankEntry = myRankIndex >= 0 ? leaderboard[myRankIndex] : null;
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

  const loadoutIds = saveData.equippedLoadoutIds;
  const equippedWeapon = getArmoryWeaponById(loadoutIds[0] ?? saveData.equippedWeaponId);
  const equippedWeaponLevel = Math.max(
    1,
    saveData.weaponLevels[equippedWeapon.id] ?? 1
  );
  const targetLobbyChapter = Math.min(
    MAX_PLAYABLE_CHAPTER,
    Math.max(1, saveData.unlockedChapter)
  );
  const displayChapter =
    CHAPTER_CATALOG.find((c) => c.id === targetLobbyChapter) ?? CHAPTER_CATALOG[0];

  const canOpenMap = platformReady && !platformError;
  const loginButtonLabel =
    platformTarget === "web" ? trans.lobby.loginGoogle : trans.lobby.loginCrazyGames;

  const handleDeploy = useCallback(() => {
    if (!canOpenMap) return;
    openWorldMap();
  }, [canOpenMap, openWorldMap]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "BUTTON" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      handleDeploy();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDeploy]);

  return (
    <div className="w-full flex-1 flex flex-col overflow-y-auto lg:overflow-hidden lg:max-h-[calc(100vh-3.5rem)] p-2 md:p-3 gap-2 select-none">
      {/* Platform / Save Fatal Error Bar (Zero Fallback) */}
      {(platformError || (player && (saveError || scoreSyncError))) && (
        <div className="px-3 py-2 rounded-lg bg-[#93000A]/35 border border-[#FFB4AB]/40 font-mono text-[11px] text-[#FFB4AB] shrink-0">
          {platformError && <div>⚠ PLATFORM ERROR: {platformError}</div>}
          {player && saveError && <div>⚠ SAVE DATA ERROR: {saveError}</div>}
          {player && scoreSyncError && (
            <div>⚠ LEADERBOARD SUBMIT ERROR: {scoreSyncError}</div>
          )}
        </div>
      )}
      {!player && !platformError && (saveError || scoreSyncError) && (
        <div className="px-3 py-2 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/45 font-mono text-[11px] text-[#E1FBFF] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span>
            {formatText(trans.modals.guestLoginToSave, {
              platform: platformTarget === "web" ? "Google" : "CrazyGames",
            })}
          </span>
          {(platformTarget === "crazygames" ||
            platformCapabilities?.supportsLoginPrompt) && (
            <button
              type="button"
              disabled={authLoading}
              onClick={() => void loginWithPlatform()}
              className="px-2.5 py-1 rounded bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#051018] font-mono text-[10px] font-bold uppercase cursor-pointer disabled:opacity-50"
            >
              {authLoading ? trans.lobby.authenticating : loginButtonLabel}
            </button>
          )}
        </div>
      )}

      {/* ─── MAIN 3-COLUMN DECK ─── */}
      <div className="grid grid-cols-12 gap-2 md:gap-3 flex-1 min-h-0 items-stretch">
        {/* ══ COL 1: HERO SHOWCASE ══ */}
        <div className="col-span-12 lg:col-span-4 flex flex-col bg-[#191B23] rounded-xl p-3 md:p-4 min-h-0 border border-[#272A32] gap-2">
          {/* Hero Header */}
          <div className="flex items-center justify-between pb-1 shrink-0">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-['Space_Grotesk'] text-[20px] font-bold text-[#00F0FF] tracking-wide uppercase leading-tight truncate">
                  {player ? player.name : trans.lobby.heroDefaultName}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase shrink-0 ${
                    player
                      ? "bg-[#00F0FF]/15 text-[#00F0FF]"
                      : "bg-[#FE9800]/15 text-[#FE9800]"
                  }`}
                >
                  {player ? trans.lobby.rankedBadge : trans.lobby.guestBadge}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#B9CACB]">
                {player
                  ? formatText(trans.lobby.accountSource, {
                      label: platformCapabilities?.label ?? platformTarget ?? "—",
                    })
                  : trans.lobby.guestModeDesc}
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="font-mono text-[11px] text-[#7DF4FF]">
                {trans.lobby.bestScoreLabel}
              </span>
              <span className="font-mono text-[22px] font-bold text-[#FE9800] leading-tight">
                {highScore > 0 ? highScore.toLocaleString() : "—"}
              </span>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative flex-1 min-h-[160px] max-h-[220px] lg:max-h-[300px] rounded-lg overflow-hidden bg-[#0B0E15] flex items-center justify-center group shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E15] via-[#0B0E15]/30 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#00F0FF]/10 via-transparent to-transparent pointer-events-none z-10" />
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none z-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, #00F0FF 0px, #00F0FF 1px, transparent 1px, transparent 4px)",
              }}
            />
            <img
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBK1w-CrHDgTXVm1EE9RIsHWMwKEy_m10GuGE2KpVtouyCBI7tcRAvz5DY_njVbddr0YZPAqnDryPeqYBkmrojPcsgVZ27-eLbfwO3mSiHHmteAATJtXeKeexJf_VCMhWmJvIHSVYnlDxv9d-KsClvtrWWVTTQGB2MnGksN4oGA-IoNzBzlxEh5MjcZ39w0JJhJk7h4QG7D4rUY-L1RKRh-Dd8NRaHvutgBbNrDcDWw"
              alt="Cyber Mercenary"
              style={{ filter: "drop-shadow(0 0 24px rgba(0,240,255,0.25))" }}
            />
            {/* Weapon badge */}
            <button
              type="button"
              onClick={() => openArmory("ARSENAL")}
              className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#32353D]/90 hover:bg-[#3A3E48] border border-[#3B494B] hover:border-[#00F0FF]/60 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
            >
              <span className="text-[#FE9800] text-sm">⚔</span>
              <div className="flex flex-col text-right">
                <span className="font-mono text-[10px] text-[#FE9800] tracking-wider uppercase max-w-[160px] truncate">
                  {equippedWeapon.name}
                </span>
                <span className="font-mono text-[9px] text-[#B9CACB]">
                  {formatText(trans.lobby.weaponLoadoutCount, {
                    count: loadoutIds.length,
                    max: MAX_LOADOUT_SLOTS,
                  })}{" "}
                  · LV.{equippedWeaponLevel}
                </span>
              </div>
            </button>
            {/* Bottom strip */}
            <div className="absolute bottom-2 inset-x-3 z-20 flex items-center justify-between px-2 py-1 rounded bg-[#272A32]/80 backdrop-blur-md">
              <span className="font-mono text-[10px] text-[#B9CACB]">
                {formatText(trans.lobby.killsStat, {
                  count: saveData.totalKills.toLocaleString(),
                })}
              </span>
              <span className="font-mono text-[10px] text-[#7DF4FF]">
                {formatText(trans.lobby.runsStat, { count: saveData.gamesPlayed })}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-1.5 shrink-0">
            <StatBlock
              label={trans.lobby.statGold}
              value={saveData.gold.toLocaleString()}
              sub={trans.lobby.statGoldSub}
              valueColor="text-[#FE9800]"
            />
            <StatBlock
              label={trans.lobby.statHp}
              value="5"
              sub={trans.lobby.statHpSub}
              valueColor="text-[#00F0FF]"
            />
            <StatBlock
              label={trans.lobby.statChapter}
              value={`${saveData.unlockedChapter}`}
              sub={trans.lobby.statChapterSub}
              valueColor="text-[#FFB2BD]"
            />
            <StatBlock
              label={trans.lobby.statGems}
              value={saveData.gems.toLocaleString()}
              sub={trans.lobby.statGemsSub}
              valueColor="text-[#7DF4FF]"
            />
          </div>

          {/* Account Action / Loadout CTA */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {!player && profileLoaded && platformReady && platformCapabilities?.supportsLoginPrompt && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void loginWithPlatform()}
                  className="w-full py-2 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-[#00F0FF]/50 cursor-pointer disabled:opacity-50"
                >
                  <span>🔐</span>
                  <span>{authLoading ? trans.lobby.authenticating : loginButtonLabel}</span>
                </button>
                <span className="font-mono text-[9px] text-[#B9CACB] text-center">
                  {platformCapabilities.supportsGuestPersistence
                    ? trans.lobby.guestHintCrazyGames
                    : trans.lobby.guestHintWeb}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => openArmory("ARSENAL")}
              className="w-full py-2 rounded-lg bg-[#272A32] hover:bg-[#363941] text-[#00F0FF] font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-[#3B494B] hover:border-[#00F0FF]/60 cursor-pointer"
            >
              <span>⚙</span>
              <span>{trans.lobby.customizeLoadout}</span>
            </button>
          </div>

          {authError && (
            <div className="px-2.5 py-1.5 rounded bg-[#93000A]/30 border border-[#FFB4AB]/40 font-mono text-[10px] text-[#FFB4AB] shrink-0">
              ⚠ {authError}
            </div>
          )}
        </div>

        {/* ══ COL 2: MISSION TERMINAL & 2 MODES ══ */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between bg-[#1D1F27] rounded-xl p-3 md:p-4 min-h-0 relative border border-[#272A32] gap-2.5">
          {/* Sector info bar */}
          <div className="flex items-center justify-between pb-1 shrink-0 gap-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[#00F0FF] text-lg shrink-0">📍</span>
                <span className="font-['Space_Grotesk'] text-xl md:text-2xl font-bold text-[#00F0FF] tracking-wide uppercase leading-tight truncate">
                  {displayChapter.id === 1 ? trans.lobby.sectorTitle : displayChapter.title}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#B9CACB] uppercase tracking-wider truncate">
                {displayChapter.id === 1
                  ? trans.lobby.sectorSubtitle
                  : `CHAPTER ${displayChapter.id} · WAVE 1 / ${displayChapter.waves} · ${displayChapter.biome}`}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#272A32] shrink-0">
              <span className="font-mono text-[10px] text-[#B9CACB] uppercase">
                {trans.lobby.progressLabel}
              </span>
              <span className="font-mono text-base md:text-lg font-bold text-[#FE9800]">
                WAVE 1 / {displayChapter.waves}
              </span>
            </div>
          </div>

          {/* 2 COMBAT MODES SECTION */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="font-mono text-[10px] text-[#7DF4FF] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping inline-block" />
                {trans.lobby.selectModeTitle}
              </span>
              <span className="font-mono text-[10px] text-[#B9CACB] uppercase">
                {trans.lobby.modesAvailable}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0">
              {/* CHẾ ĐỘ 1: CLASSIC RUNNER (2-Lane Truyền Thống) */}
              <button
                type="button"
                id="btnModeClassic"
                disabled={!canOpenMap}
                onClick={handleDeploy}
                className={`relative flex flex-col justify-between p-3 rounded-xl bg-[#191B23] border-2 overflow-hidden transition-all text-left group min-h-[210px] ${
                  canOpenMap
                    ? "border-[#00F0FF] shadow-[0_0_24px_rgba(0,240,255,0.22)] hover:shadow-[0_0_32px_rgba(0,240,255,0.42)] cursor-pointer active:translate-y-0.5"
                    : "border-[#3B494B] opacity-70 cursor-not-allowed"
                }`}
              >
                {/* Cyber 2-Lane tactical backdrop */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div
                    className="w-full h-full opacity-25"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 25%, rgba(0, 240, 255, 0.35), transparent 65%)",
                    }}
                  />
                  <svg
                    viewBox="0 0 200 220"
                    className="absolute inset-x-0 top-0 w-full h-[65%] opacity-30 group-hover:opacity-45 transition-opacity"
                    preserveAspectRatio="none"
                  >
                    <path d="M55,200 L85,20" stroke="#00F0FF" strokeWidth="1.5" strokeDasharray="6 6" />
                    <path d="M100,200 L100,20" stroke="#00DBE9" strokeWidth="1" />
                    <path d="M145,200 L115,20" stroke="#FE9800" strokeWidth="1.5" strokeDasharray="6 6" />
                    <rect x="64" y="65" width="24" height="12" rx="2" fill="#00F0FF" fillOpacity="0.3" />
                    <rect x="114" y="90" width="24" height="12" rx="2" fill="#FE9800" fillOpacity="0.4" />
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E15] via-[#0B0E15]/80 to-transparent" />
                </div>

                {/* Top Badges */}
                <div className="relative z-10 flex items-center justify-between shrink-0 w-full gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#00F0FF] text-[#00363A] font-mono text-[10px] font-bold tracking-wider flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00363A] animate-ping" />
                    {trans.lobby.modeSelectedBadge}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#32353D]/90 text-[#00DBE9] font-mono text-[10px] font-bold">
                    {trans.lobby.modeClassicTag}
                  </span>
                </div>

                {/* Bottom Content & CTA */}
                <div className="relative z-10 flex flex-col pt-3 w-full mt-auto">
                  <div className="flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-[#00F0FF] shrink-0" />
                    <span className="font-['Space_Grotesk'] text-[15px] md:text-base text-[#DBFCFF] uppercase font-bold leading-tight">
                      {trans.lobby.modeClassicTitle}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#FFDCBD] mt-0.5">
                    {trans.lobby.modeClassicSub}
                  </span>
                  <p className="text-[11px] text-[#B9CACB] leading-snug mt-1">
                    {trans.lobby.modeClassicDesc}
                  </p>
                  <div
                    className={`mt-3 w-full py-2 px-3 rounded-lg font-['Space_Grotesk'] text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all font-bold ${
                      canOpenMap
                        ? "bg-[#00F0FF] group-hover:bg-[#7DF4FF] text-[#00363A] shadow-[0_0_16px_rgba(0,240,255,0.35)]"
                        : "bg-[#272A32] text-[#849495]"
                    }`}
                  >
                    <Rocket className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {platformError
                        ? trans.lobby.deployPlatformError
                        : !platformReady
                          ? trans.lobby.deployInitSdk
                          : trans.lobby.modeClassicCta}
                    </span>
                  </div>
                </div>
              </button>

              {/* CHẾ ĐỘ 2: SURVIVOR WAVES (Đấu Trường 3D Sinh Tồn Zombie Waves) */}
              <div className="relative flex flex-col justify-between p-3 rounded-xl bg-[#191B23] border border-[#3B494B]/45 overflow-hidden text-left min-h-[210px] opacity-80">
                {/* 360° Arena backdrop */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div
                    className="w-full h-full opacity-20"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 35%, rgba(254, 152, 0, 0.35), transparent 65%)",
                    }}
                  />
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute inset-x-0 top-2 w-full h-[55%] opacity-25"
                  >
                    <circle cx="100" cy="80" r="65" fill="none" stroke="#FE9800" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx="100" cy="80" r="42" fill="none" stroke="#FFC080" strokeWidth="1" />
                    <circle cx="100" cy="80" r="18" fill="none" stroke="#FE9800" strokeWidth="1.5" />
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E15] via-[#0B0E15]/82 to-transparent" />
                </div>

                {/* Top Badges */}
                <div className="relative z-10 flex items-center justify-between shrink-0 w-full gap-1">
                  <span className="px-2 py-0.5 rounded bg-[#FE9800]/20 border border-[#FE9800]/50 text-[#FE9800] font-mono text-[10px] font-bold tracking-wider">
                    {trans.lobby.modeSurvivorBadge}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#32353D]/90 text-[#FFDCBD] font-mono text-[10px] font-bold">
                    {trans.lobby.modeSurvivorTag}
                  </span>
                </div>

                {/* Bottom Content & Coming Soon Status */}
                <div className="relative z-10 flex flex-col pt-3 w-full mt-auto">
                  <div className="flex items-center gap-1.5">
                    <Radar className="w-4 h-4 text-[#FFC080] shrink-0" />
                    <span className="font-['Space_Grotesk'] text-[15px] md:text-base text-[#FFC080] uppercase font-bold leading-tight">
                      {trans.lobby.modeSurvivorTitle}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#FFDCBD] mt-0.5">
                    {trans.lobby.modeSurvivorSub}
                  </span>
                  <p className="text-[11px] text-[#B9CACB] leading-snug mt-1">
                    {trans.lobby.modeSurvivorDesc}
                  </p>
                  <div className="mt-3 w-full py-2 px-3 rounded-lg bg-[#272A32] border border-[#3B494B]/60 text-[#FFC080]/85 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-bold">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>{trans.lobby.modeSurvivorBadge}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ACTION DECK: Asset Load Progress & Rewarded Ad */}
          <div className="flex flex-col gap-2 pt-1 shrink-0">
            {!assetsReady && !assetsError && (
              <div className="w-full flex flex-col gap-1">
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
              <div className="w-full py-2 px-3 rounded-lg bg-[#93000A]/30 border border-[#FFB4AB]/40 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-[#FFB4AB] truncate">
                  ⚠ {assetsError}
                </span>
                <button
                  type="button"
                  onClick={() => void startBackgroundPreload()}
                  className="px-2 py-0.5 rounded bg-[#FFB4AB]/20 text-[#FFB4AB] font-mono text-[10px] font-bold uppercase shrink-0 cursor-pointer hover:bg-[#FFB4AB]/30"
                >
                  {trans.lobby.retryBtn}
                </button>
              </div>
            )}

            {isLocalEnv && (
              <div className="rounded-xl border border-[#FE9800]/55 bg-[#0B0E15]/95 p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    id="btnToggleDevMode"
                    onClick={toggleDevMode}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      devMode
                        ? "bg-[#FE9800] text-[#1A1000] shadow-[0_0_16px_rgba(254,152,0,0.45)]"
                        : "bg-[#272A32] hover:bg-[#32353D] border border-[#FE9800]/45 text-[#FFC080]"
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {devMode ? "DEV TEST MODE: ĐANG BẬT" : "BẬT DEV TEST MODE (LOCAL)"}
                    </span>
                  </button>
                  <span className="font-mono text-[9px] text-[#849495] uppercase hidden sm:inline">
                    LOCAL SANDBOX • KHÔNG LƯU SAVE/BXH
                  </span>
                </div>

                {devMode && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-[#3B494B]/40">
                    <label className="flex flex-col gap-0.5 font-mono text-[9px] text-[#B9CACB]">
                      <span>MÀN TEST</span>
                      <select
                        value={devChapter}
                        onChange={(e) =>
                          setDevConfig({ devChapter: Number(e.target.value) })
                        }
                        className="h-7 px-1.5 rounded bg-[#1D1F27] border border-[#3B494B] text-[11px] text-[#DBFCFF] outline-none"
                      >
                        {Array.from({ length: MAX_PLAYABLE_CHAPTER }, (_, idx) => idx + 1).map(
                          (chId) => {
                            const chInfo = CHAPTER_CATALOG.find((c) => c.id === chId);
                            return (
                              <option key={chId} value={chId}>
                                Màn {chId}
                                {chInfo ? ` (${chInfo.waves}W)` : ""}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </label>

                    <label className="flex flex-col gap-0.5 font-mono text-[9px] text-[#B9CACB] col-span-1 sm:col-span-2">
                      <span>SÚNG TEST</span>
                      <select
                        value={devWeaponId}
                        onChange={(e) => setDevConfig({ devWeaponId: e.target.value })}
                        className="h-7 px-1.5 rounded bg-[#1D1F27] border border-[#3B494B] text-[11px] text-[#FFC080] outline-none"
                      >
                        {ARMORY_WEAPONS.map((w) => (
                          <option key={w.id} value={w.id}>
                            #{w.slotNumber} {w.name} (Ch.{w.unlockChapter} • {w.unlockCost}G)
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-0.5 font-mono text-[9px] text-[#B9CACB]">
                      <span>LEVEL SÚNG</span>
                      <select
                        value={devWeaponLevel}
                        onChange={(e) =>
                          setDevConfig({ devWeaponLevel: Number(e.target.value) })
                        }
                        className="h-7 px-1.5 rounded bg-[#1D1F27] border border-[#3B494B] text-[11px] text-[#7DF4FF] outline-none"
                      >
                        {Array.from({ length: MAX_WEAPON_LEVEL }, (_, i) => i + 1).map((lv) => (
                          <option key={lv} value={lv}>
                            Lv.{lv}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="col-span-2 flex flex-wrap items-center gap-1">
                      <span className="font-mono text-[9px] text-[#849495] mr-1 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-[#00F0FF]" /> TỐC ĐỘ:
                      </span>
                      {DEV_SPEED_OPTIONS.map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setDevConfig({ devGameSpeed: spd })}
                          className={`px-2 py-1 rounded font-mono text-[10px] font-bold cursor-pointer ${
                            devGameSpeed === spd
                              ? "bg-[#00F0FF] text-[#00363A]"
                              : "bg-[#1D1F27] text-[#B9CACB] border border-[#3B494B]"
                          }`}
                        >
                          x{spd}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={devGameSpeed}
                        onChange={(e) =>
                          setDevConfig({ devGameSpeed: Number(e.target.value) })
                        }
                        title="Tùy chỉnh tốc độ 1..20x"
                        className="w-11 h-6 px-1 rounded bg-[#1D1F27] border border-[#3B494B] font-mono text-[10px] font-bold text-[#7DF4FF] text-center outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setDevConfig({ devNarrowLane: !devNarrowLane })}
                        className={`ml-auto px-2 py-1 rounded font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer border ${
                          devNarrowLane
                            ? "bg-[#10B981]/20 border-[#10B981]/50 text-[#6EE7B7]"
                            : "bg-[#1D1F27] border-[#3B494B] text-[#849495]"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{devNarrowLane ? "GOM 1 LANE: ON" : "GOM 1 LANE: OFF"}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!assetsReady) {
                          setDevConfig({});
                          setAssetsWaitingToStart(true);
                          return;
                        }
                        startDevTestRun();
                      }}
                      className="col-span-2 h-8 px-3 rounded-lg bg-[#FE9800] hover:bg-[#FFB86F] text-[#1A1000] font-['Space_Grotesk'] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_16px_rgba(254,152,0,0.3)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {assetsReady
                          ? "CHẠY TEST NGAY (1 LANE • AUTO NỘ • MIỄN ĐẠN XA)"
                          : `ĐANG TẢI MODEL (${assetsPercent}%)...`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tạm ẩn nút Watch Ad for buff (comment lại để bật lại sau)
            <button
              type="button"
              id="btnAdPerk"
              disabled={
                !platformReady ||
                !platformCapabilities?.supportsAds ||
                adLoading ||
                rewardedAdClaimed
              }
              onClick={() => void claimRewardedAdPerk()}
              className={`w-full py-2.5 px-3 rounded-lg bg-[#272A32] text-[#FE9800] font-mono text-[11px] uppercase tracking-wider flex items-center justify-between transition-all group border border-[#3B494B] ${
                !platformCapabilities?.supportsAds || adLoading || rewardedAdClaimed
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-[#363941] cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#FE9800]/20 flex items-center justify-center text-[#FE9800]">
                  ▶
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[#FE9800] font-bold">
                    {!platformCapabilities?.supportsAds
                      ? trans.lobby.adDisabledWeb
                      : adLoading
                        ? trans.lobby.adLoading
                        : rewardedAdClaimed
                          ? trans.lobby.adClaimed
                          : trans.lobby.adTitle}
                  </span>
                  <span className="text-[9px] text-[#B9CACB] lowercase">
                    {adError ? adError : trans.lobby.adSubtitle}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#0B0E15] text-[#FFB86F]">
                <span>⚡</span>
                <span className="font-mono text-[10px] font-bold">
                  {rewardedAdClaimed ? trans.lobby.adBadgeClaimed : trans.lobby.adBadgeBoost}
                </span>
              </div>
            </button>
            */}
          </div>
        </div>

        {/* ══ COL 3: INTEL & LEADERBOARD ══ */}
        <div className="col-span-12 lg:col-span-3 flex flex-col bg-[#191B23] rounded-xl p-3 md:p-4 min-h-0 gap-3 border border-[#272A32]">
          {/* Tactical Contracts */}
          <div className="shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#3B494B]/40">
              <div className="flex items-center gap-1.5">
                <span className="text-[#FE9800] text-sm">📋</span>
                <span className="font-['Space_Grotesk'] text-[13px] font-bold text-[#00F0FF] uppercase tracking-wide">
                  {trans.lobby.contractsTitle}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#B9CACB]">
                {trans.lobby.contractsChapter}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="p-2 rounded-lg bg-[#1D1F27] flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#E1E2EC] uppercase">
                    {trans.lobby.contractKillTitle}
                  </span>
                  <span className="text-[#FE9800] font-bold">
                    {Math.min(50, saveData.totalKills)} / 50
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#272A32] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FE9800] rounded-full"
                    style={{ width: `${Math.min(100, (saveData.totalKills / 50) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[9px] text-[#B9CACB]">
                  <span>
                    {formatText(trans.lobby.contractProgress, {
                      pct: Math.min(100, Math.round((saveData.totalKills / 50) * 100)),
                    })}
                  </span>
                  <span className="text-[#7DF4FF] font-bold">
                    +1,200 {trans.lobby.statGold}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Global Leaderboard */}
          <div className="flex flex-col flex-1 min-h-0 bg-[#1D1F27] rounded-lg p-2 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#3B494B]/40 shrink-0 px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[#FE9800] text-sm">🏆</span>
                <div className="flex flex-col">
                  <span className="font-['Space_Grotesk'] text-[13px] font-bold text-[#00F0FF] uppercase tracking-wide">
                    {trans.menu.leaderboardTitle}
                  </span>
                  <span className="font-mono text-[8px] text-[#B9CACB] uppercase tracking-wider">
                    {trans.lobby.leaderboardSub} ({leaderboard.length})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#272A32] border border-[#3B494B]/40">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    leaderboardError
                      ? "bg-[#FFB4AB]"
                      : leaderboardLoading
                        ? "bg-[#FE9800] animate-pulse"
                        : "bg-[#00F0FF] animate-pulse"
                  }`}
                />
                <span
                  className={`font-mono text-[9px] tracking-wider uppercase font-bold ${
                    leaderboardError ? "text-[#FFB4AB]" : "text-[#7DF4FF]"
                  }`}
                >
                  {leaderboardError
                    ? trans.lobby.statusError
                    : leaderboardLoading
                      ? trans.lobby.statusSync
                      : trans.lobby.statusOnline}
                </span>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-h-0 max-h-[360px] lg:max-h-none divide-y divide-[#3B494B]/20 overflow-y-auto pr-1 my-1">
              {leaderboardError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-3 text-center gap-1">
                  <span className="font-mono text-[11px] font-bold text-[#FFB4AB]">
                    {trans.lobby.firestoreError}
                  </span>
                  <span className="font-mono text-[10px] text-[#FFB4AB]/80 break-words">
                    {leaderboardError}
                  </span>
                </div>
              ) : leaderboardLoading ? (
                <div className="flex-1 flex items-center justify-center font-mono text-[11px] text-[#B9CACB]">
                  {trans.menu.loadingBoard}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="flex-1 flex items-center justify-center font-mono text-[11px] text-[#849495]">
                  {trans.menu.emptyBoardTitle}
                </div>
              ) : (
                leaderboard.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    rank={i + 1}
                    isMe={Boolean(player) && entry.id === player?.id}
                    youBadge={trans.menu.youBadge}
                    ptsUnit={trans.lobby.ptsUnit}
                    boardMetaTemplate={trans.lobby.boardMeta}
                  />
                ))
              )}
            </div>

            {!player && platformReady ? (
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[#FE9800]/10 border border-[#FE9800]/30 shrink-0">
                <span className="font-mono text-[9px] text-[#FE9800]">
                  {trans.lobby.guestBoardWarning}
                </span>
                {(platformTarget === "crazygames" ||
                  platformCapabilities?.supportsLoginPrompt) && (
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => void loginWithPlatform()}
                    className="px-2 py-0.5 rounded bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#002022] font-mono text-[9px] font-bold uppercase cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? "..." : loginButtonLabel}
                  </button>
                )}
              </div>
            ) : (
              myRankEntry &&
              myRank &&
              myRank > 5 && (
                <div className="flex items-center justify-between px-2 py-1 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/30 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-[#00F0FF] text-[#002022] flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                      #{myRank}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[11px] text-[#00F0FF] font-bold truncate leading-tight">
                          {myRankEntry.playerName}
                        </span>
                        <span className="px-1 rounded bg-[#00F0FF] text-[#002022] font-mono text-[8px] font-bold uppercase">
                          {trans.menu.youBadge}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-[#7DF4FF] leading-tight">
                        {formatText(trans.lobby.boardMeta, {
                          chapter: myRankEntry.chapter,
                          wave: myRankEntry.wave,
                          kills: myRankEntry.kills,
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#00F0FF] font-bold shrink-0">
                    {myRankEntry.score.toLocaleString()} {trans.lobby.ptsUnit}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM TACTICAL BAR ─── */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-[#0B0E15] px-4 py-2 rounded-xl shrink-0 gap-2 border border-[#1D1F27]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
          <span className="text-[#7DF4FF] uppercase tracking-wider font-bold flex items-center gap-1.5">
            ⌨ {trans.lobby.shortcutsTitle}
          </span>
          {[
            { keys: ["A", "D"], label: trans.lobby.shortcutMove },
            { keys: ["SPACE"], label: trans.lobby.shortcutFire },
            { keys: ["R"], label: trans.lobby.shortcutRage, color: "text-[#FFB4AB]" },
            { keys: ["V"], label: trans.lobby.shortcutCamera, color: "text-[#FE9800]" },
            { keys: ["ESC"], label: trans.lobby.shortcutPause },
          ].map(({ keys, label, color = "text-[#00F0FF]" }) => (
            <div key={label} className="flex items-center gap-1 text-[#E1E2EC]">
              {keys.map((k) => (
                <kbd
                  key={k}
                  className={`px-1.5 py-0.5 rounded bg-[#272A32] font-bold ${color}`}
                >
                  {k}
                </kbd>
              ))}
              <span className="text-[#B9CACB] ml-1">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-[#7DF4FF]">
            <span>🌐</span>
            <span>
              {trans.lobby.portalLabel} {(platformTarget ?? "...").toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#FE9800]">
            <span
              className={`w-2 h-2 rounded-full ${
                platformError ? "bg-[#FFB4AB]" : "bg-[#FE9800] animate-pulse"
              }`}
            />
            <span>
              {platformError
                ? trans.header.sdkError
                : platformReady
                  ? trans.lobby.sdkReady
                  : trans.lobby.sdkBooting}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
