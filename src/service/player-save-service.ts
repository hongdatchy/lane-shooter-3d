import { getPlatformAdapter } from "@/platform";
import {
  ARMORY_WEAPONS,
  DEFAULT_LOADOUT_IDS,
  DEFAULT_UNLOCKED_WEAPON_IDS,
} from "@/service/armory-catalog";

export const PLAYER_SAVE_STORAGE_KEY = "lane_shooter_save_v1";
export const FIRST_RUN_LOCAL_KEY = "lane_shooter_first_run_done_v1";

export function readBrowserFirstRunDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FIRST_RUN_LOCAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBrowserFirstRunDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRST_RUN_LOCAL_KEY, "1");
  } catch {
    // Bỏ qua nếu môi trường iframe/sandbox khóa localStorage
  }
}

export interface PlayerSaveData {
  version: 1;
  locale?: string;
  firstRunDone?: boolean;
  bestScore: number;
  totalKills: number;
  gamesPlayed: number;
  gold: number;
  gems: number;
  unlockedChapter: number;
  unlockedWeaponIds: string[];
  equippedWeaponId: string;
  equippedLoadoutIds: string[];
  weaponLevels: Record<string, number>;
  updatedAt: number;
}

export function createDefaultSaveData(): PlayerSaveData {
  return {
    version: 1,
    firstRunDone: false,
    bestScore: 0,
    totalKills: 0,
    gamesPlayed: 0,
    gold: 0,
    gems: 0,
    unlockedChapter: 1,
    unlockedWeaponIds: [...DEFAULT_UNLOCKED_WEAPON_IDS],
    equippedWeaponId: DEFAULT_LOADOUT_IDS[0],
    equippedLoadoutIds: [...DEFAULT_LOADOUT_IDS],
    weaponLevels: {},
    updatedAt: 0,
  };
}

function normalizeUnlockedWeaponIds(
  rawUnlocked: unknown,
  unlockedChapter: number
): string[] {
  const byId = new Map(ARMORY_WEAPONS.map((w) => [w.id, w]));
  const result: string[] = [];

  // Súng có unlockCost === 0 (như Pistol) luôn mở sẵn khi đủ điều kiện Chapter
  for (const w of ARMORY_WEAPONS) {
    if (w.unlockCost === 0 && w.unlockChapter <= unlockedChapter && !result.includes(w.id)) {
      result.push(w.id);
    }
  }

  if (Array.isArray(rawUnlocked)) {
    for (const item of rawUnlocked) {
      if (typeof item !== "string" || result.includes(item)) continue;
      const spec = byId.get(item);
      if (spec && spec.unlockChapter <= unlockedChapter) {
        result.push(item);
      }
    }
  }

  return result.length > 0 ? result : [ARMORY_WEAPONS[0].id];
}

function pickHighestTierWeaponId(candidates: string[]): string | null {
  let bestId: string | null = null;
  let bestIdx = -1;
  for (const id of candidates) {
    const idx = ARMORY_WEAPONS.findIndex((w) => w.id === id);
    if (idx > bestIdx) {
      bestIdx = idx;
      bestId = id;
    }
  }
  return bestId;
}

function normalizeLoadoutIds(
  rawLoadout: unknown,
  fallbackPrimary: string,
  unlockedWeaponIds: string[]
): string[] {
  const ownedSet = new Set(unlockedWeaponIds);
  const validCandidates: string[] = [];

  if (Array.isArray(rawLoadout)) {
    for (const item of rawLoadout) {
      if (
        typeof item === "string" &&
        ownedSet.has(item) &&
        !validCandidates.includes(item)
      ) {
        validCandidates.push(item);
      }
    }
  }

  if (validCandidates.length === 1) {
    return [validCandidates[0]];
  }
  if (validCandidates.length > 1) {
    const preferred =
      fallbackPrimary &&
      fallbackPrimary !== "pistol" &&
      validCandidates.includes(fallbackPrimary)
        ? fallbackPrimary
        : pickHighestTierWeaponId(validCandidates) ?? validCandidates[0];
    return [preferred];
  }

  if (ownedSet.has(fallbackPrimary)) {
    return [fallbackPrimary];
  }
  for (const id of DEFAULT_LOADOUT_IDS) {
    if (ownedSet.has(id)) {
      return [id];
    }
  }
  return [unlockedWeaponIds[0] ?? ARMORY_WEAPONS[0].id];
}

function normalizeWeaponLevels(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const clean: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "number" && Number.isFinite(val)) {
      clean[key] = Math.min(10, Math.max(1, Math.floor(val)));
    }
  }
  return clean;
}

function normalizeSaveData(raw: unknown): PlayerSaveData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Corrupted player save payload.");
  }
  const candidate = raw as Partial<PlayerSaveData>;
  const defaults = createDefaultSaveData();
  const unlockedChapter =
    typeof candidate.unlockedChapter === "number" && Number.isFinite(candidate.unlockedChapter)
      ? Math.max(1, candidate.unlockedChapter)
      : defaults.unlockedChapter;
  const unlockedWeaponIds = normalizeUnlockedWeaponIds(
    candidate.unlockedWeaponIds,
    unlockedChapter
  );
  const rawEquipped =
    typeof candidate.equippedWeaponId === "string" && candidate.equippedWeaponId.trim()
      ? candidate.equippedWeaponId.trim()
      : defaults.equippedWeaponId;
  const equippedLoadoutIds = normalizeLoadoutIds(
    candidate.equippedLoadoutIds,
    rawEquipped,
    unlockedWeaponIds
  );

  const bestScore =
    typeof candidate.bestScore === "number" && Number.isFinite(candidate.bestScore)
      ? Math.max(0, candidate.bestScore)
      : defaults.bestScore;
  const totalKills =
    typeof candidate.totalKills === "number" && Number.isFinite(candidate.totalKills)
      ? Math.max(0, candidate.totalKills)
      : defaults.totalKills;
  const gamesPlayed =
    typeof candidate.gamesPlayed === "number" && Number.isFinite(candidate.gamesPlayed)
      ? Math.max(0, candidate.gamesPlayed)
      : defaults.gamesPlayed;
  const hasPriorActivity =
    gamesPlayed > 0 || bestScore > 0 || totalKills > 0 || unlockedChapter > 1;
  const firstRunDone =
    typeof candidate.firstRunDone === "boolean"
      ? candidate.firstRunDone || hasPriorActivity
      : hasPriorActivity;

  return {
    version: 1,
    locale: typeof candidate.locale === "string" ? candidate.locale : undefined,
    firstRunDone,
    bestScore,
    totalKills,
    gamesPlayed,
    gold:
      typeof candidate.gold === "number" && Number.isFinite(candidate.gold)
        ? Math.max(0, candidate.gold)
        : defaults.gold,
    gems:
      typeof candidate.gems === "number" && Number.isFinite(candidate.gems)
        ? Math.max(0, candidate.gems)
        : defaults.gems,
    unlockedChapter,
    unlockedWeaponIds,
    equippedWeaponId: equippedLoadoutIds[0],
    equippedLoadoutIds,
    weaponLevels: normalizeWeaponLevels(candidate.weaponLevels),
    updatedAt:
      typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt)
        ? candidate.updatedAt
        : defaults.updatedAt,
  };
}

export const playerSaveService = {
  async loadSave(): Promise<PlayerSaveData> {
    const raw = await getPlatformAdapter().getData(PLAYER_SAVE_STORAGE_KEY);
    if (!raw) {
      return createDefaultSaveData();
    }
    const parsed: unknown = JSON.parse(raw);
    return normalizeSaveData(parsed);
  },

  async writeSave(save: PlayerSaveData): Promise<PlayerSaveData> {
    const next: PlayerSaveData = {
      ...save,
      version: 1,
      updatedAt: Date.now(),
    };
    await getPlatformAdapter().setData(PLAYER_SAVE_STORAGE_KEY, JSON.stringify(next));
    return next;
  },
};
