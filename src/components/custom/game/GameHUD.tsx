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
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
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
import { CameraMode } from "@/dto/GameDTO";
import { useGameStore } from "@/state-manager/game-store";
import { useAppStore } from "@/state-manager/app-store";
import { weaponService } from "@/service/weapon-service";
import { RAGE_CONFIG } from "@/service/game-constants";
import { gameInput } from "@/service/game-input";
import { soundService } from "@/service/sound-service";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";
import { LanguageSwitcher } from "@/components/custom/common/language-switcher";
import { startBackgroundPreload } from "@/service/asset-preloader";
import {
  MAX_LOADOUT_SLOTS,
  getArmoryWeaponById,
  getWeaponImageUrl,
} from "@/service/armory-catalog";
import { getRageSkillSpec } from "@/service/rage-catalog";

interface GameHUDProps {
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

const CAMERA_ORDER: CameraMode[] = ["TOP_DOWN", "THIRD_PERSON", "FREE_ORBIT"];

export function GameHUD({ containerRef }: GameHUDProps) {
  const {
    gameStatus,
    player,
    playerName,
    platformTarget,
    platformCapabilities,
    authLoading,
    authError,
    scoreSyncError,
    score,
    highScore,
    lastGoldEarned,
    hp,
    maxHp,
    activeChapter,
    wave,
    maxWaves,
    stageKills,
    stageTargetKills,
    kills,
    combatLoadoutIds,
    activeLoadoutSlot,
    saveData,
    overdriveLevel,
    rightLaneGates,
    activeBuffs,
    rewardBanner,
    rage,
    rageReady,
    rageActive,
    rageTimeLeft,
    activeRageWeaponId,
    icbmAiming,
    icbmPending,
    cameraMode,
    autoFire,
    isMuted,
    assetsReady,
    assetsLoadedCount,
    assetsTotal,
    assetsPercent,
    assetsError,
    assetsWaitingToStart,
    setAssetsWaitingToStart,
    loginWithPlatform,
    startGame,
    returnToMenu,
    togglePause,
    activateRage,
    switchCombatWeaponSlot,
    cycleCombatWeapon,
    setCameraMode,
    cycleCameraMode,
    toggleAutoFire,
    toggleMute,
    clearRewardBanner,
  } = useGameStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [delayedResultReady, setDelayedResultReady] = useState(false);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const trans = useTransClientSide();
  const cameraModes = CAMERA_ORDER.map((mode) => ({
    mode,
    label: trans.camera[mode],
  }));

  const loadoutWeapons = combatLoadoutIds.map((id) =>
    weaponService.resolveCombatWeapon(id, saveData.weaponLevels[id] ?? 1)
  );
  const weapon =
    loadoutWeapons[activeLoadoutSlot] ??
    loadoutWeapons[0] ??
    weaponService.resolveCombatWeapon("pistol", 1);
  const readySkillName = getArmoryWeaponById(weapon.id)?.rageSkillName ?? weapon.name;
  const ragingWeaponId = activeRageWeaponId ?? weapon.id;
  const ragingSkillName =
    getArmoryWeaponById(ragingWeaponId)?.rageSkillName ?? readySkillName;
  const activeRageSpec = rageActive ? getRageSkillSpec(ragingWeaponId) : null;
  const baseRate = weaponService.getEffectiveFireRate(weapon, overdriveLevel);
  const effectiveRate = (
    activeRageSpec?.overrideRps
      ? activeRageSpec.overrideRps
      : baseRate * (activeRageSpec?.fireRateMultiplier ?? 1)
  ).toFixed(1);
  const effectiveDamage = weaponService.getEffectiveDamage(weapon, overdriveLevel);
  const ragePercent = Math.round(Math.min(100, Math.max(0, (rage / RAGE_CONFIG.maxRage) * 100)));
  const remainingGatesCount = rightLaneGates.filter((g) => !g.claimed).length;
  const activeBuffChips: Array<{ label: string; color: string }> = [];
  if (activeBuffs.clones > 0) {
    activeBuffChips.push({
      label: formatText(trans.buffs.cloneChip, { count: activeBuffs.clones }),
      color: "#06b6d4",
    });
  }
  if (activeBuffs.shieldCharges > 0) {
    activeBuffChips.push({
      label: formatText(trans.buffs.shieldChip, { count: activeBuffs.shieldCharges }),
      color: "#bae6fd",
    });
  }
  if (activeBuffs.piercing) {
    activeBuffChips.push({ label: trans.buffs.piercingChip, color: "#eab308" });
  }
  if (activeBuffs.multishot) {
    activeBuffChips.push({ label: trans.buffs.multishotChip, color: "#f97316" });
  }
  if (activeBuffs.ricochet) {
    activeBuffChips.push({ label: trans.buffs.ricochetChip, color: "#a855f7" });
  }
  if (activeBuffs.explosive) {
    activeBuffChips.push({ label: trans.buffs.explosiveChip, color: "#ef4444" });
  }
  if (activeBuffs.turretTimeLeft > 0) {
    activeBuffChips.push({
      label: formatText(trans.buffs.turretChip, {
        sec: activeBuffs.turretTimeLeft.toFixed(1),
      }),
      color: "#f59e0b",
    });
  }
  if (activeBuffs.freezeTimeLeft > 0) {
    activeBuffChips.push({
      label: formatText(trans.buffs.freezeChip, {
        sec: activeBuffs.freezeTimeLeft.toFixed(1),
      }),
      color: "#38bdf8",
    });
  }
  if (activeBuffs.magnetTimeLeft > 0) {
    activeBuffChips.push({
      label: formatText(trans.buffs.magnetChip, {
        sec: activeBuffs.magnetTimeLeft.toFixed(1),
      }),
      color: "#fde047",
    });
  }

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

  // Chờ 3s sau khi Win/Thua để người chơi xem nốt hiệu ứng nổ & hạ gục trước khi hiện popup
  useEffect(() => {
    if (gameStatus !== "GAME_OVER" && gameStatus !== "VICTORY") {
      setDelayedResultReady(false);
      return;
    }
    setDelayedResultReady(false);
    const timer = setTimeout(() => {
      setDelayedResultReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [gameStatus]);

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

  const handleRestart = () => {
    if (!assetsReady) {
      setAssetsWaitingToStart(true);
      return;
    }
    enterFullscreen();
    startGame();
  };

  // Tự động vào game nếu người chơi đã bấm "Chơi ngay" trong lúc đang chờ tải tài nguyên
  useEffect(() => {
    if (assetsWaitingToStart && assetsReady) {
      setAssetsWaitingToStart(false);
      enterFullscreen();
      startGame();
    }
  }, [assetsWaitingToStart, assetsReady]);

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
      if (!e.repeat && (e.code === "Digit1" || key === "1")) {
        useGameStore.getState().switchCombatWeaponSlot(0);
      }
      if (!e.repeat && (e.code === "Digit2" || key === "2")) {
        useGameStore.getState().switchCombatWeaponSlot(1);
      }
      if (!e.repeat && (e.code === "Digit3" || key === "3")) {
        useGameStore.getState().switchCombatWeaponSlot(2);
      }
      if (!e.repeat && (e.code === "KeyQ" || key === "q")) {
        useGameStore.getState().cycleCombatWeapon();
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

    let lastWheelAt = 0;
    const handleWheel = (e: WheelEvent) => {
      const curr = useGameStore.getState();
      if (curr.gameStatus !== "PLAYING" || curr.cameraMode === "FREE_ORBIT") {
        return;
      }
      if (Math.abs(e.deltaY) < 4) return;
      const now = performance.now();
      if (now - lastWheelAt < 90) return;
      lastWheelAt = now;
      curr.cycleCombatWeapon(e.deltaY > 0 ? 1 : -1);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("wheel", handleWheel);
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
                <span className="font-black text-sky-300">
                  CH.{activeChapter} · {stageDisplay}/{maxWaves}
                </span>
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
                    : formatText(trans.hud.rageSkillButton, { skill: readySkillName })}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs font-bold text-slate-900/90">
                  {trans.hud.rageCenterHint}
                </div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thông báo chờ 3s khi vừa Thắng/Thua để xem nốt hiệu ứng 3D */}
      <AnimatePresence>
        {(gameStatus === "GAME_OVER" || gameStatus === "VICTORY") && !delayedResultReady && (
          <motion.div
            key="result-delay-banner"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`mx-auto my-auto flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm sm:text-base font-black shadow-2xl backdrop-blur-md ${
              gameStatus === "VICTORY"
                ? "border-emerald-400/70 bg-emerald-950/90 text-emerald-300"
                : "border-rose-400/70 bg-rose-950/90 text-rose-300"
            }`}
          >
            <Trophy className="h-5 w-5 shrink-0" />
            <span>
              {gameStatus === "VICTORY"
                ? trans.hud.rageResultDelayVictory
                : trans.hud.rageResultDelayDefeat}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Pause / Game Over / Victory (Game Over & Victory đợi 3s) */}
      <AnimatePresence>
        {(gameStatus === "PAUSED" ||
          ((gameStatus === "GAME_OVER" || gameStatus === "VICTORY") &&
            delayedResultReady)) && (
          <motion.div
            key={gameStatus}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            className="pointer-events-auto mx-auto my-auto max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700/90 bg-slate-950/95 p-5 sm:p-6 text-center text-white shadow-2xl backdrop-blur-lg"
          >
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
                  {playerName ? `${playerName} • ` : `${trans.modals.guestLabel} • `}
                  {gameStatus === "VICTORY"
                    ? trans.modals.victoryDesc
                    : formatText(trans.modals.gameOverDesc, { stage: stageDisplay })}
                </p>
                {!player && (
                  <div className="mt-3 rounded-xl border border-cyan-400/45 bg-cyan-950/35 px-3.5 py-2.5 text-xs text-cyan-100 flex flex-col gap-2 text-left">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 shrink-0 text-cyan-300 mt-0.5" />
                      <span>
                        {formatText(trans.modals.guestLoginToSave, {
                          platform:
                            platformTarget === "web" ? "Google" : "CrazyGames",
                        })}
                      </span>
                    </div>
                    {(platformTarget === "crazygames" ||
                      platformCapabilities?.supportsLoginPrompt) && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={authLoading}
                        onClick={() => void loginWithPlatform()}
                        className="w-full bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 uppercase tracking-wider"
                      >
                        {authLoading
                          ? trans.lobby.authenticating
                          : platformTarget === "web"
                            ? trans.lobby.loginGoogle
                            : trans.lobby.loginCrazyGames}
                      </Button>
                    )}
                    {authError && (
                      <div className="rounded-md border border-amber-500/40 bg-amber-950/40 px-2.5 py-1.5 text-[11px] text-amber-200">
                        {authError}
                      </div>
                    )}
                  </div>
                )}
                {player && scoreSyncError && (
                  <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-300 text-left">
                    {formatText(trans.modals.scoreSyncFailed, { err: scoreSyncError })}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs">
                  <div>
                    <span className="block text-slate-400">{trans.modals.score}</span>
                    <span className="text-base font-black text-amber-300">{score}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">{trans.modals.highScore}</span>
                    <span className="text-base font-black text-sky-300">{highScore}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">{trans.modals.goldEarned}</span>
                    <span className="text-base font-black text-yellow-300">
                      +{lastGoldEarned}
                    </span>
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
          {/* Thanh chọn 3 súng mang theo + Thông số súng hiện tại & Tiến độ Overdrive làn phải */}
          <div className="pointer-events-auto flex w-full sm:w-auto flex-col gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/85 px-2.5 py-2 sm:px-3.5 text-[11px] sm:text-xs text-white shadow-lg backdrop-blur-md">
            {/* 3 ô chọn súng kiểu Alien Shooter ([1][2][3] / Q / lăn chuột) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: MAX_LOADOUT_SLOTS }, (_, idx) => {
                const slotId = combatLoadoutIds[idx];
                const slotWeapon = slotId ? loadoutWeapons[idx] : null;
                if (!slotWeapon) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      title={trans.armory.combatNoteDesc}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-700/70 bg-slate-900/45 px-2 py-1 text-[10px] font-semibold text-slate-500 opacity-60 select-none"
                    >
                      <kbd className="rounded bg-slate-800 px-1 text-[9px] font-black text-slate-400">
                        {idx + 1}
                      </kbd>
                      <span className="max-w-[74px] truncate">{trans.worldMap.emptySlot}</span>
                    </div>
                  );
                }

                const isActive = idx === activeLoadoutSlot;
                const slotLv = saveData.weaponLevels[slotWeapon.id] ?? 1;
                const slotArmorySpec = getArmoryWeaponById(slotWeapon.id);
                return (
                  <button
                    key={`${slotWeapon.id}-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.currentTarget.blur();
                      switchCombatWeaponSlot(idx);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer touch-none ${
                      isActive
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.28)]"
                        : "border-slate-700/80 bg-slate-900/80 text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    <kbd
                      className={`rounded px-1 text-[9px] font-black ${
                        isActive
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {idx + 1}
                    </kbd>
                    <img
                      src={getWeaponImageUrl(slotArmorySpec)}
                      alt={slotWeapon.name}
                      className="h-4 w-6 rounded-sm object-cover border border-slate-700/70 shrink-0"
                    />
                    <span className="max-w-[82px] truncate">{slotWeapon.name}</span>
                    <span className="text-[9px] opacity-75">L{slotLv}</span>
                  </button>
                );
              })}

              {loadoutWeapons.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.blur();
                    cycleCombatWeapon();
                  }}
                  title={trans.hud.keySwitchWeapon}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/85 px-2 py-1 text-[10px] font-black text-cyan-300 hover:border-cyan-400 hover:text-white cursor-pointer touch-none"
                >
                  <kbd className="text-[9px]">Q</kbd>
                  <span>↻</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-sky-300">
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{weapon.name}</span>
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
                      • {ragingSkillName}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-l border-slate-700 pl-2.5 sm:pl-3 text-right sm:text-left">
                <div className="text-[10px] sm:text-[11px] text-slate-400">
                  <span className="hidden sm:inline">{trans.hud.overdriveBuffLabel}</span>
                  <span className="sm:hidden">{trans.hud.overdriveBuffShort}</span>
                </div>
                <div className="font-black text-cyan-300">
                  {formatText(trans.hud.gatesRemaining, {
                    left: remainingGatesCount,
                    max: rightLaneGates.length,
                  })}
                </div>
              </div>
            </div>

            {activeBuffChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {activeBuffChips.map((chip) => (
                  <span
                    key={chip.label}
                    className="rounded border px-1.5 py-0.5 text-[9px] font-black tracking-wide"
                    style={{
                      color: chip.color,
                      borderColor: `${chip.color}55`,
                      backgroundColor: `${chip.color}18`,
                    }}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
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
                          ? formatText(trans.hud.rageSkillActive, {
                              skill: ragingSkillName,
                              time: rageTimeLeft.toFixed(1),
                            })
                          : rageReady
                            ? weapon.id === "icbm"
                              ? trans.hud.rageButtonCenterIcbm
                              : formatText(trans.hud.rageSkillButton, {
                                  skill: readySkillName,
                                })
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
              <strong className="text-cyan-300">1-3 / Q / Scroll</strong>{" "}
              {trans.hud.keySwitchWeapon} •{" "}
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

      {/* Modal chờ nạp tài nguyên game: hiện khi bấm Chơi ngay nhưng tải ngầm chưa hoàn thành 100% */}
      <AnimatePresence>
        {assetsWaitingToStart && !assetsReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 text-center text-white shadow-2xl"
            >
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute h-16 w-16 rounded-full border-4 border-sky-500/20" />
                <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
              </div>

              <h3 className="text-lg font-black tracking-wide text-sky-300">
                {trans.menu.loadingAssetsTitle}
              </h3>

              <div className="mt-3 flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-black text-amber-300">
                  {assetsPercent}%
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  ({assetsLoadedCount}/{assetsTotal} {trans.menu.filesUnit})
                </span>
              </div>

              <div className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${assetsPercent}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {trans.menu.loadingAssetsHint}
              </p>

              {assetsError && (
                <div className="mt-4 w-full rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
                  <p className="font-semibold">{assetsError}</p>
                  <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startBackgroundPreload()}
                      className="border-slate-700 bg-slate-800 text-xs text-white hover:bg-slate-700"
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      {trans.menu.loadingAssetsRetry}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-5 w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAssetsWaitingToStart(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {trans.menu.cancel}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
