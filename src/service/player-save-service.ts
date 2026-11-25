import { getPlatformAdapter } from "@/platform";
import {
  ARMORY_WEAPONS,
  DEFAULT_LOADOUT_IDS,
  MAX_LOADOUT_SLOTS,
} from "@/service/armory-catalog";

export const PLAYER_SAVE_STORAGE_KEY = "lane_shooter_save_v1";

export interface PlayerSaveData {
  version: 1;
  locale?: string;
  bestScore: number;
  totalKills: number;
  gamesPlayed: number;
  gold: number;
  gems: number;
  unlockedChapter: number;
  equippedWeaponId: string;
  equippedLoadoutIds: string[];
  weaponLevels: Record<string, number>;
  updatedAt: number;
}

export function createDefaultSaveData(): PlayerSaveData {
  return {
    version: 1,
    bestScore: 0,
    totalKills: 0,
    gamesPlayed: 0,
    gold: 0,
    gems: 0,
    unlockedChapter: 1,
    equippedWeaponId: DEFAULT_LOADOUT_IDS[0],
    equippedLoadoutIds: [...DEFAULT_LOADOUT_IDS],
    weaponLevels: {},
    updatedAt: 0,
  };
}

function normalizeLoadoutIds(
  rawLoadout: unknown,
  fallbackPrimary: string,
  unlockedChapter: number
): string[] {
  const unlockedIds = new Set(
    ARMORY_WEAPONS.filter((w) => w.unlockChapter <= unlockedChapter).map((w) => w.id)
  );
  const result: string[] = [];

  if (Array.isArray(rawLoadout)) {
    for (const item of rawLoadout) {
      if (
        typeof item === "string" &&
        unlockedIds.has(item) &&
        !result.includes(item) &&
        result.length < MAX_LOADOUT_SLOTS
      ) {
        result.push(item);
      }
    }
  }

  if (result.length > 0) {
    return result;
  }

  if (unlockedIds.has(fallbackPrimary)) {
    result.push(fallbackPrimary);
  }
  for (const id of DEFAULT_LOADOUT_IDS) {
    if (result.length >= MAX_LOADOUT_SLOTS) break;
    if (unlockedIds.has(id) && !result.includes(id)) {
      result.push(id);
    }
  }
  return result.length > 0 ? result : [ARMORY_WEAPONS[0].id];
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
  const rawEquipped =
    typeof candidate.equippedWeaponId === "string" && candidate.equippedWeaponId.trim()
      ? candidate.equippedWeaponId.trim()
      : defaults.equippedWeaponId;
  const equippedLoadoutIds = normalizeLoadoutIds(
    candidate.equippedLoadoutIds,
    rawEquipped,
    unlockedChapter
  );

  return {
    version: 1,
    locale: typeof candidate.locale === "string" ? candidate.locale : undefined,
    bestScore:
      typeof candidate.bestScore === "number" && Number.isFinite(candidate.bestScore)
        ? Math.max(0, candidate.bestScore)
        : defaults.bestScore,
    totalKills:
      typeof candidate.totalKills === "number" && Number.isFinite(candidate.totalKills)
        ? Math.max(0, candidate.totalKills)
        : defaults.totalKills,
    gamesPlayed:
      typeof candidate.gamesPlayed === "number" && Number.isFinite(candidate.gamesPlayed)
        ? Math.max(0, candidate.gamesPlayed)
        : defaults.gamesPlayed,
    gold:
      typeof candidate.gold === "number" && Number.isFinite(candidate.gold)
        ? Math.max(0, candidate.gold)
        : defaults.gold,
    gems:
      typeof candidate.gems === "number" && Number.isFinite(candidate.gems)
        ? Math.max(0, candidate.gems)
        : defaults.gems,
    unlockedChapter,
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
