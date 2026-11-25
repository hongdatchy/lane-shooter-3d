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

// Cấu hình 5 màn chơi: Quái càng về sau và càng to thì máu càng trâu gấp bội để bắt buộc phải nâng cấp súng
export const STAGE_CATALOG: StageConfigDTO[] = [
  {
    stage: 1,
    targetKills: 12,
    normalSpeed: 3.2,
    eliteSpeed: 2.5,
    normalHp: 3,
    eliteHp: 10,
    normalScale: 0.8,
    eliteScale: 1.35,
    eliteChance: 0.1,
    spawnMinInterval: 0.9,
    spawnMaxInterval: 1.3,
    maxBatchSize: 1,
  },
  {
    stage: 2,
    targetKills: 16,
    normalSpeed: 4.1,
    eliteSpeed: 3.2,
    normalHp: 12,
    eliteHp: 36,
    normalScale: 1.05,
    eliteScale: 1.75,
    eliteChance: 0.25,
    spawnMinInterval: 0.72,
    spawnMaxInterval: 1.05,
    maxBatchSize: 2,
  },
  {
    stage: 3,
    targetKills: 20,
    normalSpeed: 5.0,
    eliteSpeed: 3.9,
    normalHp: 28,
    eliteHp: 90,
    normalScale: 1.3,
    eliteScale: 2.15,
    eliteChance: 0.3,
    spawnMinInterval: 0.58,
    spawnMaxInterval: 0.88,
    maxBatchSize: 2,
  },
  {
    stage: 4,
    targetKills: 12,
    normalSpeed: 5.6,
    eliteSpeed: 4.5,
    normalHp: 75,
    eliteHp: 210,
    normalScale: 1.6,
    eliteScale: 2.6,
    eliteChance: 0.58,
    spawnMinInterval: 0.9,
    spawnMaxInterval: 1.3,
    maxBatchSize: 1,
  },
  {
    stage: 5,
    targetKills: 10,
    normalSpeed: 6.2,
    eliteSpeed: 5.0,
    normalHp: 150,
    eliteHp: 440,
    normalScale: 1.9,
    eliteScale: 3.1,
    eliteChance: 0.72,
    spawnMinInterval: 1.0,
    spawnMaxInterval: 1.45,
    maxBatchSize: 1,
  },
  {
    stage: 6,
    targetKills: 1,
    normalSpeed: 1.85,
    eliteSpeed: 1.85,
    normalHp: 2600,
    eliteHp: 300000,
    normalScale: 5.2,
    eliteScale: 5.2,
    eliteChance: 1,
    spawnMinInterval: 1.0,
    spawnMaxInterval: 1.0,
    maxBatchSize: 1,
    isBossStage: true,
  },
];

// Số phát bắn cần để kích hoạt Overdrive Buff trên bệ làn phải (chỉ tăng DMG & ROF, không đổi súng)
const OVERDRIVE_TARGETS = [10, 16, 24, 34, 46];

export const weaponService = {
  resolveCombatWeapon(weaponId: string, level = 1): WeaponConfigDTO {
    return resolveCombatWeaponById(weaponId, level);
  },

  getStageConfig(stage: number): StageConfigDTO {
    const safeIdx = Math.max(0, Math.min(stage - 1, STAGE_CATALOG.length - 1));
    return STAGE_CATALOG[safeIdx];
  },

  getTotalStages(): number {
    return STAGE_CATALOG.length;
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
