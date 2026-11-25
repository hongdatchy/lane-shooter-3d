export type GameStatus = "MENU" | "PLAYING" | "PAUSED" | "GAME_OVER" | "VICTORY";

export type CameraMode = "TOP_DOWN" | "THIRD_PERSON" | "FREE_ORBIT";

export type EnemyKind = "NORMAL" | "ELITE" | "BOSS";

export type WeaponModelKindDTO = "pistol" | "ak-rifle" | "machine-gun" | "cannon" | "icbm";

export interface WeaponConfigDTO {
  id: string;
  modelKind: WeaponModelKindDTO;
  name: string;
  description: string;
  fireRate: number;                    // Số phát bắn mỗi giây
  bulletCount: number;                 // Số viên đạn mỗi phát
  spreadDeg: number;                   // Độ lệch/tỏa đường đạn (độ)
  damage: number;                      // Sát thương mỗi viên
  bulletSpeed: number;
  bulletSize: [number, number, number]; // Kích thước [rộng, cao, dài] của viên đạn 3D
  splashRadius: number;                // Bán kính nổ lan (0 nếu không nổ lan)
  bulletColor: string;
  accentColor: string;
}

export interface LeaderboardEntryDTO {
  id: string;
  playerName: string;
  score: number;
  wave: number;
  kills: number;
  victory: boolean;
  gamesPlayed: number;
  updatedAt: number;
}

export interface IcbmStrikeDTO {
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  delaySeconds: number;
}

export interface StageConfigDTO {
  stage: number;
  targetKills: number;                 // Số quái cần hạ để qua màn
  normalSpeed: number;
  eliteSpeed: number;
  normalHp: number;
  eliteHp: number;
  normalScale: number;                 // Kích thước quái thường tăng dần qua các màn
  eliteScale: number;                  // Kích thước quái Elite tăng dần qua các màn
  eliteChance: number;
  spawnMinInterval: number;
  spawnMaxInterval: number;
  maxBatchSize: number;
  isBossStage?: boolean;
}

export interface EnemyEntity {
  active: boolean;
  id: number;
  kind: EnemyKind;
  x: number;
  z: number;
  speed: number;
  hp: number;
  maxHp: number;
  scale: number;
  radius: number;
  hitFlash: number;
  phase: number;
  knockbackVx: number;
  knockbackVz: number;
}

export interface BulletEntity {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  splashRadius: number;
  size: [number, number, number];
  color: string;
}

export interface ParticleEntity {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface GameRuntimeRef {
  playerX: number;
  playerVelocityX: number;
  cratePulse: number;
  screenShake: number;
}

export type SoundEventKey =
  | "shootPistol"
  | "shootAk"
  | "shootMachineGun"
  | "shootCannon"
  | "hitEnemy"
  | "cannonExplosion"
  | "killEnemy"
  | "killBoss"
  | "hitCrate"
  | "upgradeWeapon"
  | "rageReady"
  | "rageActivate"
  | "icbmLaunch"
  | "icbmImpact"
  | "playerHit"
  | "stageClear"
  | "bossWarning"
  | "bossBite"
  | "victory"
  | "gameOver";

export interface SoundConfigEntryDTO {
  enabled: boolean;
  src: string;        // Đường dẫn file âm thanh (VD: "/sounds/ban.mp3"), để "" để dùng âm tổng hợp mặc định
  volume: number;     // Âm lượng riêng (0 -> 1)
  cooldownMs: number; // Thời gian giãn cách tối thiểu (ms) để tránh rè loa khi bắn liên thanh
}
