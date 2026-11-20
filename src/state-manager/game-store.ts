import { create } from "zustand";
import { CameraMode, GameStatus, IcbmStrikeDTO, LeaderboardEntryDTO } from "@/dto/GameDTO";
import { weaponService } from "@/service/weapon-service";
import { ARENA_CONFIG, ICBM_CONFIG, RAGE_CONFIG } from "@/service/game-constants";
import { soundService } from "@/service/sound-service";
import { playerStorageService } from "@/service/player-storage-service";
import { leaderboardService, LeaderboardSource } from "@/service/leaderboard-service";
import { isFirebaseReady } from "@/lib/firebase";
import { useAppStore } from "@/state-manager/app-store";
import { formatText, getTranslation } from "@/lang/useTransClientSide";

const getCurrentTrans = () => getTranslation(useAppStore.getState().locale);

interface GameState {
  gameStatus: GameStatus;
  playerId: string;
  playerName: string;
  leaderboard: LeaderboardEntryDTO[];
  leaderboardSource: LeaderboardSource;
  profileLoaded: boolean;
  score: number;
  highScore: number;
  hp: number;
  maxHp: number;

  // Hệ thống 5 màn chơi
  wave: number;
  maxWaves: number;
  stageKills: number;
  stageTargetKills: number;
  kills: number;

  // Vũ khí & Hòm item bên làn phải (Kiểu B: Đứng cố định / Reset theo đợt)
  weaponIndex: number;
  overdriveLevel: number;
  crateBatch: number;
  crateHits: number;
  crateTargetHits: number;
  rewardBanner: string | null;

  // Thanh Nộ & Mưa đạn / Tên Lửa Liên Lục Địa (kích hoạt chủ động)
  rage: number;
  rageReady: boolean;
  rageActive: boolean;
  rageTimeLeft: number;
  icbmAiming: boolean;
  icbmPending: IcbmStrikeDTO | null;

  // Điều khiển & Camera & Âm thanh
  cameraMode: CameraMode;
  autoFire: boolean;
  isMuted: boolean;
  sessionId: number;

  // Tải ngầm tài nguyên 3D & Chặn Start Game khi chưa xong
  assetsReady: boolean;
  assetsLoading: boolean;
  assetsLoadedCount: number;
  assetsTotal: number;
  assetsPercent: number;
  assetsError: string | null;
  assetsWaitingToStart: boolean;
}

interface GameActions {
  hydrateProfile: () => void;
  setPlayerName: (name: string) => string;
  setLeaderboardData: (entries: LeaderboardEntryDTO[], source: LeaderboardSource) => void;
  setAssetProgress: (loadedCount: number, total: number) => void;
  setAssetsReady: (ready: boolean) => void;
  setAssetsError: (error: string | null) => void;
  setAssetsWaitingToStart: (waiting: boolean) => void;
  startGame: () => void;
  returnToMenu: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  togglePause: () => void;
  setCameraMode: (mode: CameraMode) => void;
  cycleCameraMode: () => void;
  toggleAutoFire: () => void;
  toggleMute: () => void;
  addRage: (amount: number) => void;
  activateRage: () => void;
  launchIcbm: (targetX: number, targetZ: number, startX: number) => void;
  finishIcbmStrike: () => void;
  tickRage: (delta: number) => void;
  registerEnemyKill: (points: number) => void;
  registerCrateHit: () => { upgraded: boolean; label: string | null };
  damagePlayer: (amount: number) => void;
  clearRewardBanner: () => void;
}

const INITIAL_MAX_HP = 5;
const TOTAL_STAGES = weaponService.getTotalStages();
const CAMERA_ORDER: CameraMode[] = ["TOP_DOWN", "THIRD_PERSON", "FREE_ORBIT"];

function persistAndSyncMatchResult(input: {
  playerName: string;
  score: number;
  wave: number;
  kills: number;
  victory: boolean;
}): { localBoard: LeaderboardEntryDTO[]; localBest: number; playerId: string } {
  const localBoard = playerStorageService.recordMatchResult(input);
  const playerId = playerStorageService.getOrCreatePlayerId(input.playerName);
  const localBest = playerStorageService.getPlayerBestScore(
    input.playerName,
    localBoard,
    playerId
  );

  void leaderboardService.syncMatchToCloud(input).then(({ entries, source }) => {
    useGameStore.setState((state) => {
      if (source !== "firebase") {
        return { leaderboardSource: source };
      }
      const cloudBest = playerStorageService.getPlayerBestScore(
        state.playerName,
        entries,
        state.playerId
      );
      return {
        leaderboard: entries,
        leaderboardSource: source,
        highScore: Math.max(state.highScore, cloudBest),
      };
    });
  });

  return { localBoard, localBest, playerId };
}

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  gameStatus: "MENU",
  playerId: "",
  playerName: "",
  leaderboard: [],
  leaderboardSource: "local",
  profileLoaded: false,
  score: 0,
  highScore: 0,
  hp: INITIAL_MAX_HP,
  maxHp: INITIAL_MAX_HP,

  wave: 1,
  maxWaves: TOTAL_STAGES,
  stageKills: 0,
  stageTargetKills: weaponService.getStageConfig(1).targetKills,
  kills: 0,

  weaponIndex: 0,
  overdriveLevel: 0,
  crateBatch: 0,
  crateHits: 0,
  crateTargetHits: weaponService.getCrateTargetForBatch(0),
  rewardBanner: null,

  rage: 0,
  rageReady: false,
  rageActive: false,
  rageTimeLeft: 0,
  icbmAiming: false,
  icbmPending: null,

  cameraMode: "THIRD_PERSON",
  autoFire: true,
  isMuted: false,
  sessionId: 0,

  assetsReady: false,
  assetsLoading: false,
  assetsLoadedCount: 0,
  assetsTotal: 6,
  assetsPercent: 0,
  assetsError: null,
  assetsWaitingToStart: false,

  setAssetProgress: (loadedCount, total) => {
    const percent =
      total > 0 ? Math.min(100, Math.round((loadedCount / total) * 100)) : 100;
    set({
      assetsLoadedCount: loadedCount,
      assetsTotal: total,
      assetsPercent: percent,
      assetsReady: loadedCount >= total,
      assetsLoading: loadedCount < total,
      assetsError: null,
    });
  },

  setAssetsReady: (ready) => set({ assetsReady: ready, assetsLoading: !ready }),

  setAssetsError: (error) => set({ assetsError: error, assetsLoading: false }),

  setAssetsWaitingToStart: (waiting) => set({ assetsWaitingToStart: waiting }),

  hydrateProfile: () => {
    const savedName = playerStorageService.getPlayerName();
    const savedId = savedName ? playerStorageService.getOrCreatePlayerId(savedName) : "";
    const board = playerStorageService.getLeaderboard();
    const best = playerStorageService.getPlayerBestScore(savedName, board, savedId);
    set({
      playerId: savedId,
      playerName: savedName,
      leaderboard: board,
      leaderboardSource: isFirebaseReady() ? "firebase" : "local",
      highScore: best,
      profileLoaded: true,
    });
  },

  setPlayerName: (name) => {
    const saved = playerStorageService.setPlayerName(name);
    const nextId = saved ? playerStorageService.getOrCreatePlayerId(saved) : "";
    const board =
      get().leaderboard.length > 0 ? get().leaderboard : playerStorageService.getLeaderboard();
    const best = playerStorageService.getPlayerBestScore(saved, board, nextId);
    set({
      playerId: nextId,
      playerName: saved,
      leaderboard: board,
      highScore: best,
    });
    return saved;
  },

  setLeaderboardData: (entries, source) => {
    const state = get();
    const best = playerStorageService.getPlayerBestScore(
      state.playerName,
      entries,
      state.playerId
    );
    set({
      leaderboard: entries,
      leaderboardSource: source,
      highScore: state.gameStatus === "PLAYING" ? Math.max(state.highScore, best) : best,
    });
  },

  startGame: () => {
    soundService.unlock();
    set((state) => {
      const best = playerStorageService.getPlayerBestScore(
        state.playerName,
        state.leaderboard,
        state.playerId
      );
      return {
        gameStatus: "PLAYING",
        score: 0,
        highScore: best,
        hp: INITIAL_MAX_HP,
        maxHp: INITIAL_MAX_HP,
        wave: 1,
        maxWaves: TOTAL_STAGES,
        stageKills: 0,
        stageTargetKills: weaponService.getStageConfig(1).targetKills,
        kills: 0,
        weaponIndex: 0,
        overdriveLevel: 0,
        crateBatch: 0,
        crateHits: 0,
        crateTargetHits: weaponService.getCrateTargetForBatch(0),
        rewardBanner: getCurrentTrans().banners.stage1Start,
        rage: 0,
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        icbmAiming: false,
        icbmPending: null,
        sessionId: state.sessionId + 1,
      };
    });
  },

  returnToMenu: () => {
    const state = get();
    let nextBoard = state.leaderboard;
    let nextHigh = state.highScore;
    if ((state.gameStatus === "PLAYING" || state.gameStatus === "PAUSED") && state.score > 0) {
      const { localBoard, localBest } = persistAndSyncMatchResult({
        playerName: state.playerName,
        score: state.score,
        wave: state.wave,
        kills: state.kills,
        victory: false,
      });
      nextBoard = localBoard;
      nextHigh = Math.max(nextHigh, localBest);
    }
    set({
      gameStatus: "MENU",
      leaderboard: nextBoard,
      highScore: nextHigh,
      rageReady: false,
      rageActive: false,
      rageTimeLeft: 0,
      icbmAiming: false,
      icbmPending: null,
      rewardBanner: null,
    });
  },

  pauseGame: () =>
    set((state) => (state.gameStatus === "PLAYING" ? { gameStatus: "PAUSED" } : {})),

  resumeGame: () =>
    set((state) => (state.gameStatus === "PAUSED" ? { gameStatus: "PLAYING" } : {})),

  togglePause: () =>
    set((state) => {
      if (state.gameStatus === "PLAYING") return { gameStatus: "PAUSED" };
      if (state.gameStatus === "PAUSED") return { gameStatus: "PLAYING" };
      return {};
    }),

  setCameraMode: (cameraMode) => set({ cameraMode }),

  cycleCameraMode: () =>
    set((state) => {
      const idx = CAMERA_ORDER.indexOf(state.cameraMode);
      const next = CAMERA_ORDER[(idx + 1) % CAMERA_ORDER.length];
      return { cameraMode: next };
    }),

  toggleAutoFire: () => set((state) => ({ autoFire: !state.autoFire })),

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    soundService.setMuted(nextMuted);
    set({ isMuted: nextMuted });
  },

  addRage: (amount) => {
    const state = get();
    if (
      state.gameStatus !== "PLAYING" ||
      state.rageActive ||
      state.rageReady ||
      state.icbmAiming ||
      state.icbmPending !== null ||
      amount <= 0
    ) {
      return;
    }
    const nextRage = Math.min(RAGE_CONFIG.maxRage, state.rage + amount);
    if (nextRage >= RAGE_CONFIG.maxRage) {
      const weapon = weaponService.getWeaponByIndex(state.weaponIndex);
      const trans = getCurrentTrans();
      soundService.play("rageReady");
      set({
        rage: RAGE_CONFIG.maxRage,
        rageReady: true,
        rewardBanner:
          weapon.id === "icbm"
            ? trans.banners.rageReadyIcbm
            : trans.banners.rageReadyNormal,
      });
      return;
    }
    set({ rage: nextRage });
  },

  activateRage: () => {
    const state = get();
    if (state.gameStatus !== "PLAYING" || state.rageActive || state.icbmAiming || state.icbmPending !== null) {
      return;
    }
    if (!state.rageReady) {
      const pct = Math.round((state.rage / RAGE_CONFIG.maxRage) * 100);
      set({ rewardBanner: formatText(getCurrentTrans().banners.rageNotReady, { pct }) });
      return;
    }
    soundService.unlock();
    const weapon = weaponService.getWeaponByIndex(state.weaponIndex);
    const trans = getCurrentTrans();
    if (weapon.id === "icbm") {
      soundService.play("rageReady");
      set({
        rageReady: false,
        icbmAiming: true,
        rewardBanner: trans.banners.icbmAiming,
      });
      return;
    }

    soundService.play("rageActivate");
    set({
      rage: RAGE_CONFIG.maxRage,
      rageReady: false,
      rageActive: true,
      rageTimeLeft: RAGE_CONFIG.durationSeconds,
      rewardBanner: formatText(trans.banners.rageActivated, {
        rate: RAGE_CONFIG.fireRateMultiplier,
        count: RAGE_CONFIG.bulletCountMultiplier,
        sec: RAGE_CONFIG.durationSeconds,
      }),
    });
  },

  launchIcbm: (targetX, targetZ, startX) => {
    const state = get();
    if (state.gameStatus !== "PLAYING" || !state.icbmAiming) {
      return;
    }
    soundService.play("icbmLaunch");
    set({
      icbmAiming: false,
      icbmPending: {
        startX,
        startZ: ARENA_CONFIG.playerZ,
        targetX,
        targetZ,
        delaySeconds: ICBM_CONFIG.impactDelaySeconds,
      },
      rewardBanner: formatText(getCurrentTrans().banners.icbmLaunched, {
        sec: ICBM_CONFIG.impactDelaySeconds,
      }),
    });
  },

  finishIcbmStrike: () =>
    set({
      icbmPending: null,
      icbmAiming: false,
      rage: 0,
      rageReady: false,
      rageActive: false,
      rageTimeLeft: 0,
    }),

  tickRage: (delta) =>
    set((state) => {
      if (state.gameStatus !== "PLAYING" || !state.rageActive) {
        return {};
      }
      const nextTime = Math.max(0, state.rageTimeLeft - delta);
      if (nextTime <= 0) {
        return {
          rageActive: false,
          rageReady: false,
          rageTimeLeft: 0,
          rage: 0,
        };
      }
      return {
        rageTimeLeft: nextTime,
        rage: (nextTime / RAGE_CONFIG.durationSeconds) * RAGE_CONFIG.maxRage,
      };
    }),

  registerEnemyKill: (points) => {
    const state = get();
    if (state.gameStatus !== "PLAYING") return;

    const nextKills = state.kills + 1;
    const nextScore = state.score + points;
    const nextHighScore = Math.max(state.highScore, nextScore);
    const nextStageKills = state.stageKills + 1;

    // Chưa đủ chỉ tiêu quái của màn hiện tại
    if (nextStageKills < state.stageTargetKills) {
      set({
        kills: nextKills,
        stageKills: nextStageKills,
        score: nextScore,
        highScore: nextHighScore,
      });
      return;
    }

    // Đã hoàn thành màn cuối -> Chiến thắng!
    if (state.wave >= state.maxWaves) {
      soundService.play("victory");
      const finalScore = nextScore + 1000;
      const { localBoard, localBest } = persistAndSyncMatchResult({
        playerName: state.playerName,
        score: finalScore,
        wave: state.wave,
        kills: nextKills,
        victory: true,
      });
      set({
        kills: nextKills,
        stageKills: state.stageTargetKills,
        score: finalScore,
        highScore: Math.max(nextHighScore, finalScore, localBest),
        leaderboard: localBoard,
        gameStatus: "VICTORY",
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        icbmAiming: false,
        icbmPending: null,
        rewardBanner: formatText(getCurrentTrans().banners.victory, {
          max: state.maxWaves,
        }),
      });
      return;
    }

    // Qua màn tiếp theo (Kiểm tra xem có vũ khí mới được mở khóa ở màn mới không)
    const nextWave = state.wave + 1;
    const nextStageCfg = weaponService.getStageConfig(nextWave);
    const trans = getCurrentTrans();
    soundService.play(nextStageCfg.isBossStage ? "bossWarning" : "stageClear");
    const nextWeaponNow = weaponService.getNextWeapon(state.weaponIndex, nextWave);
    const hadWeaponBefore = weaponService.getNextWeapon(state.weaponIndex, state.wave);
    const unlockNotice =
      !hadWeaponBefore && nextWeaponNow
        ? formatText(trans.banners.weaponAppeared, {
            name: trans.weapons[nextWeaponNow.id],
          })
        : "";
    const bannerText = nextStageCfg.isBossStage
      ? `${formatText(trans.banners.bossStage, {
          wave: nextWave,
          max: state.maxWaves,
        })}${unlockNotice}`
      : `${formatText(trans.banners.stageClear, { wave: nextWave })}${unlockNotice}`;

    set({
      kills: nextKills,
      wave: nextWave,
      stageKills: 0,
      stageTargetKills: nextStageCfg.targetKills,
      score: nextScore + 100,
      highScore: Math.max(nextHighScore, nextScore + 100),
      rewardBanner: bannerText,
    });
  },

  registerCrateHit: () => {
    const state = get();
    if (state.gameStatus !== "PLAYING") {
      return { upgraded: false, label: null };
    }

    // Không cho ăn item mãi nữa: nếu đã max hoặc vũ khí cuối chưa mở khóa (chưa tới màn cuối) thì dừng
    const nextWeapon = weaponService.getNextWeapon(state.weaponIndex, state.wave);
    if (!nextWeapon) {
      return { upgraded: false, label: null };
    }

    const nextHits = state.crateHits + 1;
    if (nextHits < state.crateTargetHits) {
      set({ crateHits: nextHits });
      return { upgraded: false, label: null };
    }

    // Đủ số phát bắn -> Mở khóa vũ khí tiếp theo (Lục -> AKA -> Súng Máy -> Đại Bác -> Tên Lửa Liên Lục Địa)
    const nextBatch = state.crateBatch + 1;
    const nextTarget = weaponService.getCrateTargetForBatch(nextBatch);
    const nextWeaponIndex = state.weaponIndex + 1;
    const trans = getCurrentTrans();
    const rewardLabel = formatText(trans.banners.weaponUnlocked, {
      name: trans.weapons[nextWeapon.id],
    });
    const nextScore = state.score + 150;

    soundService.play("upgradeWeapon");
    set({
      weaponIndex: nextWeaponIndex,
      crateBatch: nextBatch,
      crateHits: 0,
      crateTargetHits: nextTarget,
      score: nextScore,
      highScore: Math.max(state.highScore, nextScore),
      rewardBanner: rewardLabel,
    });

    return { upgraded: true, label: rewardLabel };
  },

  damagePlayer: (amount) => {
    const state = get();
    if (state.gameStatus !== "PLAYING") return;
    const nextHp = Math.max(0, state.hp - amount);
    soundService.play(nextHp <= 0 ? "gameOver" : "playerHit");
    if (nextHp <= 0) {
      const { localBoard, localBest } = persistAndSyncMatchResult({
        playerName: state.playerName,
        score: state.score,
        wave: state.wave,
        kills: state.kills,
        victory: false,
      });
      set({
        hp: 0,
        gameStatus: "GAME_OVER",
        highScore: Math.max(state.highScore, localBest),
        leaderboard: localBoard,
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        icbmAiming: false,
        icbmPending: null,
      });
      return;
    }
    set({
      hp: nextHp,
    });
  },

  clearRewardBanner: () => set({ rewardBanner: null }),
}));

export default useGameStore;
