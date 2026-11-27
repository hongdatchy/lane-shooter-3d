"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, GitFork, Lock, Play, Radar, Rocket, ShieldCheck, Wrench } from "lucide-react";
import { useGameStore } from "@/state-manager/game-store";
import { LeaderboardEntryDTO } from "@/dto/GameDTO";
import { startBackgroundPreload } from "@/service/asset-preloader";
import {
  ARMORY_WEAPONS,
  ArmoryWeaponSpec,
  MAX_WEAPON_LEVEL,
  getArmoryWeaponById,
  getWeaponImageUrl,
} from "@/service/armory-catalog";
import { CHAPTER_CATALOG } from "@/service/chapter-catalog";
import { MAX_PLAYABLE_CHAPTER } from "@/service/weapon-service";
import { DEV_SPEED_OPTIONS, isLocalDevEnvironment } from "@/service/dev-mode-service";
import { TranslationData, formatText, getWeaponDisplayName, useTransClientSide } from "@/lang/useTransClientSide";
import {
  CLASS_BADGE_MAP,
  TelemetrySegmentBar,
  computeWeaponTelemetry,
  getClassLabel,
  getWeaponUnlockBadge,
} from "@/components/custom/game/WeaponInspectionPanel";

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
    <div className="flex flex-col py-1.5 px-2 rounded bg-[#272A32] items-center justify-center">
      <span className="font-mono text-[10px] text-[#B9CACB] uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-base font-bold leading-tight ${valueColor}`}>{value}</span>
      {sub && <span className="font-mono text-[9px] text-[#849495]">{sub}</span>}
    </div>
  );
}

function LobbyWeaponShowcase({
  weapon,
  level,
  chapterMet,
  isOwned,
  t,
  onOpen,
}: {
  weapon: ArmoryWeaponSpec;
  level: number;
  chapterMet: boolean;
  isOwned: boolean;
  t: TranslationData["armory"];
  onOpen?: () => void;
}) {
  const { clampedLevel, stats, rofRatio, dmgRatio } = computeWeaponTelemetry(
    weapon,
    level
  );
  const unlockBadge = getWeaponUnlockBadge(weapon, chapterMet, isOwned, t);

  return (
    <div
      className={`rounded-xl bg-[#131722] border border-[#272A32] p-2.5 flex flex-col gap-1.5 shrink-0 ${onOpen ? "cursor-pointer hover:border-[#00F0FF]/40 hover:bg-[#161b28] transition-colors" : ""}`}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => e.key === "Enter" && onOpen() : undefined}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#272A32]/80">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="font-['Space_Grotesk'] text-sm font-bold text-[#E1E2EC] uppercase truncate">
            {getWeaponDisplayName(weapon.id, weapon.name, t)}
          </h2>
          <span className="font-mono text-[9px] text-[#B9CACB] truncate hidden sm:inline">
            {getClassLabel(weapon.weaponClass, t)} · {weapon.classLabel}
          </span>
        </div>

        <span
          className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold uppercase shrink-0 ${
            CLASS_BADGE_MAP[weapon.weaponClass]
          }`}
        >
          {formatText(t.levelProgress, {
            lv: clampedLevel,
            max: MAX_WEAPON_LEVEL,
          })}
        </span>
      </div>

      {/* Compact Pedestal Stage */}
      <div className="relative rounded-lg bg-[#0A0D14] border border-[#272A32] overflow-hidden h-[116px] xl:h-[132px] flex items-center justify-center shrink-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${weapon.tracerHex}22 0%, transparent 70%)`,
          }}
        />
        <img
          src={getWeaponImageUrl(weapon, true)}
          alt={weapon.name}
          className="w-full h-full object-cover object-center"
        />

        <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between gap-2 z-10">
          <span className="px-1.5 py-0.5 rounded bg-[#131722]/90 border border-[#272A32] font-mono text-[8px] text-[#7DF4FF] uppercase truncate">
            {weapon.caliber}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase shrink-0 ${unlockBadge.className}`}
          >
            {unlockBadge.label}
          </span>
        </div>
      </div>

      {/* Compact 2-Col Telemetry */}
      <div className="rounded-lg bg-[#0E121B] border border-[#272A32] p-2 flex flex-col gap-1.5 shrink-0">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-[#B9CACB] uppercase truncate">{t.fireRateLabel}</span>
              <strong className="text-[#E1E2EC] shrink-0">
                {weapon.fireRateLabel ?? `${stats.fireRate}/s`}
              </strong>
            </div>
            <TelemetrySegmentBar ratio={rofRatio} accentHex="#00F0FF" />
          </div>
          <div>
            <div className="flex items-center justify-between font-mono text-[9px]">
              <span className="text-[#B9CACB] uppercase truncate">{t.damageLabel}</span>
              <strong className="text-[#E1E2EC] shrink-0">{stats.damage}</strong>
            </div>
            <TelemetrySegmentBar ratio={dmgRatio} accentHex="#FE9800" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#272A32]/80">
          <div className="flex flex-col bg-[#131722] rounded px-2 py-1 border border-[#272A32]">
            <span className="font-mono text-[8px] text-[#849495] uppercase truncate">
              {t.projectileLabel}
            </span>
            <span className="font-mono text-[9px] font-bold text-[#E1E2EC] uppercase truncate">
              {weapon.projectileLabel}
            </span>
          </div>
          <div className="flex flex-col bg-[#131722] rounded px-2 py-1 border border-[#272A32]">
            <span className="font-mono text-[8px] text-[#849495] uppercase truncate">
              {t.tracerLabel}
            </span>
            <div className="flex items-center gap-1 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: weapon.tracerHex }}
              />
              <span className="font-mono text-[9px] font-bold text-[#E1E2EC] uppercase truncate">
                {weapon.tracerLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MainMenu() {
  const openWorldMap = useGameStore((s) => s.openWorldMap);
  const openArmory = useGameStore((s) => s.openArmory);
  const postFirstRunGuideStep = useGameStore((s) => s.postFirstRunGuideStep);
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
  const mobileTab = useGameStore((s) => s.mobileLobbyTab);

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
    <div className="w-full flex-1 flex flex-col overflow-y-auto md:overflow-hidden md:max-h-[calc(100vh-3.5rem)] p-2 md:p-3 gap-2 select-none pb-16 md:pb-3">
      {postFirstRunGuideStep === "OPEN_ARMORY" && (
        <div
          className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[1px]"
          aria-hidden="true"
        />
      )}
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
        <div className={`col-span-12 md:col-span-4 flex flex-col bg-[#191B23] rounded-xl p-3 min-h-0 border border-[#272A32] gap-1.5${mobileTab !== "hero" ? " hidden md:flex" : ""}`}>
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
          <div className="relative min-h-[145px] max-h-[220px] md:flex-1 md:max-h-none rounded-lg overflow-hidden bg-[#0B0E15] flex items-center justify-center group shadow-inner">
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
              className="w-full h-full object-cover object-[50%_20%] group-hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBK1w-CrHDgTXVm1EE9RIsHWMwKEy_m10GuGE2KpVtouyCBI7tcRAvz5DY_njVbddr0YZPAqnDryPeqYBkmrojPcsgVZ27-eLbfwO3mSiHHmteAATJtXeKeexJf_VCMhWmJvIHSVYnlDxv9d-KsClvtrWWVTTQGB2MnGksN4oGA-IoNzBzlxEh5MjcZ39w0JJhJk7h4QG7D4rUY-L1RKRh-Dd8NRaHvutgBbNrDcDWw"
              alt="Cyber Mercenary"
              style={{ filter: "drop-shadow(0 0 24px rgba(0,240,255,0.25))" }}
            />
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

          {/* Account Action / Login CTA (guests only) */}
          {!player && profileLoaded && platformReady && platformCapabilities?.supportsLoginPrompt && (
            <div className="flex flex-col gap-1 shrink-0">
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

          <div
            className={
              postFirstRunGuideStep === "OPEN_ARMORY"
                ? "relative z-[70] rounded-xl ring-2 ring-[#00F0FF] shadow-[0_0_32px_rgba(0,240,255,0.55)]"
                : ""
            }
          >
            {postFirstRunGuideStep === "OPEN_ARMORY" && (
              <div className="mb-2 rounded-xl bg-[#0D1A26] border border-[#00F0FF] px-3 py-2 flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.35)]">
                <span className="text-[#00F0FF] animate-bounce text-sm shrink-0">👇</span>
                <span className="font-mono text-[11px] font-bold text-[#DBFCFF]">
                  {trans.lobby.guideOpenArmory}
                </span>
              </div>
            )}
            <LobbyWeaponShowcase
              weapon={equippedWeapon}
              level={equippedWeaponLevel}
              chapterMet={saveData.unlockedChapter >= equippedWeapon.unlockChapter}
              isOwned={saveData.unlockedWeaponIds.includes(equippedWeapon.id)}
              t={trans.armory}
              onOpen={() => openArmory("ARSENAL")}
            />
          </div>

          {authError && (
            <div className="px-2.5 py-1.5 rounded bg-[#93000A]/30 border border-[#FFB4AB]/40 font-mono text-[10px] text-[#FFB4AB] shrink-0">
              ⚠ {authError}
            </div>
          )}
        </div>

        {/* ══ COL 2: MISSION TERMINAL & 2 MODES ══ */}
        <div className={`col-span-12 md:col-span-5 flex flex-col justify-between bg-[#1D1F27] rounded-xl p-3 md:p-4 min-h-0 relative border border-[#272A32] gap-2.5${mobileTab !== "battle" ? " hidden md:flex" : ""}`}>
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
                  : `CHAPTER ${displayChapter.id} · ${displayChapter.biome}`}
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
                    className="w-full h-full mode-card-anim"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 25%, rgba(0, 240, 255, 0.35), transparent 65%)",
                      animation: "mode-glow-breathe 3.6s ease-in-out infinite",
                    }}
                  />
                  <svg
                    viewBox="0 0 200 220"
                    className="absolute inset-x-0 top-0 w-full h-[65%] opacity-45 group-hover:opacity-75 transition-opacity"
                    preserveAspectRatio="none"
                  >
                    {/* Outer road edges & center divider */}
                    <path d="M86,18 L36,205" stroke="#00F0FF" strokeWidth="1" strokeOpacity="0.45" />
                    <path d="M100,18 L100,205" stroke="#00DBE9" strokeWidth="1.2" strokeOpacity="0.55" />
                    <path d="M114,18 L164,205" stroke="#FE9800" strokeWidth="1" strokeOpacity="0.45" />

                    {/* Scrolling 3D perspective lane dashes */}
                    <path
                      d="M93,18 L68,205"
                      stroke="#00F0FF"
                      strokeWidth="1.5"
                      strokeDasharray="6 8"
                      className="mode-card-anim"
                      style={{ animation: "mode-lane-scroll 0.65s linear infinite" }}
                    />
                    <path
                      d="M107,18 L132,205"
                      stroke="#FE9800"
                      strokeWidth="1.5"
                      strokeDasharray="6 8"
                      className="mode-card-anim"
                      style={{ animation: "mode-lane-scroll 0.65s linear infinite" }}
                    />

                    {/* Approaching buff gates (scaled down road perspective) */}
                    {[
                      { anim: "mode-gate-left 3.2s cubic-bezier(0.55, 0.08, 0.85, 0.6) infinite", main: "#00F0FF", trim: "#DBFCFF", fillOpacity: 0.26 },
                      { anim: "mode-gate-right 3.2s cubic-bezier(0.55, 0.08, 0.85, 0.6) -1.6s infinite", main: "#FE9800", trim: "#FFDCBD", fillOpacity: 0.28 },
                    ].map((gate, idx) => (
                      <g
                        key={idx}
                        className="mode-card-anim"
                        style={{
                          transformBox: "view-box",
                          transformOrigin: "0px 0px",
                          animation: gate.anim,
                        }}
                      >
                        <rect
                          x="-22"
                          y="-6"
                          width="44"
                          height="12"
                          rx="2"
                          fill={gate.main}
                          fillOpacity={gate.fillOpacity}
                          stroke={gate.main}
                          strokeWidth="1.2"
                          strokeOpacity="0.85"
                        />
                        <line x1="-16" y1="0" x2="16" y2="0" stroke={gate.trim} strokeWidth="1.2" strokeOpacity="0.7" />
                      </g>
                    ))}

                    {/* Player runner weaving between lanes + rapid laser tracers */}
                    <g
                      className="mode-card-anim"
                      style={{
                        transformBox: "view-box",
                        transformOrigin: "0px 0px",
                        animation: "mode-runner-strafe 4.2s ease-in-out infinite",
                      }}
                    >
                      {[
                        { fill: "#7DF4FF", delay: "0s" },
                        { fill: "#00F0FF", delay: "-0.35s" },
                      ].map((bolt, idx) => (
                        <rect
                          key={idx}
                          x="-1.5"
                          y="-5"
                          width="3"
                          height="10"
                          rx="1.5"
                          fill={bolt.fill}
                          className="mode-card-anim"
                          style={{
                            transformBox: "view-box",
                            transformOrigin: "0px 0px",
                            animation: `mode-laser-bolt 0.7s linear ${bolt.delay} infinite`,
                          }}
                        />
                      ))}
                      <polygon
                        points="0,-9 -8,6 0,2 8,6"
                        fill="#00F0FF"
                        stroke="#DBFCFF"
                        strokeWidth="1"
                      />
                    </g>
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
                    className="w-full h-full mode-card-anim"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 35%, rgba(254, 152, 0, 0.35), transparent 65%)",
                      animation: "mode-glow-breathe 4.2s ease-in-out -1.5s infinite",
                    }}
                  />
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute inset-x-0 top-2 w-full h-[55%] opacity-40"
                  >
                    <defs>
                      <linearGradient id="survivorRadarSweep" x1="0%" y1="0%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#FE9800" stopOpacity="0" />
                        <stop offset="100%" stopColor="#FE9800" stopOpacity="0.38" />
                      </linearGradient>
                    </defs>

                    {/* Faint tactical crosshair axes */}
                    <line x1="30" y1="80" x2="170" y2="80" stroke="#FE9800" strokeWidth="0.7" strokeOpacity="0.22" />
                    <line x1="100" y1="10" x2="100" y2="150" stroke="#FE9800" strokeWidth="0.7" strokeOpacity="0.22" />

                    {/* Rotating tactical rings */}
                    <circle
                      cx="100"
                      cy="80"
                      r="65"
                      fill="none"
                      stroke="#FE9800"
                      strokeWidth="1.1"
                      strokeDasharray="4 4"
                      className="mode-card-anim"
                      style={{
                        transformBox: "view-box",
                        transformOrigin: "100px 80px",
                        animation: "mode-radar-spin 20s linear infinite",
                      }}
                    />
                    <circle
                      cx="100"
                      cy="80"
                      r="42"
                      fill="none"
                      stroke="#FFC080"
                      strokeWidth="1"
                      strokeDasharray="18 7 4 7"
                      className="mode-card-anim"
                      style={{
                        transformBox: "view-box",
                        transformOrigin: "100px 80px",
                        animation: "mode-radar-spin-reverse 14s linear infinite",
                      }}
                    />
                    <circle cx="100" cy="80" r="18" fill="none" stroke="#FE9800" strokeWidth="1.5" />

                    {/* Expanding sonar wave pulse */}
                    <circle
                      cx="100"
                      cy="80"
                      r="64"
                      fill="none"
                      stroke="#FE9800"
                      strokeWidth="1.4"
                      className="mode-card-anim"
                      style={{
                        transformBox: "view-box",
                        transformOrigin: "100px 80px",
                        animation: "mode-radar-pulse 2.8s ease-out infinite",
                      }}
                    />

                    {/* Rotating radar sweep wedge */}
                    <g
                      className="mode-card-anim"
                      style={{
                        transformBox: "view-box",
                        transformOrigin: "100px 80px",
                        animation: "mode-radar-spin 4s linear infinite",
                      }}
                    >
                      <path
                        d="M100,80 L100,15 A65,65 0 0,1 153.2,42.7 Z"
                        fill="url(#survivorRadarSweep)"
                      />
                      <line
                        x1="100"
                        y1="80"
                        x2="153.2"
                        y2="42.7"
                        stroke="#FE9800"
                        strokeWidth="1.3"
                        strokeOpacity="0.75"
                      />
                    </g>

                    {/* Hostile blips & survivor core */}
                    {[
                      { cx: 62, cy: 54, fill: "#FE9800", delay: "0s" },
                      { cx: 144, cy: 62, fill: "#FF6B4A", delay: "-0.8s" },
                      { cx: 132, cy: 118, fill: "#FE9800", delay: "-1.5s" },
                    ].map((blip, idx) => (
                      <circle
                        key={idx}
                        cx={blip.cx}
                        cy={blip.cy}
                        r="2.2"
                        fill={blip.fill}
                        className="mode-card-anim"
                        style={{
                          transformBox: "view-box",
                          transformOrigin: `${blip.cx}px ${blip.cy}px`,
                          animation: `mode-blip-ping 2.4s ease-in-out ${blip.delay} infinite`,
                        }}
                      />
                    ))}
                    <circle cx="100" cy="80" r="3" fill="#FFC080" />
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
        <div className={`col-span-12 md:col-span-3 flex flex-col bg-[#191B23] rounded-xl p-3 md:p-4 min-h-0 gap-3 border border-[#272A32]${mobileTab !== "intel" ? " hidden md:flex" : ""}`}>
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

            <div className="flex flex-col flex-1 min-h-0 max-h-[360px] md:max-h-none divide-y divide-[#3B494B]/20 overflow-y-auto pr-1 my-1 cyber-scroll">
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
    </div>);
}
