import { StageConfigDTO, WeaponConfigDTO } from "@/dto/GameDTO";

export const WEAPON_CATALOG: WeaponConfigDTO[] = [
  {
    tier: 1,
    id: "pistol",
    name: "Súng Lục Đơn Phát",
    description: "Bắn từng viên cơ bản, tốc độ vừa phải",
    fireRate: 3.6,
    bulletCount: 1,
    spreadDeg: 1,
    damage: 1.5,
    bulletSpeed: 32,
    bulletSize: [0.16, 0.16, 0.65],
    splashRadius: 0,
    bulletColor: "#38bdf8",
    accentColor: "#0284c7",
    minStage: 1,
  },
  {
    tier: 2,
    id: "ak-rifle",
    name: "Súng Trường AKA",
    description: "Bắn liên thanh nhanh và sát thương khá",
    fireRate: 7.0,
    bulletCount: 1,
    spreadDeg: 2.8,
    damage: 3.5,
    bulletSpeed: 38,
    bulletSize: [0.2, 0.2, 0.85],
    splashRadius: 0,
    bulletColor: "#fbbf24",
    accentColor: "#d97706",
    minStage: 1,
  },
  {
    tier: 3,
    id: "machine-gun",
    name: "Súng Máy Hạng Nặng",
    description: "Xả đạn cực nhanh áp đảo số lượng quái",
    fireRate: 14.0,
    bulletCount: 1,
    spreadDeg: 4.5,
    damage: 5.5,
    bulletSpeed: 42,
    bulletSize: [0.18, 0.18, 0.92],
    splashRadius: 0,
    bulletColor: "#34d399",
    accentColor: "#059669",
    minStage: 1,
  },
  {
    tier: 4,
    id: "cannon",
    name: "Súng Đại Bác",
    description: "Bắn chậm hơn súng máy nhưng đạn khổng lồ, dame cực khủng & nổ lan",
    fireRate: 3,
    bulletCount: 1,
    spreadDeg: 0.8,
    damage: 55,
    bulletSpeed: 34,
    bulletSize: [0.62, 0.62, 1.4],
    splashRadius: 3.2,
    bulletColor: "#fb7185",
    accentColor: "#e11d48",
    minStage: 1,
  },
  {
    tier: 5,
    id: "icbm",
    name: "Tên Lửa Liên Lục Địa",
    description: "Vũ khí tối thượng màn cuối: bắn như Đại Bác, Nộ phóng tên lửa 100.000 Dame",
    fireRate: 3,
    bulletCount: 1,
    spreadDeg: 0.8,
    damage: 55,
    bulletSpeed: 34,
    bulletSize: [0.62, 0.62, 1.4],
    splashRadius: 3.2,
    bulletColor: "#fb923c",
    accentColor: "#ea580c",
    minStage: 6,
  },
];

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
    eliteHp: 200000,
    normalScale: 5.2,
    eliteScale: 5.2,
    eliteChance: 1,
    spawnMinInterval: 1.0,
    spawnMaxInterval: 1.0,
    maxBatchSize: 1,
    isBossStage: true,
  },
];

// Số phát bắn cần để mở hòm vũ khí theo từng đợt (không cho ăn item mãi nữa, max là Tên Lửa Liên Lục Địa ở màn cuối)
// Đợt 0 (Súng Lục -> AKA): 10 phát
// Đợt 1 (AKA -> Súng Máy): 22 phát
// Đợt 2 (Súng Máy -> Đại Bác): 45 phát
// Đợt 3 (Đại Bác -> Tên Lửa Liên Lục Địa, chỉ mở ở màn cuối): 18 phát
const CRATE_TARGETS = [10, 22, 45, 18];

export const weaponService = {
  getWeaponByIndex(index: number): WeaponConfigDTO {
    const safeIdx = Math.max(0, Math.min(index, WEAPON_CATALOG.length - 1));
    return WEAPON_CATALOG[safeIdx];
  },

  isMaxWeapon(index: number): boolean {
    return index >= WEAPON_CATALOG.length - 1;
  },

  getWeaponMinStage(weapon: WeaponConfigDTO): number {
    if (typeof weapon.minStage === "number") {
      return Math.max(1, Math.floor(weapon.minStage));
    }
    if (weapon.finalStageOnly) {
      return STAGE_CATALOG.length;
    }
    return 1;
  },

  isLockedUntilFinalStage(index: number, currentStage: number): boolean {
    const next = WEAPON_CATALOG[index + 1];
    if (!next) return false;
    return currentStage < this.getWeaponMinStage(next);
  },

  getLockedNextWeapon(
    index: number,
    currentStage: number
  ): { weapon: WeaponConfigDTO; minStage: number } | null {
    const next = WEAPON_CATALOG[index + 1];
    if (!next) return null;
    const minStage = this.getWeaponMinStage(next);
    if (currentStage < minStage) {
      return { weapon: next, minStage };
    }
    return null;
  },

  getNextWeapon(index: number, currentStage = STAGE_CATALOG.length): WeaponConfigDTO | null {
    const next = WEAPON_CATALOG[index + 1];
    if (!next) return null;
    if (currentStage < this.getWeaponMinStage(next)) {
      return null;
    }
    return next;
  },

  getStageConfig(stage: number): StageConfigDTO {
    const safeIdx = Math.max(0, Math.min(stage - 1, STAGE_CATALOG.length - 1));
    return STAGE_CATALOG[safeIdx];
  },

  getTotalStages(): number {
    return STAGE_CATALOG.length;
  },

  getCrateTargetForBatch(batchNumber: number): number {
    const safeBatch = Math.max(0, Math.min(batchNumber, CRATE_TARGETS.length - 1));
    return CRATE_TARGETS[safeBatch];
  },

  getEffectiveFireRate(weapon: WeaponConfigDTO, overdriveLevel: number): number {
    return weapon.fireRate * (1 + overdriveLevel * 0.15);
  },

  getEffectiveDamage(weapon: WeaponConfigDTO, overdriveLevel: number): number {
    return Number((weapon.damage * (1 + overdriveLevel * 0.25)).toFixed(1));
  },
};

export default weaponService;
