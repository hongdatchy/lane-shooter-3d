"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Gauge,
  Heart,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Sun,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraMode } from "@/dto/GameDTO";
import { useGameStore } from "@/state-manager/game-store";
import { useAppStore } from "@/state-manager/app-store";
import { MAX_PLAYABLE_CHAPTER, weaponService } from "@/service/weapon-service";
import { RAGE_CONFIG } from "@/service/game-constants";
import { gameInput } from "@/service/game-input";
import { soundService } from "@/service/sound-service";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";
import { LanguageSwitcher } from "@/components/custom/common/language-switcher";
import { startBackgroundPreload } from "@/service/asset-preloader";
import {
  ARMORY_WEAPONS,
  MAX_WEAPON_LEVEL,
  getArmoryWeaponById,
  getWeaponImageUrl,
} from "@/service/armory-catalog";
import { getRageSkillSpec } from "@/service/rage-catalog";
import {
  DEV_SPEED_OPTIONS,
  buildDevBalanceReport,
  logDevBalanceReportToConsole,
} from "@/service/dev-mode-service";

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
    saveError,
    scoreSyncError,
    sessionId,
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
    selectChapter,
    startGame,
    startNextChapter,
    returnToMenu,
    togglePause,
    activateRage,
    setCameraMode,
    cycleCameraMode,
    toggleAutoFire,
    toggleMute,
    clearRewardBanner,
    isCurrentRunFirstTime,
    devMode,
    devGameSpeed,
    devWeaponId,
    devWeaponLevel,
    devChapter,
    devSimSeconds,
    devBossSpawnedAtSimSec,
    devBossKilledAtSimSec,
    devSimulatedDamageTaken,
    devSimulatedEnemyBreaches,
    devSimulatedProjectileHits,
    devSimulatedFirstFailWave,
    devBossBreachedLine,
    devBossRemainingHpAtEnd,
    devBossMaxHpAtEnd,
    setDevMode,
    setDevGameSpeed,
    setDevConfig,
    startDevTestRun,
  } = useGameStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [delayedResultReady, setDelayedResultReady] = useState(false);
  const [guestLoginDismissed, setGuestLoginDismissed] = useState(false);
  const [loggedInFromGuestModal, setLoggedInFromGuestModal] = useState(false);
  const loggedDevSessionRef = useRef<number>(-1);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const trans = useTransClientSide();
  const cameraModes = CAMERA_ORDER.map((mode) => ({
    mode,
    label: trans.camera[mode],
  }));

  const activeWeaponId = combatLoadoutIds[0] ?? devWeaponId ?? "pistol";
  const weaponLv = devMode ? devWeaponLevel : saveData.weaponLevels[activeWeaponId] ?? 1;
  const weapon = weaponService.resolveCombatWeapon(activeWeaponId, weaponLv);
  const weaponArmorySpec = getArmoryWeaponById(weapon.id);
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

  // Chờ 3s sau khi Win/Thua (hoặc 0.35s trong Dev Mode) để xem hiệu ứng trước khi hiện popup
  useEffect(() => {
    if (gameStatus !== "GAME_OVER" && gameStatus !== "VICTORY") {
      setDelayedResultReady(false);
      return;
    }
    setDelayedResultReady(false);
    const timer = setTimeout(() => {
      setDelayedResultReady(true);
    }, devMode ? 350 : 3000);
    return () => clearTimeout(timer);
  }, [gameStatus, devMode]);

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

  useEffect(() => {
    setGuestLoginDismissed(false);
    setLoggedInFromGuestModal(false);
  }, [sessionId]);

  const handleRestart = () => {
    if (!assetsReady) {
      setAssetsWaitingToStart(true);
      return;
    }
    enterFullscreen();
    selectChapter(activeChapter);
    startGame();
  };

  const handleNextChapter = () => {
    if (!assetsReady) {
      setAssetsWaitingToStart(true);
      return;
    }
    enterFullscreen();
    startNextChapter();
  };

  const handlePostMatchLogin = async () => {
    const wasGuest = !useGameStore.getState().player;
    await loginWithPlatform();
    if (wasGuest && useGameStore.getState().player) {
      setLoggedInFromGuestModal(true);
    }
  };

  // Tự động vào game nếu người chơi đã bấm "Chơi ngay" trong lúc đang chờ tải tài nguyên
  useEffect(() => {
    if (assetsWaitingToStart && assetsReady) {
      setAssetsWaitingToStart(false);
      if (!isCurrentRunFirstTime) {
        enterFullscreen();
      }
      startGame();
    }
  }, [assetsWaitingToStart, assetsReady, isCurrentRunFirstTime]);

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
  const isBossWave = wave >= maxWaves;
  const currentCameraLabel = trans.camera[cameraMode] || cameraMode;
  const stageDisplay = isBossWave ? `${wave} / ${maxWaves}` : `${wave}`;
  const canPromptLogin =
    platformTarget === "crazygames" ||
    Boolean(platformCapabilities?.supportsLoginPrompt);
  const isMatchEnded =
    (gameStatus === "GAME_OVER" || gameStatus === "VICTORY") &&
    delayedResultReady;
  const showGuestLoginPopup =
    !devMode && isMatchEnded && !player && !guestLoginDismissed && canPromptLogin;
  const nextChapterNumber = Math.min(MAX_PLAYABLE_CHAPTER, activeChapter + 1);
  const hasNextPlayableChapter =
    gameStatus === "VICTORY" &&
    activeChapter < MAX_PLAYABLE_CHAPTER &&
    saveData.unlockedChapter >= nextChapterNumber;
  const devReport =
    devMode && isMatchEnded
      ? buildDevBalanceReport({
          won: gameStatus === "VICTORY",
          activeChapter,
          reachedWave: wave,
          maxWaves,
          kills,
          score,
          goldEarned: lastGoldEarned,
          maxHp,
          weaponId: weapon.id,
          weaponLevel: devWeaponLevel,
          simSeconds: devSimSeconds,
          bossSpawnedAtSimSec: devBossSpawnedAtSimSec,
          bossKilledAtSimSec: devBossKilledAtSimSec,
          simulatedDamageTaken: devSimulatedDamageTaken,
          simulatedEnemyBreaches: devSimulatedEnemyBreaches,
          simulatedProjectileHits: devSimulatedProjectileHits,
          simulatedFirstFailWave: devSimulatedFirstFailWave,
          bossBreachedLine: devBossBreachedLine,
          bossRemainingHp: devBossRemainingHpAtEnd,
          bossMaxHp: devBossMaxHpAtEnd,
        })
      : null;

  useEffect(() => {
    if (devReport && loggedDevSessionRef.current !== sessionId) {
      loggedDevSessionRef.current = sessionId;
      logDevBalanceReportToConsole(devReport);
    }
  }, [devReport, sessionId]);
  const rageStatusText = icbmAiming
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
          : formatText(trans.hud.ragePercent, { pct: ragePercent });

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex flex-col ${
        isInMenu ? "items-center justify-center p-3 sm:p-4" : "justify-between"
      } transition-shadow duration-300 ${
        rageActive
          ? "shadow-[inset_0_0_70px_rgba(254,152,0,0.28)] ring-2 ring-inset ring-[#FE9800]/55"
          : ""
      }`}
    >
      {/* ═══ TOP COMBAT HUD BAR (Cyber Lane Arcade) ═══ */}
      {!isInMenu && (
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto w-full px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 bg-[#191B23]/88 backdrop-blur-md border-b border-[#3B494B]/40 shadow-2xl text-[#E1E2EC]"
        >
          {/* TOP-LEFT: Player + Hearts HP + Wave/Kills + Score */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5">
              {playerName && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0E15] border border-[#00F0FF]/30 text-[#7DF4FF] font-mono text-[11px] font-bold">
                  <User className="h-3.5 w-3.5 text-[#00F0FF]" />
                  <span className="max-w-[110px] truncate">{playerName}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                {Array.from({ length: maxHp }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`h-4 w-4 sm:h-[18px] sm:w-[18px] transition-transform ${
                      i < hp
                        ? "fill-[#FF2A6D] text-[#FF2A6D] drop-shadow-[0_0_6px_rgba(255,42,109,0.75)] scale-100"
                        : "text-[#32353D] scale-90"
                    }`}
                  />
                ))}
              </div>

              {activeBuffs.shieldCharges > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/45 font-mono text-[10px] font-bold text-[#7DF4FF]">
                  <Shield className="h-3 w-3 text-[#00F0FF]" />
                  {activeBuffs.shieldCharges}
                </span>
              )}
            </div>

            <div className="hidden sm:block w-px h-6 bg-[#32353D]" />

            {/* Chapter / Wave / Kills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D1F27] border border-[#3B494B]/45 font-mono">
                <span className="text-[10px] font-bold text-[#849495] uppercase">
                  CH.{String(activeChapter).padStart(2, "0")}
                </span>
                <span className="text-[#3B494B]">•</span>
                <span className="text-[10px] text-[#849495] uppercase hidden sm:inline">
                  {trans.hud.stage}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[#DBFCFF] leading-none tabular-nums">
                  {wave}/{maxWaves}
                </span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1D1F27] border border-[#3B494B]/35 font-mono text-[11px]">
                <span className="text-[#849495] hidden sm:inline">{trans.hud.stageKillsLong}</span>
                <span className="text-[#849495] sm:hidden">{trans.hud.stageKillsShort}</span>
                <span className="font-bold text-[#10B981] tabular-nums">
                  {stageKills}/{stageTargetKills}
                </span>
              </div>

              {isBossWave && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#93000A]/45 border border-[#FFB4AB]/50 text-[#FFB4AB] font-mono text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>BOSS</span>
                </div>
              )}
            </div>

            <div className="hidden md:block w-px h-6 bg-[#32353D]" />

            {/* Score */}
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-[10px] uppercase tracking-wider text-[#849495]">
                {trans.hud.score}
              </span>
              <span className="text-sm sm:text-lg font-extrabold text-[#7DF4FF] tabular-nums tracking-wide">
                {score.toLocaleString()}
              </span>
            </div>

            {devMode && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#FE9800]/55 bg-[#0B0E15]/95 px-2 py-1 font-mono text-[10px]">
                <span className="flex items-center gap-1 font-bold text-[#FE9800]">
                  <Wrench className="h-3 w-3" />
                  DEV • 1 LANE
                </span>
                <span className="px-1.5 py-0.5 rounded font-bold bg-[#00F0FF]/15 text-[#7DF4FF]">
                  MIỄN ĐẠN XA: {devSimulatedProjectileHits}
                </span>
                <div className="flex items-center gap-0.5">
                  <Gauge className="h-3 w-3 text-[#00F0FF] mr-0.5" />
                  {DEV_SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setDevGameSpeed(spd);
                      }}
                      className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                        devGameSpeed === spd
                          ? "bg-[#00F0FF] text-[#00363A]"
                          : "bg-[#1D1F27] text-[#B9CACB] hover:text-white"
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
                    onChange={(e) => setDevGameSpeed(Number(e.target.value))}
                    title="Tùy chỉnh tốc độ 1..20x"
                    className="w-10 h-5 px-1 ml-0.5 rounded bg-[#1D1F27] border border-[#3B494B] text-[#7DF4FF] text-center outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TOP-RIGHT: Camera Selector Pills + Auto-Fire + Utility Controls */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Mobile Camera Cycle */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                cycleCameraMode();
              }}
              className="sm:hidden h-7 px-2 rounded-lg bg-[#1D1F27] border border-[#3B494B]/50 text-[#7DF4FF] font-mono text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5 text-[#00F0FF]" />
              <span>{currentCameraLabel}</span>
            </button>

            {/* Desktop Camera Selector Pills */}
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-[#0B0E15] border border-[#3B494B]/50">
              <Camera className="mx-1.5 h-3.5 w-3.5 text-[#00F0FF]" />
              {cameraModes.map((item) => {
                const active = cameraMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setCameraMode(item.mode);
                    }}
                    className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      active
                        ? "bg-[#00F0FF] text-[#00363A] shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                        : "text-[#849495] hover:text-[#E1E2EC]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Auto-Fire Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                toggleAutoFire();
              }}
              className={`h-7 sm:h-8 px-2.5 rounded-lg border font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                autoFire
                  ? "bg-[#1D1F27] border-[#00F0FF]/50 text-[#00F0FF]"
                  : "bg-[#1D1F27] border-[#3B494B]/45 text-[#849495] hover:text-[#E1E2EC]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoFire ? "bg-[#00F0FF] animate-pulse" : "bg-[#586568]"
                }`}
              />
              <span className="hidden sm:inline">
                {autoFire ? trans.hud.autoFireOn : trans.hud.autoFireOff}
              </span>
              <span className="sm:hidden">
                {autoFire ? trans.hud.autoFireShortOn : trans.hud.autoFireShortOff}
              </span>
            </button>

            <button
              type="button"
              aria-label={isMuted ? trans.hud.unmute : trans.hud.mute}
              onClick={(e) => {
                e.currentTarget.blur();
                toggleMute();
              }}
              className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                isMuted
                  ? "bg-[#93000A]/35 border-[#FFB4AB]/45 text-[#FFB4AB]"
                  : "bg-[#1D1F27] border-[#3B494B]/45 text-[#B9CACB] hover:text-[#DBFCFF]"
              }`}
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>

            <LanguageSwitcher variant="hud" />

            <button
              type="button"
              aria-label={theme === "light" ? trans.app.toDark : trans.app.toLight}
              onClick={(e) => {
                e.currentTarget.blur();
                toggleTheme();
              }}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border border-[#3B494B]/45 bg-[#1D1F27] text-[#FFC080] hover:bg-[#272A32] flex items-center justify-center transition-colors cursor-pointer"
            >
              {theme === "light" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              type="button"
              aria-label={isFullscreen ? trans.hud.fullscreenExit : trans.hud.fullscreenEnter}
              onClick={(e) => {
                e.currentTarget.blur();
                toggleFullscreen();
              }}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border border-[#3B494B]/45 bg-[#1D1F27] text-[#7DF4FF] hover:bg-[#272A32] flex items-center justify-center transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>

            {(gameStatus === "PLAYING" || gameStatus === "PAUSED") && (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  togglePause();
                }}
                className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg bg-[#272A32] hover:bg-[#32353D] border border-[#3B494B]/55 text-[#E1E2EC] font-mono text-[10px] sm:text-[11px] font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {gameStatus === "PAUSED" ? (
                  <>
                    <Play className="h-3.5 w-3.5 text-[#00F0FF]" />
                    <span className="hidden sm:inline">{trans.hud.resume}</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{trans.hud.pause}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.header>
      )}

      {/* ═══ CENTER NON-BLOCKING NOTIFICATIONS ═══ */}
      <div className="flex-1 flex flex-col items-center justify-between py-3 px-3 pointer-events-none min-h-0">
        <AnimatePresence>
          {!isInMenu && rewardBanner && (
            <motion.div
              key={rewardBanner}
              initial={{ opacity: 0, scale: 0.9, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              className="flex max-w-[92vw] items-center gap-2 rounded-lg border border-[#FE9800]/60 bg-[#0B0E15]/92 px-4 py-1.5 text-center font-['Space_Grotesk'] text-xs sm:text-sm font-bold text-[#FFC080] shadow-[0_0_24px_rgba(254,152,0,0.28)] backdrop-blur-md"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#FE9800]" />
              <span>{rewardBanner}</span>
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
              className={`my-auto flex items-center gap-2.5 rounded-xl border px-5 py-2.5 font-['Space_Grotesk'] text-sm sm:text-base font-bold shadow-2xl backdrop-blur-md ${
                gameStatus === "VICTORY"
                  ? "border-[#10B981]/65 bg-[#0A2A24]/92 text-[#6EE7B7]"
                  : "border-[#FF2A6D]/65 bg-[#450A1A]/92 text-[#FFB4AB]"
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

        {/* Modal Pause / Dev Balance Report / Guest Login Suggestion / Game Over / Victory */}
        <AnimatePresence mode="wait">
          {(gameStatus === "PAUSED" || isMatchEnded) && (
            <motion.div
              key={
                devReport
                  ? `${gameStatus}-dev-report`
                  : showGuestLoginPopup
                    ? `${gameStatus}-guest-login`
                    : gameStatus
              }
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className={`pointer-events-auto my-auto max-h-full w-full overflow-y-auto rounded-2xl border bg-[#191B23]/96 p-5 sm:p-6 text-center text-[#E1E2EC] backdrop-blur-xl ${
                devReport
                  ? "max-w-xl border-[#FE9800]/65 shadow-[0_0_55px_rgba(254,152,0,0.22)]"
                  : showGuestLoginPopup
                    ? "max-w-md border-[#00F0FF]/55 shadow-[0_0_55px_rgba(0,240,255,0.22)]"
                    : "max-w-md border-[#3B494B]/60 shadow-[0_0_50px_rgba(0,0,0,0.75)]"
              }`}
            >
              {gameStatus === "PAUSED" && (
                <>
                  <h2 className="font-['Space_Grotesk'] text-xl font-bold uppercase tracking-wide text-[#DBFCFF]">
                    {formatText(trans.modals.pausedTitle, { stage: stageDisplay })}
                  </h2>
                  <p className="mt-1 text-sm text-[#B9CACB]">{trans.modals.pausedDesc}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={togglePause}
                      className="flex-1 gap-2 bg-[#00F0FF] text-[#00363A] font-bold hover:bg-[#7DF4FF]"
                    >
                      <Play className="h-4 w-4" />
                      {trans.hud.resume}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRestart}
                      className="gap-2 border-[#3B494B] bg-[#1D1F27] text-[#E1E2EC] hover:bg-[#272A32] hover:text-white"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {trans.modals.restartShort}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToMenu}
                      className="w-full gap-2 border-[#3B494B] bg-[#1D1F27] text-[#B9CACB] hover:bg-[#272A32] hover:text-white"
                    >
                      <Trophy className="h-4 w-4 text-[#FE9800]" />
                      {trans.modals.backToMenu}
                    </Button>
                  </div>
                </>
              )}

              {devReport && (
                <div className="flex flex-col gap-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FE9800]/50 bg-[#FE9800]/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FFC080]">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>DEV BALANCE REPORT • MÀN {devReport.activeChapter}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[#849495]">
                      {devReport.simSeconds}s (1x)
                    </span>
                  </div>

                  <div
                    className={`rounded-xl border p-3.5 ${
                      devReport.passRealCheck
                        ? "border-[#10B981]/55 bg-[#10B981]/12"
                        : "border-[#FF2A6D]/55 bg-[#93000A]/25"
                    }`}
                  >
                    <div
                      className={`font-['Space_Grotesk'] text-lg font-extrabold uppercase tracking-wide ${
                        devReport.passRealCheck ? "text-[#34D399]" : "text-[#FFB4AB]"
                      }`}
                    >
                      {devReport.passRealCheck ? "✓ " : "✕ "}
                      {devReport.verdictLabel}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#E1E2EC]">
                      {devReport.verdictReason}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-[#272A32] bg-[#0B0E15]/85 p-3 font-mono text-xs text-center">
                    <div>
                      <span className="block text-[10px] text-[#849495]">QUÁI HẠ</span>
                      <span className="text-base font-extrabold text-[#34D399] tabular-nums">
                        {devReport.kills}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">GOLD / VÁN</span>
                      <span className="text-base font-extrabold text-[#FE9800] tabular-nums">
                        +{devReport.goldEarned.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">MÁU CÒN LẠI</span>
                      <span className="text-base font-extrabold text-[#FFB4AB] tabular-nums">
                        {devReport.simulatedRemainingHp}/{devReport.maxHp}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">DPS SÚNG</span>
                      <span className="text-base font-extrabold text-[#7DF4FF] tabular-nums">
                        {devReport.effectiveDps}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#3B494B]/45 bg-[#0B0E15]/85 p-3 font-mono text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[#DBFCFF]">
                      <span>Súng đang test:</span>
                      <span className="font-bold text-[#FFC080]">
                        #{devReport.testedWeapon.slotNumber} {devReport.testedWeapon.name} (Lv.
                        {devReport.testedWeaponLevel})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#B9CACB]">
                      <span>Nâng cấp Lv.{devReport.testedWeaponLevel + 1}:</span>
                      <span className="font-bold text-[#7DF4FF]">
                        {devReport.upgradeRunsNeeded !== null &&
                        devReport.upgradeCostNextLevel !== null
                          ? `${devReport.upgradeCostNextLevel.toLocaleString()}G → Cần ${devReport.upgradeRunsNeeded} ván`
                          : "ĐÃ MAX LV.10"}
                      </span>
                    </div>
                    {devReport.nextWeapon && (
                      <div className="flex items-center justify-between text-[#B9CACB] pt-1 border-t border-[#272A32]">
                        <span>
                          Súng sau (#{devReport.nextWeapon.weapon.slotNumber}{" "}
                          {devReport.nextWeapon.weapon.name} • Ch.
                          {devReport.nextWeapon.weapon.unlockChapter}):
                        </span>
                        <span className="font-bold text-[#FE9800]">
                          {devReport.nextWeapon.weapon.unlockCost.toLocaleString()}G →{" "}
                          {devReport.nextWeapon.runsNeeded} ván
                        </span>
                      </div>
                    )}
                    {devReport.nextChapterWeapon && (
                      <div className="flex items-center justify-between text-[#849495] text-[11px]">
                        <span>
                          Súng Ch.{devReport.nextChapterWeapon.weapon.unlockChapter} (
                          {devReport.nextChapterWeapon.weapon.name}):
                        </span>
                        <span className="font-bold text-[#FFC080]">
                          {devReport.nextChapterWeapon.weapon.unlockCost.toLocaleString()}G →{" "}
                          {devReport.nextChapterWeapon.runsNeeded} ván
                        </span>
                      </div>
                    )}
                    <div className="text-[10px] text-[#849495] pt-1 border-t border-[#272A32]">
                      Thực chiến: Quái lọt vạch {devReport.simulatedEnemyBreaches} • Miễn nhiễm đạn từ xa{" "}
                      {devReport.simulatedProjectileHits} phát
                      {devReport.bossKillSeconds !== null
                        ? ` • Hạ Boss trong ${devReport.bossKillSeconds}s`
                        : ""}
                    </div>
                  </div>

                  {/* Quick Test Config right inside Dev Report */}
                  <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                    <select
                      value={devChapter}
                      onChange={(e) => setDevConfig({ devChapter: Number(e.target.value) })}
                      className="h-8 px-2 rounded bg-[#1D1F27] border border-[#3B494B] text-[#DBFCFF]"
                    >
                      {Array.from({ length: MAX_PLAYABLE_CHAPTER }, (_, idx) => idx + 1).map(
                        (ch) => (
                          <option key={ch} value={ch}>
                            Màn {ch}
                          </option>
                        )
                      )}
                    </select>
                    <select
                      value={devWeaponId}
                      onChange={(e) => setDevConfig({ devWeaponId: e.target.value })}
                      className="h-8 px-2 rounded bg-[#1D1F27] border border-[#3B494B] text-[#FFC080]"
                    >
                      {ARMORY_WEAPONS.map((w) => (
                        <option key={w.id} value={w.id}>
                          #{w.slotNumber} {w.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={devWeaponLevel}
                      onChange={(e) => setDevConfig({ devWeaponLevel: Number(e.target.value) })}
                      className="h-8 px-2 rounded bg-[#1D1F27] border border-[#3B494B] text-[#7DF4FF]"
                    >
                      {Array.from({ length: MAX_WEAPON_LEVEL }, (_, i) => i + 1).map((lv) => (
                        <option key={lv} value={lv}>
                          Lv.{lv}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      onClick={() => startDevTestRun()}
                      className="flex-1 gap-2 bg-[#FE9800] text-[#1A1000] font-bold hover:bg-[#FFB86F]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      CHẠY LẠI VỚI CẤU HÌNH TRÊN
                    </Button>
                    {devReport.nextWeapon && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          startDevTestRun({
                            devWeaponId: devReport.nextWeapon!.weapon.id,
                            devWeaponLevel: 1,
                          })
                        }
                        className="gap-2 border-[#00F0FF]/55 bg-[#1D1F27] text-[#7DF4FF] hover:bg-[#272A32]"
                      >
                        <ArrowRight className="h-4 w-4" />
                        THỬ {devReport.nextWeapon.weapon.name}
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDevMode(false);
                      handleBackToMenu();
                    }}
                    className="w-full gap-2 border-[#3B494B] bg-[#1D1F27] text-[#B9CACB] hover:bg-[#272A32] hover:text-white"
                  >
                    THOÁT DEV MODE & VỀ SẢNH
                  </Button>
                </div>
              )}

              {!devReport && showGuestLoginPopup && (
                <>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00F0FF]/45 bg-[#00F0FF]/12 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7DF4FF]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
                    {trans.modals.guestPopupBadge}
                  </div>
                  <div
                    className={`mx-auto mt-3 mb-3 flex h-12 w-12 items-center justify-center rounded-xl border ${
                      gameStatus === "VICTORY"
                        ? "bg-[#10B981]/15 border-[#10B981]/45 text-[#34D399]"
                        : "bg-[#00F0FF]/12 border-[#00F0FF]/40 text-[#00F0FF]"
                    }`}
                  >
                    <Trophy className="h-6 w-6" />
                  </div>
                  <h2
                    className={`font-['Space_Grotesk'] text-2xl font-bold uppercase tracking-tight ${
                      gameStatus === "VICTORY" ? "text-[#34D399]" : "text-[#DBFCFF]"
                    }`}
                  >
                    {gameStatus === "VICTORY"
                      ? formatText(trans.modals.guestPopupTitleVictory, {
                          stage: activeChapter,
                        })
                      : formatText(trans.modals.guestPopupTitleDefeat, {
                          stage: activeChapter,
                        })}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#B9CACB]">
                    {formatText(trans.modals.guestPopupDesc, {
                      platform: platformTarget === "web" ? "Google" : "CrazyGames",
                      stage: activeChapter,
                    })}
                  </p>

                  {gameStatus === "VICTORY" && activeChapter < MAX_PLAYABLE_CHAPTER && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#10B981]/45 bg-[#10B981]/12 px-3 py-1.5 font-mono text-[11px] font-bold text-[#6EE7B7]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#34D399]" />
                      <span>
                        {formatText(trans.modals.guestPopupUnlockBadge, {
                          next: nextChapterNumber,
                        })}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-[#272A32] bg-[#0B0E15]/80 p-3 font-mono text-xs">
                    <div>
                      <span className="block text-[10px] text-[#849495]">
                        {trans.modals.score}
                      </span>
                      <span className="text-base font-extrabold text-[#FFC080] tabular-nums">
                        {score.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">
                        {trans.modals.goldEarned}
                      </span>
                      <span className="text-base font-extrabold text-[#FE9800] tabular-nums">
                        +{lastGoldEarned.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">
                        {trans.modals.totalKills}
                      </span>
                      <span className="text-base font-extrabold text-[#34D399] tabular-nums">
                        {kills}
                      </span>
                    </div>
                  </div>

                  {authError && (
                    <div className="mt-3 rounded-lg border border-[#FE9800]/50 bg-[#FE9800]/12 px-3 py-2 text-xs text-[#FFC080] text-left">
                      {authError}
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-2">
                    <Button
                      type="button"
                      size="lg"
                      disabled={authLoading}
                      onClick={() => void handlePostMatchLogin()}
                      className="w-full gap-2 bg-[#00F0FF] text-[#00363A] font-bold hover:bg-[#7DF4FF] uppercase tracking-wider shadow-[0_0_24px_rgba(0,240,255,0.3)]"
                    >
                      {authLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      {authLoading
                        ? trans.lobby.authenticating
                        : platformTarget === "web"
                          ? trans.lobby.loginGoogle
                          : trans.lobby.loginCrazyGames}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={authLoading}
                      onClick={() => setGuestLoginDismissed(true)}
                      className="w-full text-xs font-mono text-[#849495] hover:bg-[#272A32] hover:text-[#E1E2EC]"
                    >
                      {trans.modals.guestPopupSkip}
                    </Button>
                  </div>
                </>
              )}

              {!devReport && isMatchEnded && !showGuestLoginPopup && (
                <>
                  <div
                    className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border ${
                      gameStatus === "VICTORY"
                        ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#34D399]"
                        : "bg-[#FF2A6D]/15 border-[#FF2A6D]/40 text-[#FFB4AB]"
                    }`}
                  >
                    <Trophy className="h-6 w-6" />
                  </div>
                  <h2
                    className={`font-['Space_Grotesk'] text-2xl font-bold uppercase tracking-tight ${
                      gameStatus === "VICTORY" ? "text-[#34D399]" : "text-[#FFB4AB]"
                    }`}
                  >
                    {gameStatus === "VICTORY"
                      ? formatText(trans.modals.victoryTitle, { max: maxWaves })
                      : trans.modals.gameOverTitle}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-[#849495]">
                    {playerName ? `${playerName} • ` : `${trans.modals.guestLabel} • `}
                    {`CH.${String(activeChapter).padStart(2, "0")} • `}
                    {gameStatus === "VICTORY"
                      ? trans.modals.victoryDesc
                      : formatText(trans.modals.gameOverDesc, { stage: stageDisplay })}
                  </p>
                  {player && loggedInFromGuestModal && !saveError && (
                    <div className="mt-3 rounded-xl border border-[#10B981]/45 bg-[#10B981]/12 px-3.5 py-2 text-xs text-[#6EE7B7] flex items-center gap-2 text-left">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34D399]" />
                      <span>
                        {formatText(trans.modals.guestSyncedBanner, {
                          name: playerName || "Account",
                        })}
                      </span>
                    </div>
                  )}
                  {!player && (
                    <div className="mt-3 rounded-xl border border-[#00F0FF]/40 bg-[#0B0E15]/80 px-3.5 py-2.5 text-xs text-[#DBFCFF] flex flex-col gap-2 text-left">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 shrink-0 text-[#00F0FF] mt-0.5" />
                        <span>
                          {formatText(trans.modals.guestLoginToSave, {
                            platform:
                              platformTarget === "web" ? "Google" : "CrazyGames",
                          })}
                        </span>
                      </div>
                      {canPromptLogin && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={authLoading}
                          onClick={() => void handlePostMatchLogin()}
                          className="w-full gap-1.5 bg-[#00F0FF] text-[#00363A] font-bold hover:bg-[#7DF4FF] uppercase tracking-wider"
                        >
                          {authLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {authLoading
                            ? trans.lobby.authenticating
                            : platformTarget === "web"
                              ? trans.lobby.loginGoogle
                              : trans.lobby.loginCrazyGames}
                        </Button>
                      )}
                      {authError && (
                        <div className="rounded-md border border-[#FE9800]/45 bg-[#FE9800]/10 px-2.5 py-1.5 text-[11px] text-[#FFC080]">
                          {authError}
                        </div>
                      )}
                    </div>
                  )}
                  {player && saveError && (
                    <div className="mt-3 rounded-lg border border-[#FE9800]/45 bg-[#FE9800]/12 px-3 py-2 text-xs text-[#FFC080] text-left">
                      {saveError}
                    </div>
                  )}
                  {player && scoreSyncError && (
                    <div className="mt-3 rounded-lg border border-[#FF2A6D]/45 bg-[#93000A]/30 px-3 py-2 text-xs text-[#FFB4AB] text-left">
                      {formatText(trans.modals.scoreSyncFailed, { err: scoreSyncError })}
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-[#272A32] bg-[#0B0E15]/75 p-3 font-mono text-xs">
                    <div>
                      <span className="block text-[10px] text-[#849495]">{trans.modals.score}</span>
                      <span className="text-base font-extrabold text-[#FFC080] tabular-nums">{score}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">{trans.modals.highScore}</span>
                      <span className="text-base font-extrabold text-[#7DF4FF] tabular-nums">{highScore}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">{trans.modals.goldEarned}</span>
                      <span className="text-base font-extrabold text-[#FE9800] tabular-nums">
                        +{lastGoldEarned}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#849495]">{trans.modals.totalKills}</span>
                      <span className="text-base font-extrabold text-[#34D399] tabular-nums">{kills}</span>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-2">
                    {isCurrentRunFirstTime ? (
                      <>
                        <Button
                          type="button"
                          onClick={handleBackToMenu}
                          className="w-full gap-2 bg-[#00F0FF] text-[#00363A] font-bold hover:bg-[#7DF4FF] shadow-[0_0_24px_rgba(0,240,255,0.28)]"
                          size="lg"
                        >
                          <Crown className="h-4 w-4 text-[#00363A]" />
                          {trans.modals.firstRunMenuCta}
                        </Button>
                        {hasNextPlayableChapter && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleNextChapter}
                            className="w-full gap-2 border-[#10B981]/50 bg-[#1D1F27] text-[#6EE7B7] hover:bg-[#272A32]"
                          >
                            <ArrowRight className="h-4 w-4" />
                            {formatText(trans.modals.nextChapterBtn, {
                              next: nextChapterNumber,
                            })}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRestart}
                          className="w-full gap-2 border-[#3B494B] bg-[#1D1F27] text-[#B9CACB] hover:bg-[#272A32] hover:text-white"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {formatText(trans.modals.replayChapterBtn, {
                            stage: activeChapter,
                          })}
                        </Button>
                      </>
                    ) : (
                      <>
                        {hasNextPlayableChapter ? (
                          <>
                            <Button
                              type="button"
                              onClick={handleNextChapter}
                              className="w-full gap-2 bg-[#10B981] text-[#00291C] font-bold hover:bg-[#34D399] shadow-[0_0_24px_rgba(16,185,129,0.28)]"
                              size="lg"
                            >
                              <ArrowRight className="h-4 w-4" />
                              {formatText(trans.modals.nextChapterBtn, {
                                next: nextChapterNumber,
                              })}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleRestart}
                              className="w-full gap-2 border-[#3B494B] bg-[#1D1F27] text-[#E1E2EC] hover:bg-[#272A32] hover:text-white"
                            >
                              <RotateCcw className="h-4 w-4" />
                              {formatText(trans.modals.replayChapterBtn, {
                                stage: activeChapter,
                              })}
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleRestart}
                            className="w-full gap-2 bg-[#00F0FF] text-[#00363A] font-bold hover:bg-[#7DF4FF]"
                            size="lg"
                          >
                            <RotateCcw className="h-4 w-4" />
                            {formatText(trans.modals.replayChapterBtn, {
                              stage: activeChapter,
                            })}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBackToMenu}
                          className="w-full gap-2 border-[#3B494B] bg-[#1D1F27] text-[#E1E2EC] hover:bg-[#272A32] hover:text-white"
                        >
                          <Crown className="h-4 w-4 text-[#FE9800]" />
                          {trans.modals.backToMenu}
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div />
      </div>

      {/* ═══ BOTTOM COMBAT DECK & RAGE BAR (Stitch Cyber Lane Arcade) ═══ */}
      {!isInMenu && (
        <div className="pointer-events-auto w-full bg-[#191B23]/90 backdrop-blur-md border-t border-[#3B494B]/40 px-2.5 sm:px-5 py-2 sm:py-2.5 shadow-2xl">
          <div className="flex flex-col lg:grid lg:grid-cols-[auto_minmax(260px,1fr)_auto] items-stretch lg:items-center justify-between gap-2 lg:gap-4 max-w-[1600px] mx-auto">
            {/* BOTTOM-LEFT: Single Active Weapon + Stats + Real Active Buff Chips */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 rounded-xl border border-[#00F0FF]/55 bg-[#0B0E15]/90 px-2.5 py-1.5 shadow-[0_0_16px_rgba(0,240,255,0.16)]">
                <img
                  src={getWeaponImageUrl(weaponArmorySpec)}
                  alt={weapon.name}
                  className="h-7 w-10 rounded object-cover border border-[#3B494B]/60 shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] font-bold text-[#00F0FF] uppercase">
                      {weaponArmorySpec.classLabel}
                    </span>
                    <span className="rounded bg-[#00F0FF]/18 px-1 py-0.5 font-mono text-[9px] font-extrabold leading-none text-[#7DF4FF]">
                      L{weaponLv}
                    </span>
                  </div>
                  <span className="font-['Space_Grotesk'] text-xs font-bold text-[#DBFCFF] truncate max-w-[125px] uppercase">
                    {weapon.name}
                  </span>
                </div>
              </div>

              {/* Active Weapon Stats + Right-Lane Gates + Dynamic Buff Chips */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-[#7DF4FF] font-bold">
                    <Zap className="h-3 w-3 text-[#00F0FF]" />
                    {trans.hud.damage} <strong className="text-[#FFC080]">{effectiveDamage}</strong>
                    <span className="text-[#3B494B]">•</span>
                    {trans.hud.fireRate}{" "}
                    <strong className="text-[#10B981]">
                      {effectiveRate}
                      {trans.hud.perSec}
                    </strong>
                  </span>
                  {weapon.splashRadius > 0 && (
                    <span className="rounded bg-[#FF2A6D]/25 border border-[#FF2A6D]/45 px-1.5 py-0.5 text-[9px] font-bold text-[#FFB4AB]">
                      {trans.hud.splash}
                    </span>
                  )}
                  {overdriveLevel > 0 && (
                    <span className="rounded bg-[#A855F7]/20 border border-[#A855F7]/45 px-1.5 py-0.5 text-[9px] font-bold text-[#E9D5FF]">
                      Lv.+{overdriveLevel}
                    </span>
                  )}
                  <span className="rounded bg-[#0B0E15] border border-[#3B494B]/45 px-1.5 py-0.5 text-[9px] font-bold text-[#7DF4FF]">
                    {trans.hud.overdriveBuffShort}{" "}
                    {formatText(trans.hud.gatesRemaining, {
                      left: remainingGatesCount,
                      max: rightLaneGates.length,
                    })}
                  </span>
                </div>

                {activeBuffChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {activeBuffChips.map((chip) => (
                      <span
                        key={chip.label}
                        className="rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide"
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
            </div>

            {/* BOTTOM-CENTER + RIGHT WRAPPED CLEANLY FOR BOTH MOBILE & DESKTOP */}
            <div className="contents lg:flex lg:flex-1 lg:items-center lg:gap-4">
              {/* Mobile thumb row combines [◀] + [RAGE] + [▶]; Desktop splits Center Rage & Right Move */}
              <div className="flex items-center gap-2 lg:contents">
                {/* Mobile Left Move */}
                <button
                  type="button"
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
                  className="lg:hidden h-12 w-16 shrink-0 rounded-xl bg-[#00F0FF] text-[#00363A] font-mono font-black flex items-center justify-center active:scale-95 touch-none select-none shadow-[0_0_16px_rgba(0,240,255,0.28)]"
                >
                  <ChevronLeft className="h-7 w-7 stroke-[2.75]" />
                </button>

                {/* Glowing Rage Ultimate Meter / Button ([R]) */}
                <div className="flex-1 flex flex-col items-center min-w-0 max-w-xl mx-auto w-full">
                  <div className="flex items-center justify-between w-full mb-1 px-0.5">
                    <div className="flex items-center gap-1.5 font-['Space_Grotesk'] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#FFC080] truncate">
                      <Flame
                        className={`h-3.5 w-3.5 shrink-0 ${
                          rageReady ? "text-[#FE9800] animate-bounce" : "text-[#849495]"
                        }`}
                      />
                      <span className="truncate">
                        [R] {rageActive ? ragingSkillName : readySkillName}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[11px] sm:text-xs font-extrabold tabular-nums ${
                        rageReady || rageActive ? "text-[#FFC080]" : "text-[#7DF4FF]"
                      }`}
                    >
                      {rageActive
                        ? `${rageTimeLeft.toFixed(1)}s`
                        : rageReady
                          ? "100% READY"
                          : `${ragePercent}%`}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!rageReady || gameStatus !== "PLAYING"}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.currentTarget.blur();
                      activateRage();
                    }}
                    className={`relative w-full h-10 sm:h-10 rounded-xl overflow-hidden border flex items-center justify-center transition-all touch-none select-none ${
                      rageActive || icbmAiming || icbmPending !== null
                        ? "border-[#FE9800] bg-[#2C1600]/80 text-[#FFC080] shadow-[0_0_20px_rgba(254,152,0,0.35)]"
                        : rageReady && gameStatus === "PLAYING"
                          ? "border-[#FFC080]/80 bg-[#0B0E15] text-[#002022] shadow-[0_0_26px_rgba(254,152,0,0.45)] cursor-pointer active:scale-[0.99] animate-pulse"
                          : "border-[#3B494B]/50 bg-[#0B0E15] text-[#B9CACB] cursor-default"
                    }`}
                  >
                    {/* Progress Fill */}
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-150 ${
                        rageReady
                          ? "w-full bg-gradient-to-r from-[#FE9800] via-[#FFC080] to-[#00F0FF]"
                          : rageActive
                            ? "w-full bg-gradient-to-r from-[#FE9800]/35 to-[#FF2A6D]/35"
                            : "bg-gradient-to-r from-[#006970] to-[#00F0FF]/80"
                      }`}
                      style={
                        rageReady || rageActive
                          ? undefined
                          : { width: `${ragePercent}%` }
                      }
                    />
                    <div className="relative z-10 flex items-center gap-2 px-3 min-w-0">
                      {rageReady && (
                        <kbd className="rounded bg-[#0B0E15]/85 text-[#FFC080] px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wider shrink-0">
                          [R]
                        </kbd>
                      )}
                      <span
                        className={`font-mono text-[11px] sm:text-xs font-extrabold uppercase tracking-wider truncate ${
                          rageReady && gameStatus === "PLAYING"
                            ? "text-[#002022]"
                            : "text-[#E1E2EC]"
                        }`}
                      >
                        {rageStatusText}
                      </span>
                    </div>
                  </button>

                  {/* Compact Keybind Strip (Desktop only) */}
                  <div className="hidden lg:flex items-center justify-center gap-3 mt-1 font-mono text-[10px] text-[#849495]">
                    <span>
                      <strong className="text-[#DBFCFF]">A / D</strong> {trans.hud.keyMove}
                    </span>
                    <span className="text-[#3B494B]">•</span>
                    <span>
                      <strong className="text-[#FFC080]">R</strong> {trans.hud.keyRage}
                    </span>
                    <span className="text-[#3B494B]">•</span>
                    <span>
                      <strong className="text-[#DBFCFF]">V</strong> {trans.hud.keyCamera}
                    </span>
                  </div>
                </div>

                {/* Mobile Manual Fire */}
                {!autoFire && gameStatus === "PLAYING" && (
                  <button
                    type="button"
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
                    className="lg:hidden h-12 px-3 shrink-0 rounded-xl border border-[#FF2A6D]/70 bg-[#93000A]/80 font-mono text-[11px] font-black text-[#FFDAD6] active:scale-95 touch-none select-none"
                  >
                    {trans.hud.fireBtn}
                  </button>
                )}

                {/* Mobile Right Move */}
                <button
                  type="button"
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
                  className="lg:hidden h-12 w-16 shrink-0 rounded-xl bg-[#1D1F27] border border-[#3B494B]/60 text-[#DBFCFF] font-mono font-black flex items-center justify-center active:scale-95 touch-none select-none"
                >
                  <ChevronRight className="h-7 w-7 stroke-[2.75]" />
                </button>
              </div>

              {/* Desktop Bottom-Right Movement Dock (Stitch style) */}
              <div className="hidden lg:flex items-center gap-1.5 bg-[#0B0E15]/90 p-1 rounded-xl border border-[#3B494B]/40 shrink-0">
                <button
                  type="button"
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
                  className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-[#00F0FF] text-[#00363A] font-mono cursor-pointer active:scale-95 select-none shadow-[0_0_12px_rgba(0,240,255,0.3)] min-w-[78px]"
                >
                  <span className="text-[11px] font-extrabold leading-none">[A] / [←]</span>
                  <span className="text-[9px] font-bold uppercase tracking-tight mt-0.5">
                    {trans.hud.moveLeft}
                  </span>
                </button>

                <button
                  type="button"
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
                  className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-[#1D1F27] border border-[#3B494B]/45 text-[#B9CACB] hover:bg-[#272A32] hover:text-[#DBFCFF] font-mono cursor-pointer active:scale-95 select-none min-w-[78px]"
                >
                  <span className="text-[11px] font-extrabold leading-none">[D] / [→]</span>
                  <span className="text-[9px] font-bold uppercase tracking-tight mt-0.5">
                    {trans.hud.moveRight}
                  </span>
                </button>

                {!autoFire && gameStatus === "PLAYING" && (
                  <button
                    type="button"
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
                    className="self-stretch px-3 rounded-lg border border-[#FF2A6D]/60 bg-[#93000A]/65 font-mono text-[11px] font-extrabold uppercase text-[#FFDAD6] hover:bg-[#93000A] active:scale-95 cursor-pointer select-none"
                  >
                    {trans.hud.fireBtn}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chờ nạp tài nguyên game */}
      <AnimatePresence>
        {assetsWaitingToStart && !assetsReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#070B14]/88 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-[#3B494B]/60 bg-[#191B23]/96 p-6 text-center text-[#E1E2EC] shadow-2xl"
            >
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute h-16 w-16 rounded-full border-4 border-[#00F0FF]/20" />
                <Loader2 className="h-10 w-10 animate-spin text-[#00F0FF]" />
              </div>

              <h3 className="font-['Space_Grotesk'] text-lg font-bold tracking-wide text-[#DBFCFF] uppercase">
                {trans.menu.loadingAssetsTitle}
              </h3>

              <div className="mt-3 flex items-baseline justify-center gap-1.5 font-mono">
                <span className="text-3xl font-extrabold text-[#FFC080] tabular-nums">
                  {assetsPercent}%
                </span>
                <span className="text-xs font-semibold text-[#849495]">
                  ({assetsLoadedCount}/{assetsTotal} {trans.menu.filesUnit})
                </span>
              </div>

              <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#0B0E15]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#006970] via-[#00F0FF] to-[#FE9800] transition-all duration-300"
                  style={{ width: `${assetsPercent}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#B9CACB]">
                {trans.menu.loadingAssetsHint}
              </p>

              {assetsError && (
                <div className="mt-4 w-full rounded-lg border border-[#FF2A6D]/45 bg-[#93000A]/30 p-3 text-xs text-[#FFB4AB]">
                  <p className="font-semibold">{assetsError}</p>
                  <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startBackgroundPreload()}
                      className="border-[#3B494B] bg-[#1D1F27] text-xs text-[#E1E2EC] hover:bg-[#272A32]"
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
                  className="text-xs text-[#849495] hover:text-[#E1E2EC]"
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
