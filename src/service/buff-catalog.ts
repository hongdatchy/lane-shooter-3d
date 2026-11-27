import {
  ActiveBuffsStateDTO,
  BuffGateId,
  BuffGateSpecDTO,
  RightLaneGateEntityDTO,
} from "@/dto/GameDTO";
import { ARENA_CONFIG } from "@/service/game-constants";

export const MAX_PLAYER_CLONES = 2;
export const MAX_SHIELD_CHARGES = 6;
export const ITEMS_PER_WAVE = 2;

export const BUFF_GATE_CATALOG: Record<BuffGateId, BuffGateSpecDTO> = {
  x2_clone: {
    id: "x2_clone",
    badgeText: "[x2 CLONE]",
    color: "#06b6d4",
    scope: "RUN",
    targetHits: 8,
  },
  piercing: {
    id: "piercing",
    badgeText: "[PIERCING]",
    color: "#eab308",
    scope: "WAVE",
    targetHits: 6,
  },
  multishot: {
    id: "multishot",
    badgeText: "[MULTISHOT]",
    color: "#f97316",
    scope: "WAVE",
    targetHits: 7,
  },
  ricochet: {
    id: "ricochet",
    badgeText: "[RICOCHET]",
    color: "#a855f7",
    scope: "WAVE",
    targetHits: 6,
  },
  explosive: {
    id: "explosive",
    badgeText: "[EXPLOSIVE]",
    color: "#ef4444",
    scope: "WAVE",
    targetHits: 7,
  },
  shield: {
    id: "shield",
    badgeText: "[SHIELD]",
    color: "#bae6fd",
    scope: "CHARGES",
    charges: 3,
    targetHits: 7,
  },
  lightning: {
    id: "lightning",
    badgeText: "[LIGHTNING]",
    color: "#f8fafc",
    scope: "INSTANT",
    targetHits: 6,
  },
  cluster_bomb: {
    id: "cluster_bomb",
    badgeText: "[CLUSTER BOMB]",
    color: "#22c55e",
    scope: "INSTANT",
    targetHits: 6,
  },
  heal_hp: {
    id: "heal_hp",
    badgeText: "[+HP]",
    color: "#ec4899",
    scope: "INSTANT",
    targetHits: 5,
  },
  magnet: {
    id: "magnet",
    badgeText: "[MAGNET]",
    color: "#fde047",
    scope: "TIMED",
    durationSeconds: 10,
    targetHits: 5,
  },
  freeze_field: {
    id: "freeze_field",
    badgeText: "[FREEZE FIELD]",
    color: "#38bdf8",
    scope: "TIMED",
    durationSeconds: 5,
    targetHits: 6,
  },
  turret_drop: {
    id: "turret_drop",
    badgeText: "[TURRET DROP]",
    color: "#d97706",
    scope: "TIMED",
    durationSeconds: 10,
    targetHits: 7,
  },
};

const OFFENSE_BUFF_IDS: BuffGateId[] = [
  "x2_clone",
  "multishot",
  "piercing",
  "explosive",
  "ricochet",
  "turret_drop",
];

const TACTICAL_BUFF_IDS: BuffGateId[] = [
  "shield",
  "lightning",
  "cluster_bomb",
  "freeze_field",
  "heal_hp",
  "magnet",
];

export function getBuffGateSpec(id: BuffGateId): BuffGateSpecDTO {
  return BUFF_GATE_CATALOG[id];
}

export function createEmptyActiveBuffs(startingClones = 0): ActiveBuffsStateDTO {
  return {
    clones: Math.max(0, Math.min(MAX_PLAYER_CLONES, startingClones)),
    piercing: false,
    multishot: false,
    ricochet: false,
    explosive: false,
    shieldCharges: 0,
    magnetTimeLeft: 0,
    freezeTimeLeft: 0,
    turretTimeLeft: 0,
  };
}

function pickRandomExcluding(candidates: BuffGateId[], excluded: Set<BuffGateId>): BuffGateId | null {
  const pool = candidates.filter((id) => !excluded.has(id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Sinh đúng 2 Cổng Buff cho mỗi Wave (ở chế độ thường đặt ở Làn Phải; khi singleLane=true ở Dev Mode thì gom thẳng vào cùng 1 lane giữa).
 */
export function generateWaveRightLaneGates(
  wave: number,
  options: {
    hp: number;
    maxHp: number;
    activeBuffs: ActiveBuffsStateDTO;
    singleLane?: boolean;
  }
): RightLaneGateEntityDTO[] {
  const blocked = new Set<BuffGateId>();
  if (options.activeBuffs.clones >= MAX_PLAYER_CLONES) {
    blocked.add("x2_clone");
  }
  if (options.activeBuffs.shieldCharges >= MAX_SHIELD_CHARGES) {
    blocked.add("shield");
  }
  if (options.hp >= options.maxHp) {
    blocked.add("heal_hp");
  }

  // Wave 1 ưu tiên có sẵn ít nhất 1 nâng cấp hỏa lực trực tiếp rõ rệt (như Multishot/Explosive/Clone/Piercing)
  const firstPool = wave === 1
    ? (["multishot", "x2_clone", "explosive", "piercing", "ricochet", "turret_drop"] as BuffGateId[])
    : OFFENSE_BUFF_IDS;

  const firstPick =
    pickRandomExcluding(firstPool, blocked) ??
    pickRandomExcluding(TACTICAL_BUFF_IDS, blocked) ??
    "multishot";
  blocked.add(firstPick);

  const secondPool = TACTICAL_BUFF_IDS;
  const secondPick =
    pickRandomExcluding(secondPool, blocked) ??
    pickRandomExcluding(OFFENSE_BUFF_IDS, blocked) ??
    "lightning";

  const picks: [BuffGateId, BuffGateId] = [firstPick, secondPick];

  return ([0, 1] as const).map((slotIndex) => {
    const spec = getBuffGateSpec(picks[slotIndex]);
    const pos = ARENA_CONFIG.rightLaneGates[slotIndex];
    return {
      slotIndex,
      buffId: spec.id,
      x: options.singleLane ? ARENA_CONFIG.playerStartX : pos.x,
      z: options.singleLane ? (slotIndex === 0 ? -5.5 : -11.5) : pos.z,
      hits: 0,
      targetHits: spec.targetHits,
      claimed: false,
    };
  });
}
