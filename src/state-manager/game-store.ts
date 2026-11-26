import { create } from "zustand";
import {
  ActiveBuffsStateDTO,
  BuffGateSpecDTO,
  CameraMode,
  GameStatus,
  IcbmStrikeDTO,
  LeaderboardEntryDTO,
  OrbitalStrikePendingDTO,
  PendingRageTriggerDTO,
  RightLaneGateEntityDTO,
} from "@/dto/GameDTO";
import { MAX_PLAYABLE_CHAPTER, weaponService } from "@/service/weapon-service";
import { ARENA_CONFIG, ICBM_CONFIG, RAGE_CONFIG } from "@/service/game-constants";
import { getRageSkillSpec } from "@/service/rage-catalog";
import {
  MAX_PLAYER_CLONES,
  MAX_SHIELD_CHARGES,
  createEmptyActiveBuffs,
  generateWaveRightLaneGates,
  getBuffGateSpec,
} from "@/service/buff-catalog";
import { soundService } from "@/service/sound-service";
import { leaderboardService } from "@/service/leaderboard-service";
import {
  ARMORY_WEAPONS,
  DEFAULT_LOADOUT_IDS,
  MAX_LOADOUT_SLOTS,
  MAX_WEAPON_LEVEL,
  getArmoryWeaponById,
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

interface PendingGuestMatch {
  sessionId: number;
  score: number;
  wave: number;
  kills: number;
  victory: boolean;
  earnedGold: number;
  activeChapter: number;
  guestSavedUpdatedAt: number | null;
}

interface GameState {
  gameStatus: GameStatus;
  menuScreen: MenuScreen;
  previousMenuScreen: "LOBBY" | "WORLD_MAP";
  armoryTab: ArmoryTab;
  armorySaving: boolean;
  selectedChapter: number;
  activeChapter: number;

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
  pendingGuestMatch: PendingGuestMatch | null;
  syncedMatchSessionId: number | null;

  // Portal Ads state
  adLoading: boolean;
  adError: string | null;
  rewardedAdClaimed: boolean;

  score: number;
  highScore: number;
  lastGoldEarned: number;
  hp: number;
  maxHp: number;

  // Stages / Waves
  wave: number;
  maxWaves: number;
  stageKills: number;
  stageTargetKills: number;
  kills: number;

  // Active 3-Weapon Combat Loadout & Right-Lane Buff Gates (2 items per wave)
  combatLoadoutIds: string[];
  activeLoadoutSlot: number;
  overdriveLevel: number;
  rightLaneGates: RightLaneGateEntityDTO[];
  activeBuffs: ActiveBuffsStateDTO;
  rewardBanner: string | null;

  // Rage & Weapon-Specific Ultimates
  rage: number;
  rageReady: boolean;
  rageActive: boolean;
  rageTimeLeft: number;
  rageDurationTotal: number;
  activeRageWeaponId: string | null;
  pendingRageTrigger: PendingRageTriggerDTO | null;
  icbmAiming: boolean;
  aimingWeaponId: string | null;
  icbmPending: IcbmStrikeDTO | null;
  rageStrikesPending: OrbitalStrikePendingDTO[];
  rageStrikeBatchSeq: number;

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
  unlockArmoryWeapon: (weaponId: string) => Promise<void>;
  assignWeaponToLoadout: (weaponId: string, slotIndex?: number) => Promise<void>;
  removeWeaponFromLoadout: (weaponId: string) => Promise<void>;
  selectActiveLoadoutWeapon: (weaponId: string) => Promise<void>;
  upgradeArmoryWeapon: (weaponId: string) => Promise<void>;
  switchCombatWeaponSlot: (slotIndex: number) => void;
  cycleCombatWeapon: (dir?: 1 | -1) => void;
  selectChapter: (chapterId: number) => void;
  startGame: () => void;
  startNextChapter: () => void;
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
  tickBuffTimers: (delta: number) => void;
  registerEnemyKill: (points: number) => void;
  registerGateHit: (slotIndex: 0 | 1) => { claimed: boolean; buff: BuffGateSpecDTO | null };
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

// Trong các súng mang theo, ưu tiên cầm sẵn khẩu đứng sau trong danh sách ARMORY_WEAPONS (mạnh hơn)
function pickStrongestLoadoutSlotIndex(loadoutIds: string[]): number {
  if (loadoutIds.length <= 1) return 0;
  let bestSlotIdx = 0;
  let bestCatalogIdx = -1;
  for (let i = 0; i < loadoutIds.length; i++) {
    const catalogIdx = ARMORY_WEAPONS.findIndex((w) => w.id === loadoutIds[i]);
    if (catalogIdx > bestCatalogIdx) {
      bestCatalogIdx = catalogIdx;
      bestSlotIdx = i;
    }
  }
  return bestSlotIdx;
}

async function commitArmorySave(
  nextSave: PlayerSaveData,
  setState: (partial: Partial<GameState & GameActions>) => void
): Promise<void> {
  setState({ armorySaving: true });
  try {
    const saved = await playerSaveService.writeSave(nextSave);
    setState({ saveData: saved, saveError: null, armorySaving: false });
  } catch (err) {
    setState({
      saveError: err instanceof Error ? err.message : String(err),
      armorySaving: false,
    });
  }
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

function applyMatchRewardToSave(
  baseSave: PlayerSaveData,
  match: {
    earnedGold: number;
    score: number;
    kills: number;
    victory: boolean;
    activeChapter: number;
  }
): PlayerSaveData {
  const reachedChapter = match.victory
    ? Math.min(10, match.activeChapter + 1)
    : match.activeChapter;
  const nextUnlockedChapter = Math.max(baseSave.unlockedChapter, reachedChapter);

  return {
    ...baseSave,
    gold: baseSave.gold + match.earnedGold,
    bestScore: Math.max(baseSave.bestScore, match.score),
    totalKills: baseSave.totalKills + match.kills,
    gamesPlayed: baseSave.gamesPlayed + 1,
    unlockedChapter: nextUnlockedChapter,
  };
}

function submitLeaderboardMatch(input: {
  player: PlatformPlayer;
  score: number;
  wave: number;
  kills: number;
  victory: boolean;
}): void {
  void leaderboardService
    .syncMatchToCloud(input)
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

async function hydrateAuthenticatedSession(player: PlatformPlayer): Promise<void> {
  const loadedSave = await playerSaveService.loadSave();
  if (loadedSave.locale) {
    useAppStore.getState().setLocale(normalizeLocale(loadedSave.locale));
  }

  const snapshot = useGameStore.getState();
  const pending = snapshot.pendingGuestMatch;
  const shouldSyncPending =
    Boolean(pending) && snapshot.syncedMatchSessionId !== pending?.sessionId;

  let finalSave = loadedSave;
  let writeSaveError: string | null = null;

  if (shouldSyncPending && pending) {
    const alreadyInLoadedSave =
      pending.guestSavedUpdatedAt !== null &&
      loadedSave.updatedAt === pending.guestSavedUpdatedAt;

    if (!alreadyInLoadedSave) {
      const mergedSave = applyMatchRewardToSave(loadedSave, pending);
      try {
        finalSave = await playerSaveService.writeSave(mergedSave);
      } catch (err) {
        writeSaveError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  const syncedSuccessfully =
    Boolean(shouldSyncPending && pending) && writeSaveError === null;

  useGameStore.setState((curr) => ({
    player,
    playerId: player.id,
    playerName: player.name,
    saveData: finalSave,
    saveError: writeSaveError,
    authError: null,
    scoreSyncError: null,
    syncedMatchSessionId:
      syncedSuccessfully && pending ? pending.sessionId : curr.syncedMatchSessionId,
    pendingGuestMatch: syncedSuccessfully ? null : curr.pendingGuestMatch,
    selectedChapter: Math.min(
      MAX_PLAYABLE_CHAPTER,
      Math.max(curr.selectedChapter, finalSave.unlockedChapter)
    ),
    highScore: computeBestScore(player, curr.leaderboard, finalSave),
  }));

  if (shouldSyncPending && pending) {
    submitLeaderboardMatch({
      player,
      score: pending.score,
      wave: pending.wave,
      kills: pending.kills,
      victory: pending.victory,
    });
  }
}

function syncPostMatchOutcome(input: {
  player: PlatformPlayer | null;
  score: number;
  wave: number;
  kills: number;
  victory: boolean;
}): number {
  const state = useGameStore.getState();
  const earnedGold = Math.max(0, Math.round(input.score));
  const matchSessionId = state.sessionId;

  if (!input.player) {
    useGameStore.setState({
      pendingGuestMatch: {
        sessionId: matchSessionId,
        score: input.score,
        wave: input.wave,
        kills: input.kills,
        victory: input.victory,
        earnedGold,
        activeChapter: state.activeChapter,
        guestSavedUpdatedAt: null,
      },
      scoreSyncError: null,
    });
  } else {
    useGameStore.setState({
      syncedMatchSessionId: matchSessionId,
      pendingGuestMatch: null,
    });
  }

  // 1. Update platform/cloud save (avoid overwriting if initial load failed)
  if (state.platformReady && !state.saveError) {
    const nextSave = applyMatchRewardToSave(state.saveData, {
      earnedGold,
      score: input.score,
      kills: input.kills,
      victory: input.victory,
      activeChapter: state.activeChapter,
    });

    void playerSaveService
      .writeSave(nextSave)
      .then((saved) => {
        useGameStore.setState((curr) => ({
          saveData: saved,
          saveError: null,
          pendingGuestMatch:
            curr.pendingGuestMatch &&
            curr.pendingGuestMatch.sessionId === matchSessionId
              ? { ...curr.pendingGuestMatch, guestSavedUpdatedAt: saved.updatedAt }
              : curr.pendingGuestMatch,
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
    return earnedGold;
  }

  submitLeaderboardMatch({
    player: input.player,
    score: input.score,
    wave: input.wave,
    kills: input.kills,
    victory: input.victory,
  });

  return earnedGold;
}

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  gameStatus: "MENU",
  menuScreen: "LOBBY",
  previousMenuScreen: "LOBBY",
  armoryTab: "ARSENAL",
  armorySaving: false,
  selectedChapter: 1,
  activeChapter: 1,

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
  pendingGuestMatch: null,
  syncedMatchSessionId: null,

  adLoading: false,
  adError: null,
  rewardedAdClaimed: false,

  score: 0,
  highScore: 0,
  lastGoldEarned: 0,
  hp: INITIAL_MAX_HP,
  maxHp: INITIAL_MAX_HP,

  wave: 1,
  maxWaves: TOTAL_STAGES,
  stageKills: 0,
  stageTargetKills: weaponService.getStageConfig(1).targetKills,
  kills: 0,

  combatLoadoutIds: [...DEFAULT_LOADOUT_IDS],
  activeLoadoutSlot: pickStrongestLoadoutSlotIndex(DEFAULT_LOADOUT_IDS),
  overdriveLevel: 0,
  rightLaneGates: generateWaveRightLaneGates(1, {
    hp: INITIAL_MAX_HP,
    maxHp: INITIAL_MAX_HP,
    activeBuffs: createEmptyActiveBuffs(0),
  }),
  activeBuffs: createEmptyActiveBuffs(0),
  rewardBanner: null,

  rage: 0,
  rageReady: false,
  rageActive: false,
  rageTimeLeft: 0,
  rageDurationTotal: RAGE_CONFIG.durationSeconds,
  activeRageWeaponId: null,
  pendingRageTrigger: null,
  icbmAiming: false,
  aimingWeaponId: null,
  icbmPending: null,
  rageStrikesPending: [],
  rageStrikeBatchSeq: 0,

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
          if (get().authLoading) return;
          void (async () => {
            try {
              if (nextPlayer) {
                await hydrateAuthenticatedSession(nextPlayer);
              } else {
                const refreshedSave = await playerSaveService.loadSave();
                if (refreshedSave.locale) {
                  useAppStore.getState().setLocale(normalizeLocale(refreshedSave.locale));
                }
                set((curr) => ({
                  player: null,
                  playerId: "",
                  playerName: "",
                  saveData: refreshedSave,
                  saveError: null,
                  authError: null,
                  highScore: computeBestScore(null, curr.leaderboard, refreshedSave),
                }));
              }
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
          selectedChapter: Math.min(
            MAX_PLAYABLE_CHAPTER,
            Math.max(curr.selectedChapter, loadedSave.unlockedChapter)
          ),
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
      await hydrateAuthenticatedSession(player);
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
      selectedChapter: Math.min(
        MAX_PLAYABLE_CHAPTER,
        Math.max(1, state.saveData.unlockedChapter)
      ),
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

  unlockArmoryWeapon: async (weaponId) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    const weapon = ARMORY_WEAPONS.find((item) => item.id === weaponId);
    if (!weapon) return;
    // Điều kiện cần: đạt Chapter yêu cầu
    if (state.saveData.unlockedChapter < weapon.unlockChapter) return;
    if (state.saveData.unlockedWeaponIds.includes(weaponId)) return;
    // Điều kiện đủ: đủ Gold để mở khóa
    if (state.saveData.gold < weapon.unlockCost) return;

    const nextSave: PlayerSaveData = {
      ...state.saveData,
      gold: state.saveData.gold - weapon.unlockCost,
      unlockedWeaponIds: [...state.saveData.unlockedWeaponIds, weaponId],
    };
    await commitArmorySave(nextSave, set);
  },

  assignWeaponToLoadout: async (weaponId, slotIndex) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    const weapon = ARMORY_WEAPONS.find((item) => item.id === weaponId);
    if (
      !weapon ||
      state.saveData.unlockedChapter < weapon.unlockChapter ||
      !state.saveData.unlockedWeaponIds.includes(weaponId)
    ) {
      return;
    }

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

    const nextSave: PlayerSaveData = {
      ...state.saveData,
      equippedWeaponId: current.includes(state.saveData.equippedWeaponId)
        ? state.saveData.equippedWeaponId
        : current[0],
      equippedLoadoutIds: current,
    };
    await commitArmorySave(nextSave, set);
  },

  removeWeaponFromLoadout: async (weaponId) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    const current = state.saveData.equippedLoadoutIds;
    if (current.length <= 1 || !current.includes(weaponId)) return;

    const nextLoadout = current.filter((id) => id !== weaponId);
    const nextSave: PlayerSaveData = {
      ...state.saveData,
      equippedWeaponId: nextLoadout.includes(state.saveData.equippedWeaponId)
        ? state.saveData.equippedWeaponId
        : nextLoadout[0],
      equippedLoadoutIds: nextLoadout,
    };
    await commitArmorySave(nextSave, set);
  },

  selectActiveLoadoutWeapon: async (weaponId) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    if (!state.saveData.equippedLoadoutIds.includes(weaponId)) return;
    if (state.saveData.equippedWeaponId === weaponId) return;

    const nextSave: PlayerSaveData = {
      ...state.saveData,
      equippedWeaponId: weaponId,
    };
    await commitArmorySave(nextSave, set);
  },

  upgradeArmoryWeapon: async (weaponId) => {
    const state = get();
    if (!state.platformReady || state.saveError || state.armorySaving) return;
    const weapon = ARMORY_WEAPONS.find((item) => item.id === weaponId);
    if (!weapon) return;
    if (
      state.saveData.unlockedChapter < weapon.unlockChapter ||
      !state.saveData.unlockedWeaponIds.includes(weaponId)
    ) {
      return;
    }

    const currentLevel = Math.max(1, state.saveData.weaponLevels[weaponId] ?? 1);
    if (currentLevel >= MAX_WEAPON_LEVEL) return;

    const cost = getWeaponUpgradeCost(weapon, currentLevel);
    if (state.saveData.gold < cost) return;

    const nextSave: PlayerSaveData = {
      ...state.saveData,
      gold: state.saveData.gold - cost,
      weaponLevels: {
        ...state.saveData.weaponLevels,
        [weaponId]: currentLevel + 1,
      },
    };
    await commitArmorySave(nextSave, set);
  },

  selectChapter: (chapterId) =>
    set({ selectedChapter: Math.min(10, Math.max(1, chapterId)) }),

  startGame: () => {
    soundService.unlock();
    safeNotifyPlatform((adapter) => adapter.notifyGameplayStart());
    set((state) => {
      const chapterId = Math.min(
        MAX_PLAYABLE_CHAPTER,
        Math.max(1, state.selectedChapter)
      );
      const maxWaves = weaponService.getTotalStages(chapterId);
      const best = computeBestScore(state.player, state.leaderboard, state.saveData);
      const loadout =
        state.saveData.equippedLoadoutIds.length > 0
          ? [...state.saveData.equippedLoadoutIds]
          : [state.saveData.equippedWeaponId || DEFAULT_LOADOUT_IDS[0]];
      const bestSlotIdx = pickStrongestLoadoutSlotIndex(loadout);
      const startingClones = state.rewardedAdClaimed ? 1 : 0;
      const initialBuffs = createEmptyActiveBuffs(startingClones);
      const trans = getCurrentTrans();
      return {
        gameStatus: "PLAYING",
        score: 0,
        highScore: best,
        lastGoldEarned: 0,
        scoreSyncError: null,
        pendingGuestMatch: null,
        syncedMatchSessionId: null,
        hp: INITIAL_MAX_HP,
        maxHp: INITIAL_MAX_HP,
        activeChapter: chapterId,
        wave: 1,
        maxWaves,
        stageKills: 0,
        stageTargetKills: weaponService.getStageConfig(1, chapterId).targetKills,
        kills: 0,
        combatLoadoutIds: loadout,
        activeLoadoutSlot: bestSlotIdx,
        overdriveLevel: 0,
        rightLaneGates: generateWaveRightLaneGates(1, {
          hp: INITIAL_MAX_HP,
          maxHp: INITIAL_MAX_HP,
          activeBuffs: initialBuffs,
        }),
        activeBuffs: initialBuffs,
        rewardBanner:
          chapterId === 1
            ? trans.banners.stage1Start
            : formatText(trans.banners.chapterWaveStart, {
                ch: chapterId,
                wave: 1,
                max: maxWaves,
              }),
        rage: 0,
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        rageDurationTotal: RAGE_CONFIG.durationSeconds,
        activeRageWeaponId: null,
        pendingRageTrigger: null,
        icbmAiming: false,
        aimingWeaponId: null,
        icbmPending: null,
        rageStrikesPending: [],
        rewardedAdClaimed: false,
        sessionId: state.sessionId + 1,
      };
    });
  },

  startNextChapter: () => {
    const state = get();
    const nextChapter = Math.min(
      MAX_PLAYABLE_CHAPTER,
      Math.max(1, state.activeChapter + 1)
    );
    set({ selectedChapter: nextChapter });
    get().startGame();
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

  cycleCombatWeapon: (dir = 1) => {
    const state = get();
    const len = state.combatLoadoutIds.length;
    if (len <= 1) return;
    const nextSlot = (state.activeLoadoutSlot + dir + len) % len;
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
      activeBuffs: createEmptyActiveBuffs(0),
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
      state.rageStrikesPending.length > 0 ||
      amount <= 0
    ) {
      return;
    }
    const nextRage = Math.min(RAGE_CONFIG.maxRage, state.rage + amount);
    if (nextRage >= RAGE_CONFIG.maxRage) {
      const weapon = resolveActiveCombatWeapon(state);
      const spec = getRageSkillSpec(weapon.id);
      const armory = getArmoryWeaponById(weapon.id);
      const skillName = armory?.rageSkillName ?? weapon.name;
      const trans = getCurrentTrans();
      soundService.play("rageReady");
      set({
        rage: RAGE_CONFIG.maxRage,
        rageReady: true,
        rewardBanner:
          spec.mode === "AIM_TARGET"
            ? weapon.id === "icbm"
              ? trans.banners.rageReadyIcbm
              : formatText(trans.banners.rageReadySkillAim, { skill: skillName })
            : formatText(trans.banners.rageReadySkill, { skill: skillName }),
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
      state.icbmPending !== null ||
      state.rageStrikesPending.length > 0
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
    const armory = getArmoryWeaponById(weapon.id);
    const spec = getRageSkillSpec(weapon.id);
    const trans = getCurrentTrans();
    const skillName = armory?.rageSkillName ?? weapon.name;
    const isVi = normalizeLocale(useAppStore.getState().locale) === "vi";
    const skillDesc = armory ? (isVi ? armory.rageSkillDescVi : armory.rageSkillDescEn) : "";

    if (spec.mode === "AIM_TARGET") {
      soundService.play("rageReady");
      set({
        rageReady: false,
        icbmAiming: true,
        aimingWeaponId: weapon.id,
        rewardBanner:
          weapon.id === "icbm"
            ? trans.banners.icbmAiming
            : formatText(trans.banners.rageAimingSkill, { skill: skillName }),
      });
      return;
    }

    if (spec.mode === "INSTANT_AOE") {
      soundService.play("rageActivate");
      const nextSeq = (state.pendingRageTrigger?.seq ?? 0) + 1;
      set({
        rage: 0,
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        activeRageWeaponId: null,
        pendingRageTrigger: { seq: nextSeq, weaponId: weapon.id },
        rewardBanner: formatText(trans.banners.rageSkillActivatedInstant, {
          skill: skillName,
          desc: skillDesc,
        }),
      });
      return;
    }

    soundService.play("rageActivate");
    set({
      rage: RAGE_CONFIG.maxRage,
      rageReady: false,
      rageActive: true,
      rageTimeLeft: spec.durationSeconds,
      rageDurationTotal: spec.durationSeconds,
      activeRageWeaponId: weapon.id,
      rewardBanner: formatText(trans.banners.rageSkillActivatedTimed, {
        skill: skillName,
        sec: spec.durationSeconds,
        desc: skillDesc,
      }),
    });
  },

  launchIcbm: (targetX, targetZ, startX) => {
    const state = get();
    if (state.gameStatus !== "PLAYING" || !state.icbmAiming) {
      return;
    }
    const weaponId = state.aimingWeaponId ?? resolveActiveCombatWeapon(state).id;
    const weapon = weaponService.resolveCombatWeapon(
      weaponId,
      state.saveData.weaponLevels[weaponId] ?? 1
    );
    const armory = getArmoryWeaponById(weaponId);
    const spec = getRageSkillSpec(weaponId);
    const effectiveDamage = weaponService.getEffectiveDamage(weapon, state.overdriveLevel);
    const skillName = armory?.rageSkillName ?? weapon.name;
    const baseSeq = state.rageStrikeBatchSeq + 1;

    let strikes: OrbitalStrikePendingDTO[] = [];
    if (weaponId === "cannon") {
      const offsets: Array<[number, number, number]> = [
        [0, 0, 0.45],
        [-2.2, -3.4, 1.05],
        [2.2, -6.8, 1.65],
      ];
      strikes = offsets.map(([ox, oz, delay], idx) => ({
        seq: baseSeq + idx,
        kind: "cannon",
        startX,
        startZ: ARENA_CONFIG.playerZ,
        targetX: Math.max(
          ARENA_CONFIG.leftLaneMinX + 1.2,
          Math.min(ARENA_CONFIG.dividerX - 1.0, targetX + ox)
        ),
        targetZ: Math.max(-34, Math.min(8, targetZ + oz)),
        delaySeconds: delay,
        radius: spec.aoeRadius ?? 6,
        damage: Math.max(90, Math.round(effectiveDamage * 6.5)),
      }));
    } else if (weaponId === "nuke_launcher") {
      strikes = [
        {
          seq: baseSeq,
          kind: "nuke",
          startX,
          startZ: ARENA_CONFIG.playerZ,
          targetX,
          targetZ,
          delaySeconds: 1.0,
          radius: spec.aoeRadius ?? 12,
          damage: Math.max(400, Math.round(effectiveDamage * 14)),
          falloutSeconds: spec.falloutSeconds ?? 10,
        },
      ];
    } else {
      const icbmOffsets: Array<[number, number]> = [
        [0, 0],
        [-3.4, -4.5],
        [3.4, -4.5],
      ];
      strikes = icbmOffsets.map(([ox, oz], idx) => ({
        seq: baseSeq + idx,
        kind: "icbm",
        startX,
        startZ: ARENA_CONFIG.playerZ,
        targetX: Math.max(
          -ARENA_CONFIG.width / 2 + 1.5,
          Math.min(ARENA_CONFIG.width / 2 - 1.5, targetX + ox)
        ),
        targetZ: Math.max(-34, Math.min(8, targetZ + oz)),
        delaySeconds: ICBM_CONFIG.impactDelaySeconds,
        radius: spec.aoeRadius ?? ICBM_CONFIG.explosionRadius,
        damage: ICBM_CONFIG.missileDamage,
      }));
    }

    soundService.play("icbmLaunch");
    const primary = strikes[0];
    const maxDelay = Math.max(...strikes.map((s) => s.delaySeconds));
    set({
      rage: 0,
      rageReady: false,
      icbmAiming: false,
      aimingWeaponId: null,
      icbmPending: {
        startX: primary.startX,
        startZ: primary.startZ,
        targetX: primary.targetX,
        targetZ: primary.targetZ,
        delaySeconds: maxDelay,
      },
      rageStrikesPending: strikes,
      rageStrikeBatchSeq: baseSeq + strikes.length,
      rewardBanner:
        weaponId === "icbm"
          ? formatText(getCurrentTrans().banners.icbmLaunched, { sec: maxDelay })
          : formatText(getCurrentTrans().banners.rageSkillLaunched, {
              skill: skillName,
              sec: maxDelay,
            }),
    });
  },

  finishIcbmStrike: () =>
    set({
      icbmPending: null,
      icbmAiming: false,
      aimingWeaponId: null,
      rageStrikesPending: [],
      rage: 0,
      rageReady: false,
      rageActive: false,
      rageTimeLeft: 0,
      activeRageWeaponId: null,
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
          activeRageWeaponId: null,
          rage: 0,
        };
      }
      const totalDur = Math.max(0.1, state.rageDurationTotal || RAGE_CONFIG.durationSeconds);
      return {
        rageTimeLeft: nextTime,
        rage: (nextTime / totalDur) * RAGE_CONFIG.maxRage,
      };
    }),

  tickBuffTimers: (delta) =>
    set((state) => {
      if (state.gameStatus !== "PLAYING") return {};
      const curr = state.activeBuffs;
      if (
        curr.magnetTimeLeft <= 0 &&
        curr.freezeTimeLeft <= 0 &&
        curr.turretTimeLeft <= 0
      ) {
        return {};
      }
      return {
        activeBuffs: {
          ...curr,
          magnetTimeLeft: Math.max(0, curr.magnetTimeLeft - delta),
          freezeTimeLeft: Math.max(0, curr.freezeTimeLeft - delta),
          turretTimeLeft: Math.max(0, curr.turretTimeLeft - delta),
        },
      };
    }),

  registerEnemyKill: (points) => {
    const state = get();
    if (state.gameStatus !== "PLAYING") return;

    const scoreMultiplier = state.activeBuffs.magnetTimeLeft > 0 ? 1.5 : 1;
    const nextKills = state.kills + 1;
    const nextScore = state.score + Math.round(points * scoreMultiplier);
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
      const earnedGold = syncPostMatchOutcome({
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
        lastGoldEarned: earnedGold,
        highScore: Math.max(nextHighScore, finalScore),
        selectedChapter: Math.min(
          MAX_PLAYABLE_CHAPTER,
          Math.max(state.selectedChapter, state.activeChapter + 1)
        ),
        gameStatus: "VICTORY",
        rage: 0,
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        activeRageWeaponId: null,
        pendingRageTrigger: null,
        icbmAiming: false,
        aimingWeaponId: null,
        icbmPending: null,
        rageStrikesPending: [],
        rewardBanner: formatText(getCurrentTrans().banners.victory, {
          max: state.maxWaves,
        }),
      });
      return;
    }

    const nextWave = state.wave + 1;
    const nextStageCfg = weaponService.getStageConfig(nextWave, state.activeChapter);
    const trans = getCurrentTrans();
    soundService.play(nextStageCfg.isBossStage ? "bossWarning" : "stageClear");
    const bannerText = nextStageCfg.isBossStage
      ? formatText(trans.banners.bossStage, {
          wave: nextWave,
          max: state.maxWaves,
        })
      : formatText(trans.banners.stageClear, { wave: nextWave });

    // Hết wave: xóa các buff hiệu lực theo Wave, giữ lại buff theo Run/Timed/Shield và sinh 2 Item mới
    const carriedBuffs: ActiveBuffsStateDTO = {
      ...state.activeBuffs,
      piercing: false,
      multishot: false,
      ricochet: false,
      explosive: false,
    };

    set({
      kills: nextKills,
      wave: nextWave,
      stageKills: 0,
      stageTargetKills: nextStageCfg.targetKills,
      score: nextScore + 100,
      highScore: Math.max(nextHighScore, nextScore + 100),
      activeBuffs: carriedBuffs,
      rightLaneGates: generateWaveRightLaneGates(nextWave, {
        hp: state.hp,
        maxHp: state.maxHp,
        activeBuffs: carriedBuffs,
      }),
      rewardBanner: bannerText,
    });
  },

  registerGateHit: (slotIndex) => {
    const state = get();
    if (state.gameStatus !== "PLAYING") {
      return { claimed: false, buff: null };
    }
    const targetGate = state.rightLaneGates.find((g) => g.slotIndex === slotIndex);
    if (!targetGate || targetGate.claimed) {
      return { claimed: false, buff: null };
    }

    const nextHits = targetGate.hits + 1;
    if (nextHits < targetGate.targetHits) {
      set({
        rightLaneGates: state.rightLaneGates.map((g) =>
          g.slotIndex === slotIndex ? { ...g, hits: nextHits } : g
        ),
      });
      return { claimed: false, buff: null };
    }

    const spec = getBuffGateSpec(targetGate.buffId);
    const nextBuffs: ActiveBuffsStateDTO = { ...state.activeBuffs };
    let nextHp = state.hp;
    let bonusScore = 100;

    switch (spec.id) {
      case "x2_clone":
        nextBuffs.clones = Math.min(MAX_PLAYER_CLONES, nextBuffs.clones + 1);
        break;
      case "piercing":
        nextBuffs.piercing = true;
        break;
      case "multishot":
        nextBuffs.multishot = true;
        break;
      case "ricochet":
        nextBuffs.ricochet = true;
        break;
      case "explosive":
        nextBuffs.explosive = true;
        break;
      case "shield":
        nextBuffs.shieldCharges = Math.min(
          MAX_SHIELD_CHARGES,
          nextBuffs.shieldCharges + (spec.charges ?? 3)
        );
        break;
      case "heal_hp":
        if (nextHp < state.maxHp) {
          nextHp = Math.min(state.maxHp, nextHp + 1);
        } else {
          bonusScore += 150;
        }
        break;
      case "magnet":
        nextBuffs.magnetTimeLeft = Math.max(
          nextBuffs.magnetTimeLeft,
          spec.durationSeconds ?? 10
        );
        break;
      case "freeze_field":
        nextBuffs.freezeTimeLeft = Math.max(
          nextBuffs.freezeTimeLeft,
          spec.durationSeconds ?? 5
        );
        break;
      case "turret_drop":
        nextBuffs.turretTimeLeft = Math.max(
          nextBuffs.turretTimeLeft,
          spec.durationSeconds ?? 10
        );
        break;
      case "lightning":
      case "cluster_bomb":
        break;
    }

    const trans = getCurrentTrans();
    const buffDesc = trans.buffs.items[spec.id];
    const banner = formatText(trans.buffs.activatedBanner, {
      badge: spec.badgeText,
      desc: buffDesc,
    });
    const nextScore = state.score + bonusScore;

    soundService.play("upgradeWeapon");
    set({
      hp: nextHp,
      score: nextScore,
      highScore: Math.max(state.highScore, nextScore),
      activeBuffs: nextBuffs,
      rightLaneGates: state.rightLaneGates.map((g) =>
        g.slotIndex === slotIndex ? { ...g, hits: g.targetHits, claimed: true } : g
      ),
      rewardBanner: banner,
    });

    return { claimed: true, buff: spec };
  },

  damagePlayer: (amount) => {
    const state = get();
    if (state.gameStatus !== "PLAYING") return;

    if (state.activeBuffs.shieldCharges > 0) {
      const nextCharges = state.activeBuffs.shieldCharges - 1;
      soundService.play("hitCrate");
      set({
        activeBuffs: { ...state.activeBuffs, shieldCharges: nextCharges },
        rewardBanner: formatText(getCurrentTrans().buffs.shieldBlockedBanner, {
          charges: nextCharges,
        }),
      });
      return;
    }

    const nextHp = Math.max(0, state.hp - amount);
    soundService.play(nextHp <= 0 ? "gameOver" : "playerHit");
    if (nextHp <= 0) {
      safeNotifyPlatform((adapter) => adapter.notifyGameplayStop());
      const earnedGold = syncPostMatchOutcome({
        player: state.player,
        score: state.score,
        wave: state.wave,
        kills: state.kills,
        victory: false,
      });
      set({
        hp: 0,
        lastGoldEarned: earnedGold,
        gameStatus: "GAME_OVER",
        rage: 0,
        rageReady: false,
        rageActive: false,
        rageTimeLeft: 0,
        activeRageWeaponId: null,
        pendingRageTrigger: null,
        icbmAiming: false,
        aimingWeaponId: null,
        icbmPending: null,
        rageStrikesPending: [],
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
