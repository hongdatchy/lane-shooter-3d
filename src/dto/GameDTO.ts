export type GameStatus = "MENU" | "PLAYING" | "PAUSED" | "GAME_OVER" | "VICTORY";

export type CameraMode = "TOP_DOWN" | "THIRD_PERSON" | "FREE_ORBIT";

export type EnemyKind =
  | "NORMAL"
  | "ELITE"
  | "SKYWING"
  | "SHELL_BRUTE"
  | "DASHER"
  | "BLOATER"
  | "BOSS";

export type EnemyVisualKind =
  | "CRAWLER"
  | "HUSK"
  | "SKYWING"
  | "SHELL_BRUTE"
  | "DASHER"
  | "BLOATER"
  | "BOSS_STAGE1"
  | "BOSS_STAGE2"
  | "BOSS_STAGE3";

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

export interface EnemySpawnEntryDTO {
  kind: EnemyKind;
  weight: number;
  hp?: number;
  speed?: number;
  scale?: number;
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
  spawnPool?: EnemySpawnEntryDTO[];
}

export interface EnemyEntity {
  active: boolean;
  dying: boolean;
  deathTimer: number;
  deathDuration: number;
  stunTimer: number;
  acidTimer: number;
  armorBroken: boolean;
  shellArmorHp: number;
  enraged: boolean;
  attackCooldown: number;
  castTimer: number;
  castFired: boolean;
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

export interface EnemyProjectileEntity {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  color: string;
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
  pierceRemaining: number;
  ricochetRemaining: number;
  lastHitEnemyId: number;
  secondLastHitEnemyId: number;
  fromRage: boolean;
  homing: boolean;
  weaponId?: string;
}

export type RageSkillMode =
  | "DURATION_BUFF"
  | "DURATION_FIELD"
  | "DURATION_SWARM"
  | "INSTANT_AOE"
  | "AIM_TARGET";

export interface RageSkillSpecDTO {
  id: string;
  mode: RageSkillMode;
  durationSeconds: number;
  overrideRps?: number;
  fireRateMultiplier?: number;
  bulletCountMultiplier?: number;
  damageMultiplier?: number;
  bulletSpeedMultiplier?: number;
  bulletScaleMultiplier?: number;
  pierceCount?: number;
  parallelStreams?: number;
  spreadDeg?: number;
  pelletsPerShot?: number;
  slowRatio?: number;
  acidMeltSeconds?: number;
  aoeRadius?: number;
  knockbackSpeed?: number;
  stunSeconds?: number;
  mineCount?: number;
  swarmTotalCount?: number;
  strikeCount?: number;
  strikeKind?: "cannon" | "nuke" | "icbm";
  falloutSeconds?: number;
}

export interface PendingRageTriggerDTO {
  seq: number;
  weaponId: string;
}

export interface OrbitalStrikePendingDTO {
  seq: number;
  kind: "cannon" | "nuke" | "icbm";
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  delaySeconds: number;
  radius: number;
  damage: number;
  falloutSeconds?: number;
}

export type BuffGateId =
  | "x2_clone"
  | "piercing"
  | "multishot"
  | "ricochet"
  | "explosive"
  | "shield"
  | "lightning"
  | "cluster_bomb"
  | "heal_hp"
  | "magnet"
  | "freeze_field"
  | "turret_drop";

export type BuffScopeDTO = "RUN" | "WAVE" | "CHARGES" | "INSTANT" | "TIMED";

export interface BuffGateSpecDTO {
  id: BuffGateId;
  badgeText: string;
  color: string;
  scope: BuffScopeDTO;
  durationSeconds?: number;
  charges?: number;
  targetHits: number;
}

export interface RightLaneGateEntityDTO {
  slotIndex: 0 | 1;
  buffId: BuffGateId;
  x: number;
  z: number;
  hits: number;
  targetHits: number;
  claimed: boolean;
}

export interface ActiveBuffsStateDTO {
  clones: number;
  piercing: boolean;
  multishot: boolean;
  ricochet: boolean;
  explosive: boolean;
  shieldCharges: number;
  magnetTimeLeft: number;
  freezeTimeLeft: number;
  turretTimeLeft: number;
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
