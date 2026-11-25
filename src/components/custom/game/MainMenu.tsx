"use client";

import { useGameStore } from "@/state-manager/game-store";
import { LeaderboardEntryDTO } from "@/dto/GameDTO";
import { startBackgroundPreload } from "@/service/asset-preloader";
import { MAX_LOADOUT_SLOTS, getArmoryWeaponById } from "@/service/armory-catalog";
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
  winTag,
  ptsUnit,
  boardMetaTemplate,
}: {
  entry: LeaderboardEntryDTO;
  rank: number;
  isMe: boolean;
  youBadge: string;
  winTag: string;
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
            {formatText(boardMetaTemplate, { wave: entry.wave, kills: entry.kills })}
            {entry.victory ? ` • ✓ ${winTag}` : ""}
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

  const leaderboard = useGameStore((s) => s.leaderboard);
  const leaderboardLoading = useGameStore((s) => s.leaderboardLoading);
  const leaderboardError = useGameStore((s) => s.leaderboardError);
  const scoreSyncError = useGameStore((s) => s.scoreSyncError);

  const adLoading = useGameStore((s) => s.adLoading);
  const adError = useGameStore((s) => s.adError);
  const rewardedAdClaimed = useGameStore((s) => s.rewardedAdClaimed);
  const claimRewardedAdPerk = useGameStore((s) => s.claimRewardedAdPerk);

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

  const canOpenMap = platformReady && !platformError;
  const loginButtonLabel =
    platformTarget === "web" ? trans.lobby.loginGoogle : trans.lobby.loginCrazyGames;

  function handleDeploy() {
    if (!canOpenMap) return;
    openWorldMap();
  }

  return (
    <div className="w-full flex-1 flex flex-col overflow-y-auto lg:overflow-hidden lg:max-h-[calc(100vh-3.5rem)] p-2 md:p-3 gap-2 select-none">
      {/* Platform / Save Fatal Error Bar (Zero Fallback) */}
      {(platformError || saveError || scoreSyncError) && (
        <div className="px-3 py-2 rounded-lg bg-[#93000A]/35 border border-[#FFB4AB]/40 font-mono text-[11px] text-[#FFB4AB] shrink-0">
          {platformError && <div>⚠ PLATFORM ERROR: {platformError}</div>}
          {saveError && <div>⚠ SAVE DATA ERROR: {saveError}</div>}
          {scoreSyncError && <div>⚠ LEADERBOARD SUBMIT ERROR: {scoreSyncError}</div>}
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

        {/* ══ COL 2: MISSION TERMINAL ══ */}
        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between bg-[#1D1F27] rounded-xl p-3 md:p-4 min-h-0 relative border border-[#272A32]">
          {/* Sector info */}
          <div className="flex items-center justify-between pb-2 shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[#00F0FF] text-lg">📍</span>
                <span className="font-['Space_Grotesk'] text-xl md:text-2xl font-bold text-[#00F0FF] tracking-wide uppercase leading-tight">
                  {trans.lobby.sectorTitle}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#B9CACB] uppercase tracking-wider">
                {trans.lobby.sectorSubtitle}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#272A32]">
              <span className="font-mono text-[10px] text-[#B9CACB] uppercase">
                {trans.lobby.startLabel}
              </span>
              <span className="font-mono text-lg font-bold text-[#FE9800]">
                {formatText(trans.lobby.waveLabel, { wave: 1 })}
              </span>
            </div>
          </div>

          {/* Dual-Lane preview */}
          <div className="flex-1 min-h-[160px] my-2 flex flex-col justify-between bg-[#191B23] rounded-lg p-3 relative overflow-hidden border border-[#272A32]/60">
            <div className="flex items-center justify-between px-1 mb-2 shrink-0">
              <span className="font-mono text-[10px] text-[#7DF4FF] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping inline-block" />
                {trans.lobby.radarTitle}
              </span>
              <span className="font-mono text-[10px] text-[#B9CACB] uppercase">
                {trans.lobby.distanceBoss}
              </span>
            </div>

            {/* Two lanes */}
            <div className="grid grid-cols-2 gap-2 flex-1">
              {/* Lane 1: Defense */}
              <div className="flex flex-col justify-between p-2.5 rounded-lg bg-[#272A32]/90 relative overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <span className="px-2 py-0.5 rounded bg-[#93000A]/80 text-[#FFD9DD] font-mono text-[10px] tracking-wider">
                    {trans.lobby.lane1Badge}
                  </span>
                  <span className="text-[#FFB4AB] text-sm">⚠</span>
                </div>
                <div className="flex flex-col my-auto py-2">
                  <span className="font-['Space_Grotesk'] text-sm font-bold text-[#E1E2EC] uppercase">
                    {trans.lobby.lane1Title}
                  </span>
                  <span className="font-mono text-[10px] text-[#FFB2BD]">
                    {trans.lobby.lane1Desc}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="font-mono text-[10px] text-[#B9CACB]">
                      {trans.lobby.threatLabel}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#FFB4AB]/20 text-[#FFB4AB] font-mono text-[10px] uppercase font-bold tracking-wider">
                      {trans.lobby.threatHigh}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1.5 shrink-0 bg-[#1D1F27]/60 px-2 py-1 rounded">
                  <span className="font-mono text-[9px] text-[#B9CACB]">
                    {trans.lobby.survivalReward}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#FE9800]">
                    +600 {trans.lobby.statGold}
                  </span>
                </div>
              </div>

              {/* Lane 2: Arsenal */}
              <div className="flex flex-col justify-between p-2.5 rounded-lg bg-[#272A32]/90 relative overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <span className="px-2 py-0.5 rounded bg-[#006970] text-[#7DF4FF] font-mono text-[10px] tracking-wider">
                    {trans.lobby.lane2Badge}
                  </span>
                  <span className="text-[#00F0FF] text-sm">⬆</span>
                </div>
                <div className="flex flex-col my-auto py-2">
                  <span className="font-['Space_Grotesk'] text-sm font-bold text-[#00F0FF] uppercase">
                    {trans.lobby.lane2Title}
                  </span>
                  <div className="flex items-center gap-1 mt-1 font-mono text-[10px] text-[#7DF4FF] flex-wrap">
                    <span>{trans.lobby.lane2Sub}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="font-mono text-[10px] text-[#B9CACB]">
                      {trans.lobby.firepowerLabel}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-mono text-[10px] uppercase font-bold tracking-wider">
                      {trans.lobby.firepowerValue}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1.5 shrink-0 bg-[#1D1F27]/60 px-2 py-1 rounded">
                  <span className="font-mono text-[9px] text-[#B9CACB]">
                    {trans.lobby.buffMultiplier}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#00F0FF]">
                    {trans.lobby.buffFirerate}
                  </span>
                </div>
              </div>
            </div>

            {/* Lane switch indicator */}
            <div className="flex items-center justify-between pt-2 px-1 text-[#B9CACB] font-mono text-[10px] shrink-0">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#32353D] text-[#00F0FF] font-bold">A</kbd>
                {trans.lobby.steerLeft}
              </span>
              <span className="text-[#FE9800] uppercase">{trans.lobby.switchSpeed}</span>
              <span className="flex items-center gap-1">
                {trans.lobby.steerRight}
                <kbd className="px-1.5 py-0.5 rounded bg-[#32353D] text-[#00F0FF] font-bold">D</kbd>
              </span>
            </div>
          </div>

          {/* Environment modifier */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#191B23] shrink-0 border border-[#272A32]/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#93000A]/40 flex items-center justify-center text-[#FFB4AB]">
                ☁
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-[#FFD9DD] tracking-wider uppercase">
                  {trans.lobby.modifierTitle}
                </span>
                <span className="font-mono text-[9px] text-[#B9CACB]">
                  {trans.lobby.modifierDesc}
                </span>
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-[#32353D] font-mono text-[11px] text-[#FFB4AB]">
              {trans.lobby.modifierTag}
            </span>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col gap-2 pt-2 shrink-0">
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

            {/* DEPLOY BUTTON -> Opens World Map / Sector Select */}
            <button
              type="button"
              id="btnDeploy"
              disabled={!canOpenMap}
              onClick={handleDeploy}
              className={`relative w-full py-4 rounded-xl font-['Space_Grotesk'] text-xl md:text-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] active:translate-y-0.5 ${
                canOpenMap
                  ? "bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#002022] shadow-[0_0_28px_rgba(0,240,255,0.4)] hover:shadow-[0_0_40px_rgba(0,240,255,0.65)] cursor-pointer"
                  : "bg-[#272A32] text-[#849495] cursor-not-allowed"
              }`}
            >
              <span className={canOpenMap ? "animate-bounce" : ""}>⚡</span>
              <span>
                {platformError
                  ? trans.lobby.deployPlatformError
                  : !platformReady
                    ? trans.lobby.deployInitSdk
                    : player
                      ? trans.lobby.deployPlayRanked
                      : trans.lobby.deployPlayGuest}
              </span>
              <span>🎮</span>
            </button>

            {/* Watch Ad for buff */}
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
                    winTag={trans.lobby.winTag}
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
                {platformCapabilities?.supportsLoginPrompt && (
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => void loginWithPlatform()}
                    className="px-2 py-0.5 rounded bg-[#00F0FF] text-[#002022] font-mono text-[9px] font-bold uppercase cursor-pointer"
                  >
                    {trans.header.login}
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
