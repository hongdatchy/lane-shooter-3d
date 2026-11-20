"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Crown,
  Flame,
  Heart,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CameraMode } from "@/dto/GameDTO";
import { useGameStore } from "@/state-manager/game-store";
import { useAppStore } from "@/state-manager/app-store";
import { weaponService } from "@/service/weapon-service";
import { leaderboardService } from "@/service/leaderboard-service";
import { RAGE_CONFIG } from "@/service/game-constants";
import { gameInput } from "@/service/game-input";
import { soundService } from "@/service/sound-service";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";
import { LanguageSwitcher } from "@/components/custom/common/language-switcher";

interface GameHUDProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

const CAMERA_ORDER: CameraMode[] = ["TOP_DOWN", "THIRD_PERSON", "FREE_ORBIT"];

export function GameHUD({ containerRef }: GameHUDProps) {
  const {
    gameStatus,
    playerId,
    playerName,
    leaderboard,
    leaderboardSource,
    profileLoaded,
    score,
    highScore,
    hp,
    maxHp,
    wave,
    maxWaves,
    stageKills,
    stageTargetKills,
    kills,
    weaponIndex,
    overdriveLevel,
    crateHits,
    crateTargetHits,
    rewardBanner,
    rage,
    rageReady,
    rageActive,
    rageTimeLeft,
    icbmAiming,
    icbmPending,
    cameraMode,
    autoFire,
    isMuted,
    hydrateProfile,
    setPlayerName,
    setLeaderboardData,
    startGame,
    returnToMenu,
    togglePause,
    activateRage,
    setCameraMode,
    cycleCameraMode,
    toggleAutoFire,
    toggleMute,
    clearRewardBanner,
  } = useGameStore();

  const [nameDraft, setNameDraft] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const trans = useTransClientSide();
  const cameraModes = CAMERA_ORDER.map((mode) => ({
    mode,
    label: trans.camera[mode],
  }));

  const weapon = weaponService.getWeaponByIndex(weaponIndex);
  const nextWeapon = weaponService.getNextWeapon(weaponIndex, wave);
  const lockedNext = weaponService.getLockedNextWeapon(weaponIndex, wave);
  // Các vũ khí mở ở màn cuối (Màn 6) sẽ chỉ hiện khi bước vào Màn 6
  const visibleLockedNext = lockedNext && lockedNext.minStage < maxWaves ? lockedNext : null;
  const baseRate = weaponService.getEffectiveFireRate(weapon, overdriveLevel);
  const effectiveRate = (
    rageActive ? baseRate * RAGE_CONFIG.fireRateMultiplier : baseRate
  ).toFixed(1);
  const effectiveDamage = weaponService.getEffectiveDamage(weapon, overdriveLevel);
  const ragePercent = Math.round(Math.min(100, Math.max(0, (rage / RAGE_CONFIG.maxRage) * 100)));
  const needsNameInput = !playerName || isEditingName;

  useEffect(() => {
    hydrateProfile();
    const unsubscribe = leaderboardService.subscribeLeaderboard((entries, source) => {
      setLeaderboardData(entries, source);
    });
    return () => unsubscribe();
  }, [hydrateProfile, setLeaderboardData]);

  useEffect(() => {
    setNameDraft(playerName);
  }, [playerName]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!rewardBanner) return;
    const timer = setTimeout(() => {
      clearRewardBanner();
    }, 2600);
    return () => clearTimeout(timer);
  }, [rewardBanner, clearRewardBanner]);

  const enterFullscreen = () => {
    const el = containerRef?.current;
    if (el && typeof document !== "undefined" && !document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Nếu trình duyệt chặn Fullscreen API thì CSS fixed inset-0 vẫn mở rộng toàn viewport
      });
    }
  };

  const exitFullscreen = () => {
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  const handlePlayNow = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const chosenName = needsNameInput ? nameDraft.trim() : playerName.trim();
    if (!chosenName) {
      setNameError(trans.menu.emptyNameError);
      return;
    }
    setNameError("");
    if (needsNameInput) {
      setPlayerName(chosenName);
      setIsEditingName(false);
    }
    enterFullscreen();
    startGame();
  };

  const handleRestart = () => {
    enterFullscreen();
    startGame();
  };

  const handleBackToMenu = () => {
    exitFullscreen();
    returnToMenu();
  };

  // Lắng nghe phím điều khiển toàn cục ở DOM level (capture: true, bắt cả e.code và e.key)
  useEffect(() => {
    const keys = { left: false, right: false, fire: false };

    const syncKeys = () => {
      gameInput.left = keys.left;
      gameInput.right = keys.right;
      gameInput.fire = keys.fire;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      soundService.unlock();
      const key = (e.key || "").toLowerCase();

      if (e.code === "KeyA" || e.code === "ArrowLeft" || key === "a") {
        keys.left = true;
      }
      if (e.code === "KeyD" || e.code === "ArrowRight" || key === "d") {
        keys.right = true;
      }
      if (e.code === "Space" || key === " ") {
        if (useGameStore.getState().gameStatus === "PLAYING") {
          e.preventDefault();
          keys.fire = true;
        }
      }
      if (!e.repeat && (e.code === "KeyV" || key === "v")) {
        useGameStore.getState().cycleCameraMode();
      }
      if (
        !e.repeat &&
        (e.code === "KeyR" || e.code === "KeyE" || key === "r" || key === "e")
      ) {
        useGameStore.getState().activateRage();
      }
      if (!e.repeat && (e.code === "KeyP" || e.code === "Escape" || key === "p")) {
        useGameStore.getState().togglePause();
      }

      syncKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      if (e.code === "KeyA" || e.code === "ArrowLeft" || key === "a") {
        keys.left = false;
      }
      if (e.code === "KeyD" || e.code === "ArrowRight" || key === "d") {
        keys.right = false;
      }
      if (e.code === "Space" || key === " ") {
        keys.fire = false;
      }
      syncKeys();
    };

    const handleBlur = () => {
      keys.left = false;
      keys.right = false;
      keys.fire = false;
      syncKeys();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const isInMenu = gameStatus === "MENU";
  const currentCameraLabel = trans.camera[cameraMode] || cameraMode;
  const stageDisplay = wave >= maxWaves ? `${wave} / ${maxWaves}` : `${wave}`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex flex-col ${
        isInMenu ? "items-center justify-center p-3 sm:p-4" : "justify-between p-2 sm:p-4"
      } transition-shadow duration-300 ${
        rageActive
          ? "shadow-[inset_0_0_70px_rgba(245,158,11,0.32)] ring-2 ring-inset ring-amber-400/50"
          : ""
      }`}
    >
      {/* Thanh trạng thái trên cùng (chỉ hiện khi đã vào game) */}
      {!isInMenu && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
          {/* Trái: Tên + Máu + Màn + Điểm */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 sm:justify-start sm:gap-2.5 sm:px-3.5 sm:py-2 text-white shadow-lg backdrop-blur-md"
          >
            {playerName && (
              <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-700 pr-2.5 text-xs font-bold text-sky-300">
                <User className="h-3.5 w-3.5 text-sky-400" />
                <span className="max-w-[110px] truncate">{playerName}</span>
              </div>
            )}

            <div className="flex items-center gap-1 sm:gap-1.5 border-r border-slate-700 pr-2 sm:pr-3">
              {Array.from({ length: maxHp }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${
                    i < hp
                      ? "fill-rose-500 text-rose-500 scale-100"
                      : "text-slate-600 scale-90"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] sm:text-sm">
              <div>
                <span className="text-slate-400 mr-1">{trans.hud.stage}:</span>
                <span className="font-black text-sky-300">{stageDisplay}</span>
              </div>
              <div>
                <span className="hidden sm:inline text-slate-400 mr-1">
                  {trans.hud.stageKillsLong}
                </span>
                <span className="sm:hidden text-slate-400 mr-1">{trans.hud.stageKillsShort}</span>
                <span className="font-bold text-emerald-300">
                  {stageKills} / {stageTargetKills}
                </span>
              </div>
              <div>
                <span className="text-slate-400 mr-1">{trans.hud.score}</span>
                <span className="font-black text-amber-300">{score}</span>
              </div>
            </div>
          </motion.div>

          {/* Phải: Đổi góc Camera + Tự bắn + Âm thanh + Ngôn ngữ + Theme + Toàn màn hình + Tạm dừng */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex flex-wrap items-center justify-between gap-1.5 sm:justify-end sm:gap-2"
          >
            {/* Mobile: 1 nút gọn bấm chuyển góc camera */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.currentTarget.blur();
                cycleCameraMode();
              }}
              className="sm:hidden h-7 gap-1 border-slate-700 bg-slate-950/80 px-2 text-[11px] font-semibold text-sky-300 backdrop-blur-md hover:bg-slate-800 hover:text-white"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>{currentCameraLabel}</span>
            </Button>

            {/* Desktop/Tablet: thanh chọn 3 góc camera */}
            <div className="hidden sm:flex items-center rounded-xl border border-slate-700/80 bg-slate-950/80 p-1 shadow-lg backdrop-blur-md">
              <Camera className="mx-1.5 h-3.5 w-3.5 text-sky-400" />
              {cameraModes.map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setCameraMode(item.mode);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    cameraMode === item.mode
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleAutoFire();
                }}
                className={`h-7 sm:h-8 px-2 sm:px-3 border-slate-700 text-[11px] sm:text-xs font-semibold backdrop-blur-md ${
                  autoFire
                    ? "bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900/90 hover:text-emerald-200"
                    : "bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {autoFire ? trans.hud.autoFireOn : trans.hud.autoFireOff}
                </span>
                <span className="sm:hidden">
                  {autoFire ? trans.hud.autoFireShortOn : trans.hud.autoFireShortOff}
                </span>
              </Button>

              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={isMuted ? trans.hud.unmute : trans.hud.mute}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleMute();
                }}
                className={`h-7 w-7 sm:h-8 sm:w-8 border-slate-700 backdrop-blur-md ${
                  isMuted
                    ? "bg-rose-950/80 text-rose-300 hover:bg-rose-900/80 hover:text-rose-200"
                    : "bg-slate-950/80 text-sky-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </Button>

              <LanguageSwitcher variant="hud" />

              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={theme === "light" ? trans.app.toDark : trans.app.toLight}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleTheme();
                }}
                className="h-7 w-7 sm:h-8 sm:w-8 border-slate-700 bg-slate-950/80 text-amber-300 backdrop-blur-md hover:bg-slate-800 hover:text-amber-200"
              >
                {theme === "light" ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
              </Button>

              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={isFullscreen ? trans.hud.fullscreenExit : trans.hud.fullscreenEnter}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleFullscreen();
                }}
                className="h-7 w-7 sm:h-8 sm:w-8 border-slate-700 bg-slate-950/80 text-sky-300 backdrop-blur-md hover:bg-slate-800 hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>

              {(gameStatus === "PLAYING" || gameStatus === "PAUSED") && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    togglePause();
                  }}
                  className="h-7 sm:h-8 px-2 sm:px-3 border-slate-700 bg-slate-950/80 text-[11px] sm:text-xs font-semibold text-white backdrop-blur-md hover:bg-slate-800 hover:text-white"
                >
                  {gameStatus === "PAUSED" ? (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{trans.hud.resume}</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{trans.hud.pause}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Thông báo qua màn / nâng cấp vũ khí nổi giữa màn hình */}
      <AnimatePresence>
        {!isInMenu && rewardBanner && (
          <motion.div
            key={rewardBanner}
            initial={{ opacity: 0, scale: 0.85, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -12 }}
            className="mx-auto flex max-w-[92vw] items-center gap-1.5 sm:gap-2 rounded-full border border-amber-400/60 bg-slate-950/90 px-3 py-1.5 sm:px-4 sm:py-2 text-center text-xs sm:text-sm font-bold text-amber-300 shadow-xl backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-400" />
            <span>{rewardBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút Bật Nộ / Phóng Tên Lửa cỡ lớn nổi giữa màn hình khi đầy 100% Nộ */}
      <AnimatePresence>
        {gameStatus === "PLAYING" && rageReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="pointer-events-auto mx-auto my-auto flex flex-col items-center"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                activateRage();
              }}
              className="group flex animate-pulse items-center gap-2.5 rounded-2xl border-2 border-yellow-200 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-3.5 sm:px-8 sm:py-4 text-slate-950 shadow-[0_0_35px_rgba(245,158,11,0.7)] transition-transform hover:scale-105 active:scale-95 touch-none select-none"
            >
              <Flame className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 fill-yellow-200 text-slate-950" />
              <div className="text-left">
                <div className="text-base sm:text-xl font-black uppercase tracking-wide leading-none">
                  {weapon.id === "icbm"
                    ? trans.hud.rageButtonCenterIcbm
                    : trans.hud.rageButtonCenter}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs font-bold text-slate-900/90">
                  {trans.hud.rageCenterHint}
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Màn hình Start (Nhập tên + Chơi ngay + Bảng xếp hạng) / Pause / Game Over / Victory */}
      <AnimatePresence>
        {gameStatus !== "PLAYING" && (
          <motion.div
            key={gameStatus}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className={`pointer-events-auto mx-auto my-auto max-h-full w-full overflow-y-auto rounded-2xl border border-slate-700/90 bg-slate-950/95 p-5 sm:p-6 text-white shadow-2xl backdrop-blur-lg ${
              isInMenu ? "max-w-3xl text-left" : "max-w-md text-center"
            }`}
          >
            {gameStatus === "MENU" && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.05fr_1fr] md:items-stretch">
                {/* Cột trái: Thông tin game + Nhập tên / Tên đã lưu + Nút Chơi ngay */}
                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <Badge variant="info" className="mb-2.5 bg-sky-500/20 text-sky-300">
                      {trans.menu.badge}
                    </Badge>
                    <h2 className="text-2xl font-black tracking-tight">{trans.menu.title}</h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
                      {trans.menu.subtitle}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                      <div>
                        <p className="font-bold text-rose-400">
                          {trans.menu.cardChallengeTitle}
                        </p>
                        <p className="mt-0.5">{trans.menu.cardChallengeDesc}</p>
                      </div>
                      <div>
                        <p className="font-bold text-sky-400">
                          {trans.menu.cardWeaponsTitle}
                        </p>
                        <p className="mt-0.5">{trans.menu.cardWeaponsDesc}</p>
                      </div>
                      <div className="col-span-2 border-t border-slate-800 pt-2">
                        <p className="font-bold text-amber-300">{trans.menu.cardRageTitle}</p>
                        <p className="mt-0.5">
                          {formatText(trans.menu.cardRageDesc, {
                            count: RAGE_CONFIG.bulletCountMultiplier,
                            rate: RAGE_CONFIG.fireRateMultiplier,
                            sec: RAGE_CONFIG.durationSeconds,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Khu vực nhập tên / tên đã lưu + Chơi ngay ngay phía dưới */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                    {!profileLoaded ? (
                      <div className="py-5 text-center text-xs text-slate-400">
                        {trans.menu.loadingProfile}
                      </div>
                    ) : needsNameInput ? (
                      <form onSubmit={handlePlayNow} className="space-y-3">
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <label
                              htmlFor="player-name-input"
                              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300"
                            >
                              <User className="h-3.5 w-3.5" />
                              {trans.menu.enterNameLabel}
                            </label>
                            {isEditingName && playerName && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingName(false);
                                  setNameDraft(playerName);
                                  setNameError("");
                                }}
                                className="text-xs font-semibold text-slate-400 hover:text-white"
                              >
                                {trans.menu.cancel}
                              </button>
                            )}
                          </div>
                          <Input
                            id="player-name-input"
                            value={nameDraft}
                            maxLength={24}
                            autoFocus
                            onChange={(e) => {
                              setNameDraft(e.target.value);
                              if (nameError) setNameError("");
                            }}
                            placeholder={trans.menu.enterNamePlaceholder}
                            className="border-slate-700 bg-slate-950/90 text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
                          />
                          {nameError && (
                            <p className="mt-1.5 text-xs font-medium text-rose-400">
                              {nameError}
                            </p>
                          )}
                        </div>

                        <Button
                          type="submit"
                          size="lg"
                          className="w-full gap-2 bg-gradient-to-r from-blue-600 to-sky-500 font-black text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-sky-400"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          {trans.menu.playNow}
                        </Button>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5">
                          <div className="min-w-0">
                            <span className="block text-[11px] font-medium text-slate-400">
                              {trans.menu.playerLabel}
                            </span>
                            <div className="flex items-center gap-1.5 truncate text-base font-black text-sky-300">
                              <User className="h-4 w-4 shrink-0 text-sky-400" />
                              <span className="truncate">{playerName}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNameDraft(playerName);
                              setIsEditingName(true);
                              setNameError("");
                            }}
                            className="h-8 shrink-0 gap-1 border-slate-700 bg-slate-900 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
                          >
                            <Pencil className="h-3 w-3" />
                            {trans.menu.changeName}
                          </Button>
                        </div>

                        <Button
                          type="button"
                          size="lg"
                          onClick={() => handlePlayNow()}
                          className="w-full gap-2 bg-gradient-to-r from-blue-600 to-sky-500 font-black text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-sky-400"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          {trans.menu.playNow}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cột phải: Bảng xếp hạng (Firebase Firestore + fallback localStorage) */}
                <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/75 p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-black uppercase tracking-wide text-amber-300">
                        {trans.menu.leaderboardTitle}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          leaderboardSource === "firebase"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {leaderboardSource === "firebase" ? "Online" : "Local"}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                        {formatText(trans.menu.playersCount, {
                          count: leaderboard.length,
                        })}
                      </span>
                    </div>
                  </div>

                  {!profileLoaded ? (
                    <div className="flex flex-1 items-center justify-center py-8 text-xs text-slate-400">
                      {trans.menu.loadingBoard}
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                      <Trophy className="mb-2 h-8 w-8 text-slate-700" />
                      <p className="text-xs font-semibold text-slate-400">
                        {trans.menu.emptyBoardTitle}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {trans.menu.emptyBoardDesc}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                      {leaderboard.map((entry, idx) => {
                        const isCurrentPlayer = playerId
                          ? entry.id === playerId
                          : Boolean(playerName) &&
                            entry.playerName.trim().toLowerCase() ===
                              playerName.trim().toLowerCase();
                        const rankBadgeClass =
                          idx === 0
                            ? "bg-amber-400 text-slate-950"
                            : idx === 1
                              ? "bg-slate-300 text-slate-950"
                              : idx === 2
                                ? "bg-orange-400 text-slate-950"
                                : "bg-slate-800 text-slate-300";

                        return (
                          <div
                            key={entry.id}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                              isCurrentPlayer
                                ? "border-sky-500/70 bg-sky-950/50"
                                : "border-slate-800/90 bg-slate-950/60"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-black ${rankBadgeClass}`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-bold text-white">
                                    {entry.playerName}
                                  </span>
                                  {isCurrentPlayer && (
                                    <span className="rounded bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                                      {trans.menu.youBadge}
                                    </span>
                                  )}
                                  {entry.victory && (
                                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                      {trans.menu.clearBadge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {formatText(trans.menu.boardMeta, {
                                    wave: entry.wave,
                                    kills: entry.kills,
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className="font-black text-amber-300">
                                {entry.score.toLocaleString()}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                {trans.menu.pointsUnit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {gameStatus === "PAUSED" && (
              <>
                <h2 className="text-xl font-black">
                  {formatText(trans.modals.pausedTitle, { stage: stageDisplay })}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{trans.modals.pausedDesc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={togglePause}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-500"
                  >
                    <Play className="h-4 w-4" />
                    {trans.hud.resume}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRestart}
                    className="gap-2 border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {trans.modals.restartShort}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToMenu}
                    className="w-full gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    <Trophy className="h-4 w-4 text-amber-400" />
                    {trans.modals.backToMenu}
                  </Button>
                </div>
              </>
            )}

            {(gameStatus === "GAME_OVER" || gameStatus === "VICTORY") && (
              <>
                <div
                  className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    gameStatus === "VICTORY"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  <Trophy className="h-6 w-6" />
                </div>
                <h2
                  className={`text-2xl font-black ${
                    gameStatus === "VICTORY" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {gameStatus === "VICTORY"
                    ? formatText(trans.modals.victoryTitle, { max: maxWaves })
                    : trans.modals.gameOverTitle}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {playerName ? `${playerName} • ` : ""}
                  {gameStatus === "VICTORY"
                    ? trans.modals.victoryDesc
                    : formatText(trans.modals.gameOverDesc, { stage: stageDisplay })}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs">
                  <div>
                    <span className="block text-slate-400">{trans.modals.score}</span>
                    <span className="text-base font-black text-amber-300">{score}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">{trans.modals.highScore}</span>
                    <span className="text-base font-black text-sky-300">{highScore}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">{trans.modals.totalKills}</span>
                    <span className="text-base font-black text-emerald-300">{kills}</span>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleRestart}
                    className="w-full gap-2 bg-blue-600 font-bold hover:bg-blue-500"
                    size="lg"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {trans.modals.restartFull}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToMenu}
                    className="w-full gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    <Crown className="h-4 w-4 text-amber-400" />
                    {trans.modals.backToMenu}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thanh thông tin vũ khí & nút điều khiển bên dưới (chỉ hiện khi đã vào game) */}
      {!isInMenu && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
          {/* Thông số súng hiện tại & Tiến độ hòm bên phải */}
          <div className="pointer-events-auto flex w-full sm:w-auto items-center justify-between gap-2.5 sm:gap-3 rounded-xl border border-slate-700/80 bg-slate-950/80 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs text-white shadow-lg backdrop-blur-md">
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-sky-300">
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{trans.weapons[weapon.id]}</span>
                {weapon.splashRadius > 0 && (
                  <span className="shrink-0 rounded bg-rose-500/30 px-1.5 py-0.5 text-[10px] text-rose-200">
                    {trans.hud.splash}
                  </span>
                )}
                {overdriveLevel > 0 && (
                  <span className="shrink-0 rounded bg-purple-500/30 px-1.5 py-0.5 text-[10px] text-purple-200">
                    Lv.+{overdriveLevel}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                {trans.hud.damage}{" "}
                <strong className="text-amber-300">{effectiveDamage}</strong> •{" "}
                {trans.hud.fireRate}{" "}
                <strong className="text-emerald-300">{effectiveRate}</strong>
                {trans.hud.perSec}
                {rageActive && (
                  <span className="ml-1.5 font-bold text-amber-300">
                    • x{RAGE_CONFIG.bulletCountMultiplier} {trans.hud.bulletsMultiplier}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 border-l border-slate-700 pl-2.5 sm:pl-3 text-right sm:text-left">
              <div className="text-[10px] sm:text-[11px] text-slate-400">
                <span className="hidden sm:inline">
                  {nextWeapon
                    ? formatText(trans.hud.crateRightTo, {
                        name: trans.weapons[nextWeapon.id],
                      })
                    : visibleLockedNext
                      ? formatText(trans.hud.crateRightLocked, {
                          name: trans.weapons[visibleLockedNext.weapon.id],
                        })
                      : trans.hud.weaponStatus}
                </span>
                <span className="sm:hidden">
                  {nextWeapon
                    ? formatText(trans.hud.crateShortTo, {
                        name: trans.weapons[nextWeapon.id],
                      })
                    : visibleLockedNext
                      ? trans.weapons[visibleLockedNext.weapon.id]
                      : trans.hud.weaponStatusShort}
                </span>
              </div>
              <div className="font-black text-amber-300">
                {nextWeapon
                  ? formatText(trans.hud.shotsProgress, {
                      hits: crateHits,
                      target: crateTargetHits,
                    })
                  : visibleLockedNext
                    ? formatText(trans.hud.unlockAtStage, {
                        stage: visibleLockedNext.minStage,
                      })
                    : trans.hud.maxReached}
              </div>
            </div>
          </div>

          {/* Nút bấm cảm ứng / chuột trái-phải + Kích hoạt Nộ chủ động + Hướng dẫn phím */}
          {/* Mobile: [◀ Trái] — [Nộ ở giữa] — [▶ Phải]; Desktop: [Nộ] [Hướng dẫn] [◀][▶] */}
          <div className="pointer-events-auto flex w-full sm:w-auto items-center justify-between gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={trans.hud.moveLeft}
              onPointerDown={(e) => {
                e.preventDefault();
                gameInput.left = true;
              }}
              onPointerUp={() => {
                gameInput.left = false;
              }}
              onPointerLeave={() => {
                gameInput.left = false;
              }}
              onPointerCancel={() => {
                gameInput.left = false;
              }}
              className="order-1 sm:order-3 h-14 w-20 sm:h-10 sm:w-10 shrink-0 rounded-xl sm:rounded-md border-slate-700 bg-slate-950/85 text-white hover:bg-slate-800 hover:text-white active:scale-95 touch-none select-none"
            >
              <ChevronLeft className="h-8 w-8 sm:h-5 sm:w-5" />
            </Button>

            <div className="order-2 sm:order-1 flex flex-1 sm:flex-none items-center gap-1.5 min-w-0">
              {gameStatus === "PLAYING" && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!rageReady}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.blur();
                    activateRage();
                  }}
                  className={`h-14 sm:h-10 flex-1 sm:flex-none gap-1.5 px-3 text-xs sm:text-xs font-black rounded-xl sm:rounded-md transition-all touch-none select-none ${
                    rageActive || icbmAiming || icbmPending !== null
                      ? "border border-amber-400 bg-amber-950/90 text-amber-300 opacity-100"
                      : rageReady
                        ? "animate-pulse bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-orange-500"
                        : "border border-slate-700 bg-slate-950/80 text-slate-400"
                  }`}
                >
                  <Flame className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {icbmAiming
                      ? trans.hud.rageAimingShort
                      : icbmPending
                        ? trans.hud.rageMissileFlying
                        : rageActive
                          ? formatText(trans.hud.rageBulletRain, {
                              time: rageTimeLeft.toFixed(1),
                            })
                          : rageReady
                            ? weapon.id === "icbm"
                              ? trans.hud.rageButtonCenterIcbm
                              : trans.hud.rageButtonCenter
                            : formatText(trans.hud.ragePercent, { pct: ragePercent })}
                  </span>
                </Button>
              )}

              {!autoFire && gameStatus === "PLAYING" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    gameInput.fire = true;
                  }}
                  onPointerUp={() => {
                    gameInput.fire = false;
                  }}
                  onPointerLeave={() => {
                    gameInput.fire = false;
                  }}
                  onPointerCancel={() => {
                    gameInput.fire = false;
                  }}
                  className="h-14 sm:h-10 px-3 rounded-xl sm:rounded-md border-rose-500/70 bg-rose-950/85 text-xs font-black text-rose-200 hover:bg-rose-900 active:scale-95 touch-none select-none"
                >
                  {trans.hud.fireBtn}
                </Button>
              )}
            </div>

            <span className="hidden lg:inline-block lg:order-2 rounded-lg border border-slate-800 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md">
              <strong className="text-white">A / D</strong> {trans.hud.keyOr}{" "}
              <strong className="text-white">← / →</strong> {trans.hud.keyMove} •{" "}
              <strong className="text-amber-300">R</strong> {trans.hud.keyRage} •{" "}
              <strong className="text-white">V</strong> {trans.hud.keyCamera} •{" "}
              {cameraMode === "FREE_ORBIT"
                ? trans.hud.keyOrbitActive
                : trans.hud.keyOrbitHint}
            </span>

            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={trans.hud.moveRight}
              onPointerDown={(e) => {
                e.preventDefault();
                gameInput.right = true;
              }}
              onPointerUp={() => {
                gameInput.right = false;
              }}
              onPointerLeave={() => {
                gameInput.right = false;
              }}
              onPointerCancel={() => {
                gameInput.right = false;
              }}
              className="order-3 sm:order-4 h-14 w-20 sm:h-10 sm:w-10 shrink-0 rounded-xl sm:rounded-md border-slate-700 bg-slate-950/85 text-white hover:bg-slate-800 hover:text-white active:scale-95 touch-none select-none"
            >
              <ChevronRight className="h-8 w-8 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
