"use client";

import { useGameStore } from "@/state-manager/game-store";
import { LanguageSwitcher } from "@/components/custom/common/language-switcher";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";

export function GameHeader() {
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const highScore = useGameStore((s) => s.highScore);
  const score = useGameStore((s) => s.score);
  const wave = useGameStore((s) => s.wave);
  const maxWaves = useGameStore((s) => s.maxWaves);
  const gameStatus = useGameStore((s) => s.gameStatus);

  const platformTarget = useGameStore((s) => s.platformTarget);
  const platformCapabilities = useGameStore((s) => s.platformCapabilities);
  const platformError = useGameStore((s) => s.platformError);
  const profileLoaded = useGameStore((s) => s.profileLoaded);
  const player = useGameStore((s) => s.player);
  const authLoading = useGameStore((s) => s.authLoading);
  const loginWithPlatform = useGameStore((s) => s.loginWithPlatform);
  const logoutFromPlatform = useGameStore((s) => s.logoutFromPlatform);

  const trans = useTransClientSide();
  const displayScore = gameStatus === "PLAYING" ? score : highScore;

  return (
    <header className="shrink-0 w-full z-50 bg-[#0B0E15]/90 backdrop-blur-xl border-b border-[#1D1F27]">
      <div className="h-14 w-full px-4 flex items-center justify-between gap-3">
        {/* Logo + Active Portal Target */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#272A32] text-[#00F0FF] shrink-0"
            style={{ boxShadow: "0 0 16px rgba(0,240,255,0.25)" }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V18c0-.55.45-1 1-1s1 .45 1 1v1.93c-3.94-.49-7-3.85-7.44-7.93H7c.55 0 1 .45 1 1s-.45 1-1 1H4.07c.49 3.94 3.85 7 7.93 7.44zM10 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9.93 0H18c-.55 0-1-.45-1-1s.45-1 1-1h1.93c-.49-3.85-3.55-7-7.44-7.44V4c0 .55-.45 1-1 1s-1-.45-1-1V2.07C6.1 2.56 2.56 6.1 2.07 10H4c.55 0 1 .45 1 1s-.45 1-1 1H2.07C2.56 17.9 6.1 21.44 10 21.93V20c0-.55.45-1 1-1s1 .45 1 1v1.93c3.9-.49 7.44-4.03 7.93-7.93z" />
            </svg>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-['Space_Grotesk'] text-base md:text-lg font-bold tracking-wider text-[#00F0FF] uppercase truncate">
              LANE SHOOTER 3D
            </span>
            {platformTarget && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-[#272A32] border border-[#3B494B] font-mono text-[10px] text-[#7DF4FF] uppercase tracking-wider shrink-0">
                {platformCapabilities?.label ?? platformTarget}
              </span>
            )}
          </div>
        </div>

        {/* Right: stats + account + controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Stats pills */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#191B23] px-2 py-1 rounded-lg border border-[#272A32]">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#272A32]">
              <span className="text-[#FE9800] text-xs">🏅</span>
              <span className="font-mono text-[11px] font-bold text-[#FE9800]">
                {trans.header.best}
              </span>
              <span className="font-mono text-[12px] font-bold text-[#FE9800]">
                {displayScore > 0 ? displayScore.toLocaleString() : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#272A32]">
              <span className="text-[#7DF4FF] text-xs">⚡</span>
              <span className="font-mono text-[12px] font-bold text-[#7DF4FF]">
                {formatText(trans.header.waveBadge, { wave, max: maxWaves })}
              </span>
            </div>
          </div>

          {/* Account Pill / Login Button */}
          {platformError ? (
            <span className="hidden md:inline-flex items-center px-2 py-1 rounded bg-[#93000A]/40 border border-[#FFB4AB]/40 font-mono text-[10px] text-[#FFB4AB] uppercase">
              {trans.header.sdkError}
            </span>
          ) : !profileLoaded ? (
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded bg-[#272A32] font-mono text-[10px] text-[#B9CACB] uppercase">
              {trans.header.authLoading}
            </span>
          ) : player ? (
            <div className="flex items-center gap-1.5 bg-[#191B23] px-2 py-1 rounded-lg border border-[#00F0FF]/30">
              {player.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt={player.name}
                  className="w-5 h-5 rounded-full object-cover border border-[#00F0FF]/50"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] flex items-center justify-center font-mono text-[10px] font-bold">
                  {player.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="hidden sm:inline font-mono text-[11px] font-bold text-[#E1E2EC] max-w-[120px] truncate">
                {player.name}
              </span>
              {platformCapabilities?.supportsLogout && (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void logoutFromPlatform()}
                  className="ml-1 px-1.5 py-0.5 rounded bg-[#272A32] hover:bg-[#363941] font-mono text-[9px] text-[#B9CACB] hover:text-[#FFB4AB] uppercase transition-colors cursor-pointer"
                >
                  {trans.header.logout}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="hidden md:inline-flex px-2 py-1 rounded bg-[#272A32] font-mono text-[10px] text-[#FE9800] uppercase">
                {trans.header.guest}
              </span>
              {platformCapabilities?.supportsLoginPrompt && (
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void loginWithPlatform()}
                  className="px-2.5 py-1 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 font-mono text-[10px] font-bold text-[#00F0FF] uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? "..." : trans.header.login}
                </button>
              )}
            </div>
          )}

          {/* Language + Icon buttons */}
          <div className="flex items-center gap-1">
            <LanguageSwitcher variant="hud" />
            <button
              type="button"
              onClick={toggleMute}
              className="w-8 h-8 rounded bg-[#272A32] hover:bg-[#363941] flex items-center justify-center text-[#B9CACB] hover:text-[#E1E2EC] transition-colors"
              title={isMuted ? trans.hud.unmute : trans.hud.mute}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.22 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.76C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) {
                  void document.exitFullscreen();
                } else {
                  void document.documentElement.requestFullscreen();
                }
              }}
              className="w-8 h-8 rounded bg-[#272A32] hover:bg-[#363941] flex items-center justify-center text-[#B9CACB] hover:text-[#E1E2EC] transition-colors"
              title={trans.hud.fullscreenEnter}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default GameHeader;
