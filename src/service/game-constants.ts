import { SoundConfigEntryDTO, SoundEventKey } from "@/dto/GameDTO";

export const ARENA_CONFIG = {
  width: 20,
  length: 48,
  centerZ: -11,
  dividerX: 5, // Làn trái (-10 -> +5, rộng 15) = 3x làn phải (+5 -> +10, rộng 5)

  playerStartX: -2.5,
  playerZ: 6.5,
  playerMinX: -9.0,
  playerMaxX: 9.0,
  playerSpeed: 9,

  defenseLineZ: 5.4,
  spawnZ: -32,
  bulletDespawnZ: -35,

  // Làn bên trái: Quái tấn công (rộng 15, gấp 3 lần làn item)
  leftLaneMinX: -9.1,
  leftLaneMaxX: 4.1,

  // Làn bên phải: Tối đa 2 Cổng Buff mỗi Wave (rộng 5, tâm ở +7.5)
  crateX: 7.5,
  crateZ: -7.5,
  crateHalfWidth: 1.45,
  crateHalfDepth: 1.45,
  gateHalfWidth: 1.05,
  gateHalfDepth: 0.9,
  rightLaneGates: [
    { x: 6.25, z: -6.5 },
    { x: 8.65, z: -11.5 },
  ],
} as const;

export function getActiveLeftLaneBounds(narrowLane: boolean): {
  minX: number;
  maxX: number;
  maxEnemyX: number;
  centerX: number;
} {
  if (narrowLane) {
    return {
      minX: ARENA_CONFIG.playerStartX - 0.55,
      maxX: ARENA_CONFIG.playerStartX + 0.55,
      maxEnemyX: ARENA_CONFIG.playerStartX + 0.55,
      centerX: ARENA_CONFIG.playerStartX,
    };
  }
  return {
    minX: ARENA_CONFIG.leftLaneMinX,
    maxX: ARENA_CONFIG.dividerX,
    maxEnemyX: ARENA_CONFIG.leftLaneMaxX,
    centerX: (ARENA_CONFIG.leftLaneMinX + ARENA_CONFIG.dividerX) / 2,
  };
}

// Cấu hình trạng thái Nộ (Mưa Đạn)
export const RAGE_CONFIG = {
  maxRage: 100,
  durationSeconds: 5,
  fireRateMultiplier: 2,     // Tốc độ bắn nhân lên khi bật Nộ
  bulletSpeedMultiplier: 2,  // Tốc độ bay viên đạn nhân lên khi bật Nộ
  bulletCountMultiplier: 10, // Số tia đạn mỗi đợt nhân lên khi bật Nộ
  fanSpreadDeg: 42,          // Góc tỏa hình quạt của mưa đạn (độ)
  fanJitterDeg: 2.5,         // Độ lệch ngẫu nhiên mỗi tia (độ)
  fanOffsetWidth: 0.85,      // Độ rộng trải ngang ở đầu nòng

  // Tốc độ & điểm tích nộ khi chiến đấu (đã giảm 1/2 so với bản trước)
  regenPerSecond: 1,         // Nộ tự hồi mỗi giây
  gainMultiplier: 1,         // Giảm từ 2 -> 1 (hồi nộ chậm lại 1/2)
  gainPerHit: 2.5,
  gainPerCannonHit: 2.4,
  gainPerNormalKill: 4,
  gainPerEliteKill: 10,
  gainPerCrateUpgrade: 15,
} as const;

// Hồi Nộ mỗi phát bắn trúng theo từng loại súng (cân bằng theo tốc bắn & số tia đạn)
export const WEAPON_RAGE_GAIN_PER_HIT: Record<string, number> = {
  pistol: 3.0,
  ak47: 1.6,
  shotgun: 0.9,
  smg_neon: 0.8,
  cryo_gun: 2.6,
  minigun: 0.5,
  tesla_gun: 2.2,
  scatter: 0.75,
  cannon: 2.6,
  rocket_launcher: 3.6,
  grenade_launcher: 2.4,
  flamethrower: 0.55,
  acid_sprayer: 0.75,
  plasma_rifle: 0.6,
  rail_gun: 4.2,
  laser_cannon: 0.8,
  vortex_gun: 4.0,
  photon_burst: 2.2,
  nuke_launcher: 8.0,
  icbm: 2.6,
  turret: 0.45,
};

export function getWeaponRageGainPerHit(
  weaponId: string,
  splashRadius = 0
): number {
  const configured = WEAPON_RAGE_GAIN_PER_HIT[weaponId];
  if (typeof configured === "number") {
    return configured;
  }
  return splashRadius > 0 ? RAGE_CONFIG.gainPerCannonHit : RAGE_CONFIG.gainPerHit;
}

// Cấu hình Nộ Tên Lửa Liên Lục Địa (Súng cuối - chỉ hiện ở màn cuối)
export const ICBM_CONFIG = {
  missileDamage: 100000,   // Sát thương tên lửa (100.000)
  impactDelaySeconds: 2,   // Độ trễ từ lúc click chuột đến khi tên lửa rơi trúng mục tiêu (giây)
  explosionRadius: 7.5,    // Bán kính vùng nổ sát thương của tên lửa
  knockbackSpeed: 70,//28     // Lực đẩy văng quái ra xa tâm nổ tên lửa
  knockbackDamping: 5,//6.5   // Độ hãm trượt sau khi bị đẩy
} as const;

// Cấu hình âm thanh (Nếu muốn dùng file riêng, bỏ file vào public/sounds/ rồi điền đường dẫn vào src, VD: "/sounds/aka.mp3")
export const SOUND_CONFIG: {
  enabled: boolean;
  masterVolume: number;
  events: Record<SoundEventKey, SoundConfigEntryDTO>;
} = {
  enabled: true,
  masterVolume: 0.65,
  events: {
    shootPistol: { enabled: true, src: "", volume: 0.35, cooldownMs: 55 },
    shootAk: { enabled: true, src: "", volume: 0.32, cooldownMs: 55 },
    shootMachineGun: { enabled: true, src: "", volume: 0.25, cooldownMs: 50 },
    shootCannon: { enabled: true, src: "", volume: 0.6, cooldownMs: 110 },

    hitEnemy: { enabled: true, src: "", volume: 0.28, cooldownMs: 45 },
    cannonExplosion: { enabled: true, src: "", volume: 0.55, cooldownMs: 85 },
    killEnemy: { enabled: true, src: "", volume: 0.4, cooldownMs: 55 },
    killBoss: { enabled: true, src: "", volume: 0.85, cooldownMs: 250 },

    hitCrate: { enabled: true, src: "", volume: 0.28, cooldownMs: 50 },
    upgradeWeapon: { enabled: true, src: "", volume: 0.65, cooldownMs: 200 },

    rageReady: { enabled: true, src: "", volume: 0.6, cooldownMs: 300 },
    rageActivate: { enabled: true, src: "", volume: 0.75, cooldownMs: 300 },
    icbmLaunch: { enabled: true, src: "", volume: 0.85, cooldownMs: 300 },
    icbmImpact: { enabled: true, src: "", volume: 0.95, cooldownMs: 300 },

    playerHit: { enabled: true, src: "", volume: 0.6, cooldownMs: 150 },
    stageClear: { enabled: true, src: "", volume: 0.7, cooldownMs: 300 },
    bossWarning: { enabled: true, src: "", volume: 0.85, cooldownMs: 400 },
    bossBite: { enabled: true, src: "", volume: 0.9, cooldownMs: 300 },
    victory: { enabled: true, src: "", volume: 0.8, cooldownMs: 500 },
    gameOver: { enabled: true, src: "", volume: 0.7, cooldownMs: 400 },
  },
};
