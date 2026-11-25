import { create } from "zustand";
import { CameraMode, GameStatus, IcbmStrikeDTO, LeaderboardEntryDTO } from "@/dto/GameDTO";
import { weaponService } from "@/service/weapon-service";
import { ARENA_CONFIG, ICBM_CONFIG, RAGE_CONFIG } from "@/service/game-constants";
import { soundService } from "@/service/sound-service";
import { leaderboardService } from "@/service/leaderboard-service";
import {
  ARMORY_WEAPONS,
  DEFAULT_LOADOUT_IDS,
  MAX_LOADOUT_SLOTS,
  MAX_WEAPON_LEVEL,
  getWeaponUpgradeCost,
} from "@/service/armory-catalog";
import {
  PlayerSaveData,
  createDefaultSaveData,
  playerSaveService,
} from "@/service/player-save-service";
import {
  PlatformCapabilities,
  PlatformPlayer,
  PlatformTarget,
  getPlatformAdapter,
} from "@/platform";
import { normalizeLocale, useAppStore } from "@/state-manager/app-store";
import { formatText, getTranslation } from "@/lang/useTransClientSide";

const getCurrentTrans = () => getTranslation(useAppStore.getState().locale);

export type MenuScreen = "LOBBY" | "WORLD_MAP" | "ARMORY";
export type ArmoryTab = "UPGRADES" | "PETS" | "ARSENAL";

interface GameState {
  gameStatus: GameStatus;
  menuScreen: MenuScreen;
  previousMenuScreen: "LOBBY" | "WORLD_MAP";
  armoryTab: ArmoryTab;
  armorySaving: boolean;
  selectedChapter: number;

  // Platform & Account (selected via NEXT_PUBLIC_PLATFORM at build time)
  platformTarget: PlatformTarget | null;
  platformCapabilities: PlatformCapabilities | null;
  platformReady: boolean;
  platformError: string | null;
  authLoading: boolean;
  authError: string | null;
  player: PlatformPlayer | null;
  playerId: string;
  playerName: string;
  profileLoaded: boolean;

  // Cloud / Platform Save
  saveData: PlayerSaveData;
  saveError: string | null;

  // Global Firestore Leaderboard (no localStorage fallback)
  leaderboard: LeaderboardEntryDTO[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  scoreSyncError: string | null;

  // Portal Ads state
  adLoading: boolean;
  adError: string | null;
  rewardedAdClaimed: boolean;

  score: number;
  highScore: number;
  hp: number;
  maxHp: number;

  // Stages / Waves
  wave: number;
  maxWaves: number;
  stageKills: number;
  stageTargetKills: number;
  kills: number;

  // Active 3-Weapon Combat Loadout & Right-Lane Overdrive Buff Pedestal
  combatLoadoutIds: string[];
  activeLoadoutSlot: number;
  overdriveLevel: number;
  crateHits: number;
  crateTargetHits: number;
  rewardBanner: string | null;

  // Rage & ICBM
  rage: number;
  rageReady: boolean;
  rageActive: boolean;
  rageTimeLeft: number;
  icbmAiming: boolean;
  icbmPending: IcbmStrikeDTO | null;

  // Controls & Audio
  cameraMode: CameraMode;
  autoFire: boolean;
  isMuted: boolean;
  sessionId: number;

  // 3D Asset Preloading
  assetsReady: boolean;
  assetsLoading: boolean;
  assetsLoadedCount: number;
  assetsTotal: number;
  assetsPercent: number;
  assetsError: string | null;
  assetsWaitingToStart: boolean;
}

interface GameActions {
  initPlatformAndProfile: () => Promise<void>;
  loginWithPlatform: () => Promise<void>;
  logoutFromPlatform: () => Promise<void>;
  claimRewardedAdPerk: () => Promise<void>;
  saveLocalePreference: (locale: string) => Promise<void>;
  setLeaderboardData: (entries: LeaderboardEntryDTO[]) => void;
  setLeaderboardError: (error: string | null) => void;
  setAssetProgress: (loadedCount: number, total: number) => void;
  setAssetsReady: (ready: boolean) => void;
  setAssetsError: (error: string | null) => void;
  setAssetsWaitingToStart: (waiting: boolean) => void;
  openWorldMap: () => void;
  openLobby: () => void;
  openArmory: (tab?: ArmoryTab) => void;
  closeArmory: () => void;
  setArmoryTab: (tab: ArmoryTab) => void;
  assignWeaponToLoadout: (weaponId: string, slotIndex?: number) => Promise<void>;
  removeWeaponFromLoadout: (weaponId: string) => Promise<void>;
  upgradeArmoryWeapon: (weaponId: string) => Promise<void>;
  switchCombatWeaponSlot: (slotIndex: number) => void;
  cycleCombatWeapon: () => void;
  selectChapter: (chapterId: number) => void;
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

let authChangeUnsubscribe: (() => void) | null = null;
let initInFlightPromise: Promise<void> | null = null;

function resolveActiveCombatWeapon(state: {
  combatLoadoutIds: string[];
  activeLoadoutSlot: number;
  saveData: PlayerSaveData;
}) {
  const id =
    state.combatLoadoutIds[state.activeLoadoutSlot] ??
    state.combatLoadoutIds[0] ??
    DEFAULT_LOADOUT_IDS[0];
  const level = state.saveData.weaponLevels[id] ?? 1;
  return weaponService.resolveCombatWeapon(id, level);
}

function computeBestScore(
  player: PlatformPlayer | null,
  board: LeaderboardEntryDTO[],
  saveData: PlayerSaveData
): number {
  const boardBest = player
    ? board.find((entry) => entry.id === player.id)?.score ?? 0
    : 0;
  return Math.max(boardBest, saveData.bestScore);
}

function safeNotifyPlatform(action: (adapter: ReturnType<typeof getPlatformAdapter>) => void): void {
  if (!useGameStore.getState().platformReady) return;
  try {
    action(getPlatformAdapter());
  } catch (err) {
    console.error("[Platform] Lifecycle notification failed:", err);
  }
}

function syncPostMatchOutcome(input: {
  player: PlatformPlayer | null;
  score: number;
  wave: number;
  kills: number;
  victory: boolean;
}): void {
  const state = useGameStore.getState();

  // 1. Update platform/cloud save (avoid overwriting if initial load failed)
  if (state.platformReady && !state.saveError) {
    const nextUnlockedChapter =
      input.victory && state.selectedChapter >= state.saveData.unlockedChapter
        ? Math.min(10, state.selectedChapter + 1)
        : state.saveData.unlockedChapter;

    const nextSave: PlayerSaveData = {
      ...state.saveData,
      bestScore: Math.max(state.saveData.bestScore, input.score),
      totalKills: state.saveData.totalKills + input.kills,
      gamesPlayed: state.saveData.gamesPlayed + 1,
      unlockedChapter: nextUnlockedChapter,
    };

    void playerSaveService
      .writeSave(nextSave)
      .then((saved) => {
        useGameStore.setState((curr) => ({
          saveData: saved,
          saveError: null,
          highScore: Math.max(
            curr.highScore,
            computeBestScore(curr.player, curr.leaderboard, saved)
          ),
        }));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        useGameStore.setState({ saveError: message });
      });
  }

  // 2. Leaderboard score submission: strictly requires logged-in player (Guest plays without ranking)
  if (!input.player) {
    useGameStore.setState({ scoreSyncError: null });
    return;
  }

  void leaderboardService
    .syncMatchToCloud({
      player: input.player,
      score: input.score,
      wave: input.wave,
      kills: input.kills,
      victory: input.victory,
    })
    .then((entries) => {
      useGameStore.setState((curr) => ({
        leaderboard: entries,
        leaderboardError: null,
        scoreSyncError: null,
        highScore: Math.max(
          curr.highScore,
          computeBestScore(curr.player, entries, curr.saveData)
        ),
      }));
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      useGameStore.setState({ scoreSyncError: message });
    });
}

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  gameStatus: "MENU",
  menuScreen: "LOBBY",
  previousMenuScreen: "LOBBY",
  armoryTab: "ARSENAL",
  armorySaving: false,
  selectedChapter: 1,

  platformTarget: null,
  platformCapabilities: null,
  platformReady: false,
  platformError: null,
  authLoading: false,
  authError: null,
  player: null,
  playerId: "",
  playerName: "",
  profileLoaded: false,

  saveData: createDefaultSaveData(),
  saveError: null,

  leaderboard: [],
  leaderboardLoading: true,
  leaderboardError: null,
  scoreSyncError: null,

  adLoading: false,
  adError: null,
  rewardedAdClaimed: false,

  score: 0,
  highScore: 0,
  hp: INITIAL_MAX_HP,
  maxHp: INITIAL_MAX_HP,

  wave: 1,
  maxWaves: TOTAL_STAGES,
  stageKills: 0,
  stageTargetKills: weaponService.getStageConfig(1).targetKills,
  kills: 0,

  combatLoadoutIds: [...DEFAULT_LOADOUT_IDS],
  activeLoadoutSlot: 0,
  overdriveLevel: 0,
  crateHits: 0,
  crateTargetHits: weaponService.getOverdriveTargetHits(0),
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

  initPlatformAndProfile: async () => {
    if (get().platformReady && get().profileLoaded) return;
    if (initInFlightPromise) return initInFlightPromise;

    initInFlightPromise = (async () => {
      try {
        const adapter = getPlatformAdapter();
        set({
          platformTarget: adapter.target,
          platformCapabilities: adapter.capabilities,
          platformError: null,
        });

        await adapter.init();
        const player = await adapter.getPlayer();

        let loadedSave = createDefaultSaveData();
        let saveErr: string | null = null;
        try {
          loadedSave = await playerSaveService.loadSave();
          if (loadedSave.locale) {
            useAppStore.getState().setLocale(normalizeLocale(loadedSave.locale));
          }
        } catch (err) {
          saveErr = err instanceof Error ? err.message : String(err);
        }

        if (authChangeUnsubscribe) {
          authChangeUnsubscribe();
          authChangeUnsubscribe = null;
        }

        authChangeUnsubscribe = adapter.subscribeAuthChange((nextPlayer) => {
          void (async () => {
            try {
              const refreshedSave = await playerSaveService.loadSave();
              if (refreshedSave.locale) {
                useAppStore.getState().setLocale(normalizeLocale(refreshedSave.locale));
              }
              set((curr) => ({
                player: nextPlayer,
                playerId: nextPlayer?.id ?? "",
                playerName: nextPlayer?.name ?? "",
                saveData: refreshedSave,
                saveError: null,
                authError: null,
                highScore: computeBestScore(nextPlayer, curr.leaderboard, refreshedSave),
              }));
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              set({
                player: nextPlayer,
                playerId: nextPlayer?.id ?? "",
                playerName: nextPlayer?.name ?? "",
                saveError: msg,
              });
            }
          })();
        });

        set((curr) => ({
          platformReady: true,
          platformError: null,
          player,
          playerId: player?.id ?? "",
          playerName: player?.name ?? "",
          profileLoaded: true,
          saveData: loadedSave,
          saveError: saveErr,
          highScore: computeBestScore(player, curr.leaderboard, loadedSave),
        }));

        if (get().assetsReady) {
          adapter.notifyLoadingStop();
        } else {
          adapter.notifyLoadingStart();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set({
          platformReady: false,
          platformError: message,
          profileLoaded: true,
        });
      } finally {
        initInFlightPromise = null;
      }
    })();

    return initInFlightPromise;
  },

  loginWithPlatform: async () => {
    set({ authLoading: true, authError: null });
    try {
      const adapter = getPlatformAdapter();
      await adapter.init();
      const player = await adapter.promptLogin();
      const loadedSave = await playerSaveService.loadSave();
      if (loadedSave.locale) {
        useAppStore.getState().setLocale(normalizeLocale(loadedSave.locale));
      }
      set((curr) => ({
        player,
        playerId: player.id,
        playerName: player.name,
        saveData: loadedSave,
        saveError: null,
        authError: null,
        highScore: computeBestScore(player, curr.leaderboard, loadedSave),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ authError: message });
    } finally {
      set({ authLoading: false });
    }
  },

  logoutFromPlatform: async () => {
    set({ authLoading: true, authError: null });
    try {
      const adapter = getPlatformAdapter();
      await adapter.logout();
      const guestSave = await playerSaveService.loadSave();
      set((curr) => ({
        player: null,
        playerId: "",
        playerName: "",
        saveData: guestSave,
        saveError: null,
        scoreSyncError: null,
        highScore: computeBestScore(null, curr.leaderboard, guestSave),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ authError: message });
    } finally {
      set({ authLoading: false });
    }
  },

  claimRewardedAdPerk: async () => {
    set({ adLoading: true, adError: null });
    const prevMuted = get().isMuted;
    try {
      const adapter = getPlatformAdapter();
      await adapter.init();
      await adapter.requestRewardedAd({
        onStart: () => {
          soundService.setMuted(true);
        },
        onEnd: () => {
          soundService.setMuted(prevMuted);
        },
      });
      set({ rewardedAdClaimed: true, adError: null });
    } catch (err) {
      soundService.setMuted(prevMuted);
      const message = err instanceof Error ? err.message : String(err);
      set({ adError: message, rewardedAdClaimed: false });
    } finally {
      set({ adLoading: false });
    }
  },

  saveLocalePreference: async (locale) => {
    if (!get().platformReady || get().saveError) return;
    const nextSave: PlayerSaveData = {
      ...get().saveData,
      locale: normalizeLocale(locale),
    };
    try {
      const saved = await playerSaveService.writeSave(nextSave);
      set({ saveData: saved, saveError: null });
    } catch (err) {
      set({ saveError: err instanceof Error ? err.message : String(err) });
    }
  },

  setLeaderboardData: (entries) => {
    const state = get();
    const best = computeBestScore(state.player, entries, state.saveData);
    set({
      leaderboard: entries,
      leaderboardLoading: false,
      leaderboardError: null,
      highScore: state.gameStatus === "PLAYING" ? Math.max(state.highScore, best) : best,
    });
  },

  setLeaderboardError: (error) =>
    set({
      leaderboardLoading: false,
      leaderboardError: error,
    }),

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

  setAssetsReady: (ready) => {
    set({ assetsReady: ready, assetsLoading: !ready });
    if (ready) {
      safeNotifyPlatform((adapter) => adapter.notifyLoadingStop());
    }
  },

  setAssetsError: (error) => set({ assetsError: error, assetsLoading: false }),

  setAssetsWaitingToStart: (waiting) => set({ assetsWaitingToStart: waiting }),

  openWorldMap: () =>
    set((state) => ({
      menuScreen: "WORLD_MAP",
      selectedChapter: Math.min(10, Math.max(1, state.saveData.unlockedChapter)),
    })),

  openLobby: () => set({ menuScreen: "LOBBY" }),

  openArmory: (tab = "ARSENAL") =>
    set((state) => ({
      menuScreen: "ARMORY",
      armoryTab: tab,
      previousMenuScreen: state.menuScreen === "WORLD_MAP" ? "WORLD_MAP" : "LOBBY",
    })),

  closeArmory: () =>
    set((state) => ({
      menuScreen: state.previousMenuScreen,
    })),

  setArmoryTab: (tab) => set({ armoryTab: tab }),

  assignWeaponToLoadout: async (weaponId, slotIndex) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    const weapon = ARMORY_WEAPONS.find((item) => item.id === weaponId);
    if (!weapon || state.saveData.unlockedChapter < weapon.unlockChapter) return;

    const current = [...state.saveData.equippedLoadoutIds];
    const existingIdx = current.indexOf(weaponId);

    if (typeof slotIndex === "number" && slotIndex >= 0 && slotIndex < MAX_LOADOUT_SLOTS) {
      if (existingIdx !== -1) {
        if (existingIdx === slotIndex) return;
        if (slotIndex < current.length) {
          const displaced = current[slotIndex];
          current[slotIndex] = weaponId;
          current[existingIdx] = displaced;
        } else {
          current.splice(existingIdx, 1);
          current.push(weaponId);
        }
      } else if (slotIndex < current.length) {
        current[slotIndex] = weaponId;
      } else {
        current.push(weaponId);
      }
    } else {
      if (existingIdx !== -1) return;
      if (current.length < MAX_LOADOUT_SLOTS) {
        current.push(weaponId);
      } else {
        current[MAX_LOADOUT_SLOTS - 1] = weaponId;
      }
    }

    set({ armorySaving: true });
    const nextSave: PlayerSaveData = {
      ...state.saveData,
      equippedWeaponId: current[0],
      equippedLoadoutIds: current,
    };
    try {
      const saved = await playerSaveService.writeSave(nextSave);
      set({ saveData: saved, saveError: null, armorySaving: false });
    } catch (err) {
      set({
        saveError: err instanceof Error ? err.message : String(err),
        armorySaving: false,
      });
    }
  },

  removeWeaponFromLoadout: async (weaponId) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    const current = state.saveData.equippedLoadoutIds;
    if (current.length <= 1 || !current.includes(weaponId)) return;

    const nextLoadout = current.filter((id) => id !== weaponId);
    set({ armorySaving: true });
    const nextSave: PlayerSaveData = {
      ...state.saveData,
      equippedWeaponId: nextLoadout[0],
      equippedLoadoutIds: nextLoadout,
    };
    try {
      const saved = await playerSaveService.writeSave(nextSave);
      set({ saveData: saved, saveError: null, armorySaving: false });
    } catch (err) {
      set({
        saveError: err instanceof Error ? err.message : String(err),
        armorySaving: false,
      });
    }
  },

  upgradeArmoryWeapon: async (weaponId) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    const weapon = ARMORY_WEAPONS.find((item) => item.id === weaponId);
    if (!weapon) return;
    if (state.saveData.unlockedChapter < weapon.unlockChapter) return;

    const currentLevel = Math.max(1, state.saveData.weaponLevels[weaponId] ?? 1);
    if (currentLevel >= MAX_WEAPON_LEVEL) return;

    const cost = getWeaponUpgradeCost(weapon, currentLevel);
    if (state.saveData.gold < cost) return;

    set({ armorySaving: true });
    const nextSave: PlayerSaveData = {
      ...state.saveData,
      gold: state.saveData.gold - cost,
      weaponLevels: {
        ...state.saveData.weaponLevels,
        [weaponId]: currentLevel + 1,
      },
    };
    try {
      const saved = await playerSaveService.writeSave(nextSave);
      set({ saveData: saved, saveError: null, armorySaving: false });
    } catch (err) {
      set({
        saveError: err instanceof Error ? err.message : String(err),
        armorySaving: false,
      });
    }
  },

  selectChapter: (chapterId) =>
    set({ selectedChapter: Math.min(10, Math.max(1, chapterId)) }),

  startGame: () => {
    soundService.unlock();
    safeNotifyPlatform((adapter) => adapter.notifyGameplayStart());
    set((state) => {
      const best = computeBestScore(state.player, state.leaderboard, state.saveData);
      const loadout =
        state.saveData.equippedLoadoutIds.length > 0
          ? [...state.saveData.equippedLoadoutIds]
          : [state.saveData.equippedWeaponId || DEFAULT_LOADOUT_IDS[0]];
      return {
        gameStatus: "PLAYING",
        score: 0,
        highScore: best,
        scoreSyncError: null,
        hp: INITIAL_MAX_HP,
        maxHp: INITIAL_MAX_HP,
        wave: 1,
        maxWaves: TOTAL_STAGES,
        stageKills: 0,
        stageTargetKills: weaponService.getStageConfig(1).targetKills,
        kills: 0,
        combatLoadoutIds: loadout,
        activeLoadoutSlot: 0,
        overdriveLevel: 0,
        crateHits: 0,
        crateTargetHits: weaponService.getOverdriveTargetHits(0),
        rewardBanner: getCurrentTrans().banners.stage1Start,
        rage: 0,
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        icbmAiming: false,
        icbmPending: null,
        rewardedAdClaimed: false,
        sessionId: state.sessionId + 1,
      };
    });
  },

  switchCombatWeaponSlot: (slotIndex) => {
    const state = get();
    if (state.gameStatus !== "PLAYING") return;
    if (slotIndex < 0 || slotIndex >= state.combatLoadoutIds.length) return;
    if (slotIndex === state.activeLoadoutSlot) return;

    soundService.unlock();
    soundService.play("hitCrate");
    const nextId = state.combatLoadoutIds[slotIndex];
    const nextWeapon = weaponService.resolveCombatWeapon(
      nextId,
      state.saveData.weaponLevels[nextId] ?? 1
    );
    set({
      activeLoadoutSlot: slotIndex,
      icbmAiming: false,
      rewardBanner: formatText(getCurrentTrans().banners.switchedWeapon, {
        slot: slotIndex + 1,
        name: nextWeapon.name,
      }),
    });
  },

  cycleCombatWeapon: () => {
    const state = get();
    if (state.combatLoadoutIds.length <= 1) return;
    const nextSlot = (state.activeLoadoutSlot + 1) % state.combatLoadoutIds.length;
    get().switchCombatWeaponSlot(nextSlot);
  },

  returnToMenu: () => {
    const state = get();
    safeNotifyPlatform((adapter) => adapter.notifyGameplayStop());
    if ((state.gameStatus === "PLAYING" || state.gameStatus === "PAUSED") && state.score > 0) {
      syncPostMatchOutcome({
        player: state.player,
        score: state.score,
        wave: state.wave,
        kills: state.kills,
        victory: false,
      });
    }
    set({
      gameStatus: "MENU",
      menuScreen: "LOBBY",
      rageReady: false,
      rageActive: false,
      rageTimeLeft: 0,
      icbmAiming: false,
      icbmPending: null,
      rewardBanner: null,
    });
  },

  pauseGame: () =>
    set((state) => {
      if (state.gameStatus !== "PLAYING") return {};
      safeNotifyPlatform((adapter) => adapter.notifyGameplayStop());
      return { gameStatus: "PAUSED" };
    }),

  resumeGame: () =>
    set((state) => {
      if (state.gameStatus !== "PAUSED") return {};
      safeNotifyPlatform((adapter) => adapter.notifyGameplayStart());
      return { gameStatus: "PLAYING" };
    }),

  togglePause: () =>
    set((state) => {
      if (state.gameStatus === "PLAYING") {
        safeNotifyPlatform((adapter) => adapter.notifyGameplayStop());
        return { gameStatus: "PAUSED" };
      }
      if (state.gameStatus === "PAUSED") {
        safeNotifyPlatform((adapter) => adapter.notifyGameplayStart());
        return { gameStatus: "PLAYING" };
      }
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
      const weapon = resolveActiveCombatWeapon(state);
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
    if (
      state.gameStatus !== "PLAYING" ||
      state.rageActive ||
      state.icbmAiming ||
      state.icbmPending !== null
    ) {
      return;
    }
    if (!state.rageReady) {
      const pct = Math.round((state.rage / RAGE_CONFIG.maxRage) * 100);
      set({ rewardBanner: formatText(getCurrentTrans().banners.rageNotReady, { pct }) });
      return;
    }
    soundService.unlock();
    const weapon = resolveActiveCombatWeapon(state);
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

    if (nextStageKills < state.stageTargetKills) {
      set({
        kills: nextKills,
        stageKills: nextStageKills,
        score: nextScore,
        highScore: nextHighScore,
      });
      return;
    }

    if (state.wave >= state.maxWaves) {
      soundService.play("victory");
      safeNotifyPlatform((adapter) => {
        adapter.notifyGameplayStop();
        adapter.notifyHappyTime();
      });
      const finalScore = nextScore + 1000;
      syncPostMatchOutcome({
        player: state.player,
        score: finalScore,
        wave: state.wave,
        kills: nextKills,
        victory: true,
      });
      set({
        kills: nextKills,
        stageKills: state.stageTargetKills,
        score: finalScore,
        highScore: Math.max(nextHighScore, finalScore),
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

    const nextWave = state.wave + 1;
    const nextStageCfg = weaponService.getStageConfig(nextWave);
    const trans = getCurrentTrans();
    soundService.play(nextStageCfg.isBossStage ? "bossWarning" : "stageClear");
    const bannerText = nextStageCfg.isBossStage
      ? formatText(trans.banners.bossStage, {
          wave: nextWave,
          max: state.maxWaves,
        })
      : formatText(trans.banners.stageClear, { wave: nextWave });

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

    const nextHits = state.crateHits + 1;
    if (nextHits < state.crateTargetHits) {
      set({ crateHits: nextHits });
      return { upgraded: false, label: null };
    }

    const nextOverdrive = state.overdriveLevel + 1;
    const nextTarget = weaponService.getOverdriveTargetHits(nextOverdrive);
    const trans = getCurrentTrans();
    const rewardLabel = formatText(trans.banners.overdriveBuffActivated, {
      level: nextOverdrive,
      dmgPct: nextOverdrive * 25,
      rofPct: nextOverdrive * 15,
    });
    const nextScore = state.score + 150;

    soundService.play("upgradeWeapon");
    set({
      overdriveLevel: nextOverdrive,
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
      safeNotifyPlatform((adapter) => adapter.notifyGameplayStop());
      syncPostMatchOutcome({
        player: state.player,
        score: state.score,
        wave: state.wave,
        kills: state.kills,
        victory: false,
      });
      set({
        hp: 0,
        gameStatus: "GAME_OVER",
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
