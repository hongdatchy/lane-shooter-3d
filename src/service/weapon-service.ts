import { StageConfigDTO, WeaponConfigDTO, WeaponModelKindDTO } from "@/dto/GameDTO";
import {
  getArmoryWeaponById,
  getWeaponStatsAtLevel,
} from "@/service/armory-catalog";

interface BallisticProfile {
  bulletSpeed: number;
  spreadDeg: number;
  bulletSize: [number, number, number];
}

const MODEL_BALLISTIC_DEFAULTS: Record<WeaponModelKindDTO, BallisticProfile> = {
  pistol: { bulletSpeed: 32, spreadDeg: 1.0, bulletSize: [0.16, 0.16, 0.65] },
  "ak-rifle": { bulletSpeed: 38, spreadDeg: 2.8, bulletSize: [0.2, 0.2, 0.85] },
  "machine-gun": { bulletSpeed: 42, spreadDeg: 4.5, bulletSize: [0.18, 0.18, 0.92] },
  cannon: { bulletSpeed: 34, spreadDeg: 1.0, bulletSize: [0.52, 0.52, 1.3] },
  icbm: { bulletSpeed: 34, spreadDeg: 0.8, bulletSize: [0.62, 0.62, 1.4] },
};

const WEAPON_BALLISTIC_OVERRIDES: Record<string, Partial<BallisticProfile>> = {
  shotgun: { bulletSpeed: 32, spreadDeg: 16, bulletSize: [0.15, 0.15, 0.45] },
  scatter: { bulletSpeed: 36, spreadDeg: 14, bulletSize: [0.18, 0.18, 0.6] },
  plasma_rifle: { bulletSpeed: 42, spreadDeg: 10, bulletSize: [0.2, 0.2, 0.9] },
  rail_gun: { bulletSpeed: 64, spreadDeg: 0.3, bulletSize: [0.22, 0.22, 1.8] },
  laser_cannon: { bulletSpeed: 56, spreadDeg: 0.5, bulletSize: [0.24, 0.24, 1.6] },
  nuke_launcher: { bulletSpeed: 28, spreadDeg: 0.8, bulletSize: [0.68, 0.68, 1.45] },
};

// Danh sách vũ khí cơ bản tham chiếu cho model 3D & HUD
export const WEAPON_CATALOG: WeaponConfigDTO[] = [
  resolveCombatWeaponById("pistol", 1),
  resolveCombatWeaponById("ak47", 1),
  resolveCombatWeaponById("minigun", 1),
  resolveCombatWeaponById("cannon", 1),
  resolveCombatWeaponById("icbm", 1),
];

export function resolveCombatWeaponById(weaponId: string, level = 1): WeaponConfigDTO {
  const spec = getArmoryWeaponById(weaponId);
  const clampedLevel = Math.max(1, Math.min(10, Math.floor(level)));
  const scaled = getWeaponStatsAtLevel(spec, clampedLevel);
  const baseProfile = MODEL_BALLISTIC_DEFAULTS[spec.modelKind];
  const customProfile = WEAPON_BALLISTIC_OVERRIDES[spec.id];

  // ICBM & Laser Cannon sử dụng nhịp bắn cơ bản ổn định trên lane; Nộ giữ đúng kỹ năng đặc trưng
  const combatFireRate =
    spec.id === "laser_cannon"
      ? Number((14 + (clampedLevel - 1) * 0.45).toFixed(1))
      : spec.id === "icbm"
        ? 3.0
        : scaled.fireRate;

  const combatDamage =
    spec.id === "laser_cannon"
      ? Number((12 * (1 + (clampedLevel - 1) * 0.1)).toFixed(1))
      : spec.id === "icbm"
        ? Number((55 * (1 + (clampedLevel - 1) * 0.1)).toFixed(1))
        : scaled.damage;

  const combatSplash = spec.id === "icbm" ? 3.2 : spec.splashRadius;

  return {
    id: spec.id,
    modelKind: spec.modelKind,
    name: spec.name,
    description: spec.rageSkillDescVi,
    fireRate: combatFireRate,
    bulletCount: spec.projectilesPerShot,
    spreadDeg: customProfile?.spreadDeg ?? baseProfile.spreadDeg,
    damage: combatDamage,
    bulletSpeed: customProfile?.bulletSpeed ?? baseProfile.bulletSpeed,
    bulletSize: customProfile?.bulletSize ?? baseProfile.bulletSize,
    splashRadius: combatSplash,
    bulletColor: spec.tracerHex,
    accentColor: spec.tracerHex,
  };
}

// Cấu hình Cửa 1 (4 Wave): Wave 1 Quái 1 -> Wave 2 Quái 2 -> Wave 3 Kết hợp -> Wave 4 Boss 1
export const STAGE_CATALOG: StageConfigDTO[] = [
  {
    stage: 1,
    targetKills: 24,
    normalSpeed: 3.4,
    eliteSpeed: 3.0,
    normalHp: 15,
    eliteHp: 10,
    normalScale: 0.9,
    eliteScale: 1.2,
    eliteChance: 0, // Wave 1: 100% Quái 1 (HP x5)
    spawnMinInterval: 0.72,
    spawnMaxInterval: 1.05,
    maxBatchSize: 3,
  },
  {
    stage: 2,
    targetKills: 22,
    normalSpeed: 3.4,
    eliteSpeed: 3.0,
    normalHp: 20,
    eliteHp: 10,
    normalScale: 0.95,
    eliteScale: 1.25,
    eliteChance: 1, // Wave 2: 100% Quái 2
    spawnMinInterval: 0.8,
    spawnMaxInterval: 1.15,
    maxBatchSize: 2,
  },
  {
    stage: 3,
    targetKills: 36,
    normalSpeed: 3.9,
    eliteSpeed: 3.3,
    normalHp: 30,
    eliteHp: 18,
    normalScale: 1.0,
    eliteScale: 1.35,
    eliteChance: 0.4, // Wave 3: Kết hợp Quái 1 + Quái 2
    spawnMinInterval: 0.58,
    spawnMaxInterval: 0.88,
    maxBatchSize: 3,
  },
  {
    stage: 4,
    targetKills: 1,
    normalSpeed: 1.05,
    eliteSpeed: 1.05,
    normalHp: 260,
    eliteHp: 260, // Wave 4: Boss 1 (1/10 HP so với bản cũ)
    normalScale: 4.8,
    eliteScale: 4.8,
    eliteChance: 1,
    spawnMinInterval: 1.0,
    spawnMaxInterval: 1.0,
    maxBatchSize: 1,
    isBossStage: true,
  },
];

// Cấu hình Cửa 2 (5 Wave): Wave 1 (Quái 1 + Quái 2) -> Wave 2 (Quái 3) -> Wave 3 (Quái 4) -> Wave 4 (Cả 3 nhóm quái) -> Wave 5 (Boss 2)
export const STAGE_CATALOG_CH2: StageConfigDTO[] = [
  {
    stage: 1,
    targetKills: 28,
    normalSpeed: 3.7,
    eliteSpeed: 3.1,
    normalHp: 25,
    eliteHp: 14,
    normalScale: 0.95,
    eliteScale: 1.25,
    eliteChance: 0.45,
    spawnMinInterval: 0.68,
    spawnMaxInterval: 1.0,
    maxBatchSize: 3,
    spawnPool: [
      { kind: "NORMAL", weight: 0.55, hp: 25, speed: 3.7, scale: 0.95 },
      { kind: "ELITE", weight: 0.45, hp: 14, speed: 3.1, scale: 1.25 },
    ],
  },
  {
    stage: 2,
    targetKills: 24,
    normalSpeed: 4.4,
    eliteSpeed: 4.4,
    normalHp: 10,
    eliteHp: 10,
    normalScale: 1.05,
    eliteScale: 1.05,
    eliteChance: 0,
    spawnMinInterval: 0.62,
    spawnMaxInterval: 0.95,
    maxBatchSize: 3,
    spawnPool: [
      { kind: "SKYWING", weight: 1, hp: 10, speed: 4.4, scale: 1.05 },
    ],
  },
  {
    stage: 3,
    targetKills: 16,
    normalSpeed: 2.15,
    eliteSpeed: 2.15,
    normalHp: 32,
    eliteHp: 32,
    normalScale: 1.42,
    eliteScale: 1.42,
    eliteChance: 0,
    spawnMinInterval: 0.85,
    spawnMaxInterval: 1.2,
    maxBatchSize: 2,
    spawnPool: [
      { kind: "SHELL_BRUTE", weight: 1, hp: 32, speed: 2.15, scale: 1.42 },
    ],
  },
  {
    stage: 4,
    targetKills: 36,
    normalSpeed: 3.9,
    eliteSpeed: 3.3,
    normalHp: 35,
    eliteHp: 18,
    normalScale: 1.0,
    eliteScale: 1.3,
    eliteChance: 0.5,
    spawnMinInterval: 0.56,
    spawnMaxInterval: 0.88,
    maxBatchSize: 3,
    spawnPool: [
      { kind: "NORMAL", weight: 0.16, hp: 35, speed: 3.9, scale: 1.0 },
      { kind: "ELITE", weight: 0.24, hp: 18, speed: 3.3, scale: 1.3 },
      { kind: "SKYWING", weight: 0.34, hp: 12, speed: 4.6, scale: 1.1 },
      { kind: "SHELL_BRUTE", weight: 0.26, hp: 36, speed: 2.25, scale: 1.48 },
    ],
  },
  {
    stage: 5,
    targetKills: 1,
    normalSpeed: 1.35,
    eliteSpeed: 1.35,
    normalHp: 1200,
    eliteHp: 1200, // Wave 5: Boss 2 Nano Hydra
    normalScale: 5.0,
    eliteScale: 5.0,
    eliteChance: 1,
    spawnMinInterval: 1.0,
    spawnMaxInterval: 1.0,
    maxBatchSize: 1,
    isBossStage: true,
  },
];

// Cấu hình Cửa 3 (5 Wave): Quy tắc 2 quái mới (#5 Dasher, #6 Bloater) + 1 quái màn trước (#4 Shell Brute) -> Boss 3 (Chrono Warrior)
export const STAGE_CATALOG_CH3: StageConfigDTO[] = [
  {
    stage: 1,
    targetKills: 22,
    normalSpeed: 6.8,
    eliteSpeed: 2.2,
    normalHp: 18,
    eliteHp: 38,
    normalScale: 1.15,
    eliteScale: 1.45,
    eliteChance: 0,
    spawnMinInterval: 0.65,
    spawnMaxInterval: 0.98,
    maxBatchSize: 3,
    spawnPool: [
      { kind: "SHELL_BRUTE", weight: 0.35, hp: 38, speed: 2.2, scale: 1.45 },
      { kind: "DASHER", weight: 0.65, hp: 18, speed: 6.8, scale: 1.15 },
    ],
  },
  {
    stage: 2,
    targetKills: 28,
    normalSpeed: 7.2,
    eliteSpeed: 7.2,
    normalHp: 20,
    eliteHp: 20,
    normalScale: 1.15,
    eliteScale: 1.15,
    eliteChance: 0,
    spawnMinInterval: 0.52,
    spawnMaxInterval: 0.82,
    maxBatchSize: 3,
    spawnPool: [
      { kind: "DASHER", weight: 1, hp: 20, speed: 7.2, scale: 1.15 },
    ],
  },
  {
    stage: 3,
    targetKills: 24,
    normalSpeed: 3.5,
    eliteSpeed: 3.5,
    normalHp: 28,
    eliteHp: 28,
    normalScale: 1.28,
    eliteScale: 1.28,
    eliteChance: 0,
    spawnMinInterval: 0.62,
    spawnMaxInterval: 0.96,
    maxBatchSize: 3,
    spawnPool: [
      { kind: "BLOATER", weight: 1, hp: 28, speed: 3.5, scale: 1.28 },
    ],
  },
  {
    stage: 4,
    targetKills: 38,
    normalSpeed: 7.3,
    eliteSpeed: 2.3,
    normalHp: 22,
    eliteHp: 44,
    normalScale: 1.18,
    eliteScale: 1.5,
    eliteChance: 0,
    spawnMinInterval: 0.52,
    spawnMaxInterval: 0.84,
    maxBatchSize: 3,
    spawnPool: [
      { kind: "SHELL_BRUTE", weight: 0.24, hp: 44, speed: 2.3, scale: 1.5 },
      { kind: "DASHER", weight: 0.4, hp: 22, speed: 7.3, scale: 1.18 },
      { kind: "BLOATER", weight: 0.36, hp: 32, speed: 3.6, scale: 1.32 },
    ],
  },
  {
    stage: 5,
    targetKills: 1,
    normalSpeed: 1.45,
    eliteSpeed: 1.45,
    normalHp: 2800,
    eliteHp: 2800, // Wave 5: Boss 3 Chrono Warrior (Chiến Binh Thời Gian)
    normalScale: 5.2,
    eliteScale: 5.2,
    eliteChance: 1,
    spawnMinInterval: 1.0,
    spawnMaxInterval: 1.0,
    maxBatchSize: 1,
    isBossStage: true,
  },
];

export const MAX_PLAYABLE_CHAPTER = 3;

export const CHAPTER_STAGE_CATALOGS: Record<number, StageConfigDTO[]> = {
  1: STAGE_CATALOG,
  2: STAGE_CATALOG_CH2,
  3: STAGE_CATALOG_CH3,
};

// Số phát bắn cần để kích hoạt Overdrive Buff trên bệ làn phải (chỉ tăng DMG & ROF, không đổi súng)
const OVERDRIVE_TARGETS = [10, 16, 24, 34, 46];

export const weaponService = {
  resolveCombatWeapon(weaponId: string, level = 1): WeaponConfigDTO {
    return resolveCombatWeaponById(weaponId, level);
  },

  getStageConfig(stage: number, chapterId = 1): StageConfigDTO {
    const list = CHAPTER_STAGE_CATALOGS[chapterId] ?? CHAPTER_STAGE_CATALOGS[1];
    const safeIdx = Math.max(0, Math.min(stage - 1, list.length - 1));
    return list[safeIdx];
  },

  getTotalStages(chapterId = 1): number {
    const list = CHAPTER_STAGE_CATALOGS[chapterId] ?? CHAPTER_STAGE_CATALOGS[1];
    return list.length;
  },

  getOverdriveTargetHits(overdriveLevel: number): number {
    if (overdriveLevel < OVERDRIVE_TARGETS.length) {
      return OVERDRIVE_TARGETS[Math.max(0, overdriveLevel)];
    }
    return 46 + (overdriveLevel - OVERDRIVE_TARGETS.length + 1) * 16;
  },

  getEffectiveFireRate(weapon: WeaponConfigDTO, overdriveLevel: number): number {
    return weapon.fireRate * (1 + overdriveLevel * 0.15);
  },

  getEffectiveDamage(weapon: WeaponConfigDTO, overdriveLevel: number): number {
    return Number((weapon.damage * (1 + overdriveLevel * 0.25)).toFixed(1));
  },
};

export default weaponService;
