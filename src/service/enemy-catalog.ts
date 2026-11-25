export type EnemyGroup = "BASIC" | "TACTICAL" | "RANGED_SUPPORT" | "HIGH_THREAT";

export interface EnemyArchetypeSpec {
  id: string;
  index: number;
  name: string;
  group: EnemyGroup;
  speed: number;
  baseHp: number;
  scale: number;
  modelFile: string;
  fallbackKind: "NORMAL" | "ELITE";
  goldDrop: number;
  scoreValue: number;
  appearanceVi: string;
  behaviorVi: string;
  behaviorKey: string;
  params?: {
    swarmCountMin?: number;
    swarmCountMax?: number;
    rangedIntervalSec?: number;
    frontArmorReduction?: number;
    armorBreakDamage?: number;
    enrageHpPct?: number;
    enrageSpeedMultiplier?: number;
    explosionRadius?: number;
    stealthDurationSec?: number;
    stealthCooldownSec?: number;
    regenPerSec?: number;
    regenDelaySec?: number;
    splitSpawnId?: string;
    splitCount?: number;
    leechDps?: number;
    leechDurationSec?: number;
    healAuraPerSec?: number;
    auraRadius?: number;
    spawnCooldownSec?: number;
    spawnEnemyId?: string;
    shieldDamageReduction?: number;
    playerRofSlowPct?: number;
    defensePenaltyHp?: number;
    slowDurationSec?: number;
    rocketRadius?: number;
    voidPulseCooldownSec?: number;
    voidPulseRadius?: number;
  };
}

export interface BossSkillSpec {
  name: string;
  trigger: string;
  descriptionVi: string;
}

export interface BossSpec {
  id: string;
  chapter: number;
  name: string;
  hp: number;
  scale: number;
  speed: number;
  modelFile: string;
  goldReward: number;
  scoreReward: number;
  appearanceVi: string;
  coreMechanicVi: string;
  skills: BossSkillSpec[];
}

export interface ChapterWaveConfigSpec {
  chapter: number;
  waves: number;
  enemyPool: string[];
  bossId: string;
}

export const ENEMY_CATALOG: EnemyArchetypeSpec[] = [
  // ═══ NHÓM 1: Quái Cơ Bản (Tiếp cận thẳng) ═══
  {
    id: "crawler",
    index: 1,
    name: "Crawler",
    group: "BASIC",
    speed: 3.5,
    baseHp: 3,
    scale: 0.72,
    modelFile: "enemies/crawler.glb",
    fallbackKind: "NORMAL",
    goldDrop: 2,
    scoreValue: 10,
    appearanceVi: "Côn trùng ngoài hành tinh 6 chân, nhỏ, thân trong suốt",
    behaviorVi: "Đổ xuống thành đàn 4–6 con. Dễ bắn nhưng số lượng áp đảo.",
    behaviorKey: "SWARM_RUSH",
    params: { swarmCountMin: 4, swarmCountMax: 6 },
  },
  {
    id: "husk",
    index: 2,
    name: "Husk",
    group: "BASIC",
    speed: 3.0,
    baseHp: 10,
    scale: 1.05,
    modelFile: "enemies/husk.glb",
    fallbackKind: "NORMAL",
    goldDrop: 5,
    scoreValue: 15,
    appearanceVi: "Sinh vật nhân dạng, da khô nứt nẻ, mắt phát sáng vàng",
    behaviorVi: "Đi thẳng, mỗi 3s phun đạn chất độc về phía người chơi.",
    behaviorKey: "POISON_SPIT",
    params: { rangedIntervalSec: 3.0 },
  },
  {
    id: "skywing",
    index: 3,
    name: "Skywing",
    group: "BASIC",
    speed: 4.5,
    baseHp: 6,
    scale: 1.0,
    modelFile: "enemies/skywing.glb",
    fallbackKind: "NORMAL",
    goldDrop: 4,
    scoreValue: 15,
    appearanceVi: "Sinh vật có cánh màng, thân dẹt, lướt qua lại",
    behaviorVi: "Bay zigzag sang ngang liên tục, khó nhắm bắn.",
    behaviorKey: "ZIGZAG_FLIGHT",
  },
  {
    id: "shell_brute",
    index: 4,
    name: "Shell Brute",
    group: "BASIC",
    speed: 2.0,
    baseHp: 28,
    scale: 1.45,
    modelFile: "enemies/shell_brute.glb",
    fallbackKind: "ELITE",
    goldDrop: 12,
    scoreValue: 30,
    appearanceVi: "Bọ khổng lồ, mai giáp cứng dày phía trước",
    behaviorVi: "Mai giáp giảm 60% sát thương phía trước; vỡ mai sau khi nhận 20 sát thương.",
    behaviorKey: "FRONT_ARMOR_SHELL",
    params: { frontArmorReduction: 0.6, armorBreakDamage: 20 },
  },
  {
    id: "dasher",
    index: 5,
    name: "Dasher",
    group: "BASIC",
    speed: 7.5,
    baseHp: 5,
    scale: 1.15,
    modelFile: "enemies/dasher.glb",
    fallbackKind: "NORMAL",
    goldDrop: 4,
    scoreValue: 15,
    appearanceVi: "Sinh vật nhện gầy, chân dài bất thường",
    behaviorVi: "Chạy zigzag nhanh, bứt tốc 2x khi còn 20% HP.",
    behaviorKey: "ZIGZAG_SPRINT",
    params: { enrageHpPct: 0.2, enrageSpeedMultiplier: 2.0 },
  },

  // ═══ NHÓM 2: Quái Chiến Thuật ═══
  {
    id: "bloater",
    index: 6,
    name: "Bloater",
    group: "TACTICAL",
    speed: 3.5,
    baseHp: 7,
    scale: 1.25,
    modelFile: "enemies/bloater.glb",
    fallbackKind: "NORMAL",
    goldDrop: 6,
    scoreValue: 20,
    appearanceVi: "Sinh vật tròn phình to, da mỏng căng bóng, phát sáng đỏ bên trong",
    behaviorVi: "Lao thẳng xuống; khi chết phát nổ bán kính 2m.",
    behaviorKey: "VOLATILE_EXPLODE",
    params: { explosionRadius: 2.0 },
  },
  {
    id: "wraith",
    index: 7,
    name: "Wraith",
    group: "TACTICAL",
    speed: 3.5,
    baseHp: 14,
    scale: 1.15,
    modelFile: "enemies/wraith.glb",
    fallbackKind: "NORMAL",
    goldDrop: 8,
    scoreValue: 25,
    appearanceVi: "Thực thể vô hình dạng khói tối, chỉ thấy outline",
    behaviorVi: "Ẩn hình hoàn toàn 2s mỗi 5s — không thể bắn trúng khi đang ẩn.",
    behaviorKey: "PHASE_STEALTH",
    params: { stealthDurationSec: 2.0, stealthCooldownSec: 5.0 },
  },
  {
    id: "regen_beast",
    index: 8,
    name: "Regen Beast",
    group: "TACTICAL",
    speed: 2.5,
    baseHp: 22,
    scale: 1.35,
    modelFile: "enemies/regen_beast.glb",
    fallbackKind: "ELITE",
    goldDrop: 10,
    scoreValue: 30,
    appearanceVi: "Sinh vật cơ bắp có u thịt tái tạo nhanh trên da",
    behaviorVi: "Tự hồi 4 HP/giây nếu không bị bắn trúng trong 2s liên tiếp.",
    behaviorKey: "REGENERATION",
    params: { regenPerSec: 4, regenDelaySec: 2.0 },
  },
  {
    id: "splitter",
    index: 9,
    name: "Splitter",
    group: "TACTICAL",
    speed: 3.0,
    baseHp: 16,
    scale: 1.3,
    modelFile: "enemies/splitter.glb",
    fallbackKind: "NORMAL",
    goldDrop: 9,
    scoreValue: 25,
    appearanceVi: "Sinh vật hình cầu nhầy, lõi kép bên trong",
    behaviorVi: "Khi chết tách thành 2 Crawler nhỏ chạy tiếp xuống.",
    behaviorKey: "SPLIT_ON_DEATH",
    params: { splitSpawnId: "crawler", splitCount: 2 },
  },
  {
    id: "parasite",
    index: 10,
    name: "Parasite",
    group: "TACTICAL",
    speed: 5.0,
    baseHp: 8,
    scale: 0.85,
    modelFile: "enemies/parasite.glb",
    fallbackKind: "NORMAL",
    goldDrop: 5,
    scoreValue: 20,
    appearanceVi: "Sinh vật nhỏ dạng đỉa, trong suốt",
    behaviorVi: "Chạy thẳng cực nhanh; chạm người chơi bám vào hút 1 HP/s trong 3s.",
    behaviorKey: "LATCH_DRAIN",
    params: { leechDps: 1, leechDurationSec: 3.0 },
  },

  // ═══ NHÓM 3: Tầm Xa & Hỗ Trợ ═══
  {
    id: "spitter",
    index: 11,
    name: "Spitter",
    group: "RANGED_SUPPORT",
    speed: 0,
    baseHp: 32,
    scale: 1.3,
    modelFile: "enemies/spitter.glb",
    fallbackKind: "ELITE",
    goldDrop: 14,
    scoreValue: 35,
    appearanceVi: "Sinh vật cột sống lộ ra ngoài, miệng rộng",
    behaviorVi: "Đứng yên cố định ở đầu làn, mỗi 4s phun đạn axit về phía người chơi.",
    behaviorKey: "STATIC_ARTILLERY",
    params: { rangedIntervalSec: 4.0 },
  },
  {
    id: "healer_symbiont",
    index: 12,
    name: "Healer Symbiont",
    group: "RANGED_SUPPORT",
    speed: 2.0,
    baseHp: 12,
    scale: 0.9,
    modelFile: "enemies/healer_symbiont.glb",
    fallbackKind: "NORMAL",
    goldDrop: 8,
    scoreValue: 25,
    appearanceVi: "Sinh vật nhỏ màu xanh lá, tua bám sau lưng quái khác",
    behaviorVi: "Hồi 3 HP/giây cho quái trong bán kính 2.5m.",
    behaviorKey: "HEAL_AURA",
    params: { healAuraPerSec: 3, auraRadius: 2.5 },
  },
  {
    id: "brood_carrier",
    index: 13,
    name: "Brood Carrier",
    group: "RANGED_SUPPORT",
    speed: 1.5,
    baseHp: 38,
    scale: 1.6,
    modelFile: "enemies/brood_carrier.glb",
    fallbackKind: "ELITE",
    goldDrop: 16,
    scoreValue: 40,
    appearanceVi: "Sinh vật bụng phình to, nhiều trứng lộ ra ngoài",
    behaviorVi: "Mỗi 8s đẻ 1 Crawler trong lúc di chuyển xuống.",
    behaviorKey: "BROOD_SPAWN",
    params: { spawnCooldownSec: 8.0, spawnEnemyId: "crawler" },
  },
  {
    id: "force_bubble",
    index: 14,
    name: "Force Bubble",
    group: "RANGED_SUPPORT",
    speed: 1.0,
    baseHp: 22,
    scale: 1.4,
    modelFile: "enemies/force_bubble.glb",
    fallbackKind: "ELITE",
    goldDrop: 12,
    scoreValue: 35,
    appearanceVi: "Sinh vật phát sáng có màng bong bóng năng lượng bao quanh",
    behaviorVi: "Giảm 60% sát thương nhận vào cho toàn bộ quái trong bán kính 3m.",
    behaviorKey: "SHIELD_AURA",
    params: { shieldDamageReduction: 0.6, auraRadius: 3.0 },
  },
  {
    id: "disruptor",
    index: 15,
    name: "Disruptor",
    group: "RANGED_SUPPORT",
    speed: 2.0,
    baseHp: 16,
    scale: 1.15,
    modelFile: "enemies/disruptor.glb",
    fallbackKind: "NORMAL",
    goldDrop: 10,
    scoreValue: 30,
    appearanceVi: "Thực thể phát xung gây nhiễu trên làn",
    behaviorVi: "Khi còn sống giảm 30% tốc độ bắn của người chơi.",
    behaviorKey: "JAM_FIRERATE",
    params: { playerRofSlowPct: 0.3 },
  },

  // ═══ NHÓM 4: Quái Nguy Hiểm Cao ═══
  {
    id: "behemoth",
    index: 16,
    name: "Behemoth",
    group: "HIGH_THREAT",
    speed: 1.2,
    baseHp: 220,
    scale: 2.5,
    modelFile: "enemies/behemoth.glb",
    fallbackKind: "ELITE",
    goldDrop: 40,
    scoreValue: 100,
    appearanceVi: "Quái khổng lồ bọc giáp cực dày",
    behaviorVi: "Bước chậm làm rung màn hình; chạm vạch cuối làm người chơi mất 2 HP.",
    behaviorKey: "HEAVY_JUGGERNAUT",
    params: { defensePenaltyHp: 2 },
  },
  {
    id: "cryo_leech",
    index: 17,
    name: "Cryo Leech",
    group: "HIGH_THREAT",
    speed: 3.0,
    baseHp: 20,
    scale: 1.25,
    modelFile: "enemies/cryo_leech.glb",
    fallbackKind: "NORMAL",
    goldDrop: 11,
    scoreValue: 30,
    appearanceVi: "Sinh vật ký sinh băng giá màu xanh nhạt",
    behaviorVi: "Mỗi 4s bắn đạn băng; trúng làm chậm người chơi 2s.",
    behaviorKey: "CRYO_SHOT",
    params: { rangedIntervalSec: 4.0, slowDurationSec: 2.0 },
  },
  {
    id: "swarm_queen",
    index: 18,
    name: "Swarm Queen",
    group: "HIGH_THREAT",
    speed: 2.0,
    baseHp: 45,
    scale: 1.85,
    modelFile: "enemies/swarm_queen.glb",
    fallbackKind: "ELITE",
    goldDrop: 22,
    scoreValue: 60,
    appearanceVi: "Nữ hoàng côn trùng với phần bụng phát sáng vàng",
    behaviorVi: "Mỗi 5s đẻ 1 Crawler; không hạ sớm đàn sẽ nhân lên liên tục.",
    behaviorKey: "QUEEN_SPAWN",
    params: { spawnCooldownSec: 5.0, spawnEnemyId: "crawler" },
  },
  {
    id: "siege_worm",
    index: 19,
    name: "Siege Worm",
    group: "HIGH_THREAT",
    speed: 1.0,
    baseHp: 160,
    scale: 2.2,
    modelFile: "enemies/siege_worm.glb",
    fallbackKind: "ELITE",
    goldDrop: 32,
    scoreValue: 80,
    appearanceVi: "Giun khổng lồ thân đốt bọc giáp cứng, miệng có pháo sinh học",
    behaviorVi: "Mỗi 5s phóng đạn rocket sinh học nổ bán kính 2m về phía người chơi.",
    behaviorKey: "SIEGE_MORTAR",
    params: { rangedIntervalSec: 5.0, rocketRadius: 2.0 },
  },
  {
    id: "void_hulk",
    index: 20,
    name: "Void Hulk",
    group: "HIGH_THREAT",
    speed: 0.8,
    baseHp: 300,
    scale: 2.7,
    modelFile: "enemies/void_hulk.glb",
    fallbackKind: "ELITE",
    goldDrop: 55,
    scoreValue: 130,
    appearanceVi: "Sinh thể vật chất tối khổng lồ với lõi hút ánh sáng",
    behaviorVi: "Chậm, HP cực cao; mỗi 10s phát xung 4m đẩy người chơi sang làn ngược lại.",
    behaviorKey: "VOID_PULSE",
    params: { voidPulseCooldownSec: 10.0, voidPulseRadius: 4.0 },
  },
];

export const BOSS_CATALOG: BossSpec[] = [
  {
    id: "iron_warden",
    chapter: 1,
    name: "IRON WARDEN",
    hp: 2600,
    scale: 5.0,
    speed: 1.85,
    modelFile: "bosses/iron_warden.glb",
    goldReward: 250,
    scoreReward: 500,
    appearanceVi: "Mech robot 2 chân, cầm khiên và súng laser.",
    coreMechanicVi: "Dưới 50% HP mất khiên, tốc độ bắn tăng gấp đôi và mở khóa Rocket Barrage.",
    skills: [
      { name: "Laser Sweep", trigger: "Phase 1 (100%→50%)", descriptionVi: "Vạch đỏ cảnh báo 1.5s rồi quét tia laser toàn bộ làn trái." },
      { name: "Shield Bash", trigger: "Phase 1", descriptionVi: "Lao lên tung sóng xung kích bán nguyệt bán kính 4m." },
      { name: "Rocket Barrage", trigger: "Phase 2 (<50%)", descriptionVi: "Phóng 3 tên lửa zigzag rơi dọc làn." },
    ],
  },
  {
    id: "nano_hydra",
    chapter: 2,
    name: "NANO HYDRA",
    hp: 8000,
    scale: 5.2,
    speed: 1.75,
    modelFile: "bosses/nano_hydra.glb",
    goldReward: 400,
    scoreReward: 900,
    appearanceVi: "3 đầu rắn robot nối thân kim loại linh hoạt.",
    coreMechanicVi: "Hạ từng đầu riêng (3 đầu x 2,666 HP); mỗi đầu chết các đầu còn lại tăng tốc 20%.",
    skills: [
      { name: "Acid Spray", trigger: "Đầu trái", descriptionVi: "Phun axit cong bao phủ làn trái." },
      { name: "Headbutt Lunge", trigger: "Đầu giữa", descriptionVi: "Lao thẳng xuống gây knockback." },
      { name: "Drone Deploy", trigger: "Đầu phải (8s)", descriptionVi: "Triệu hồi 2 Drone con mỗi 8s." },
    ],
  },
  {
    id: "crystal_colossus",
    chapter: 3,
    name: "CRYSTAL COLOSSUS",
    hp: 15000,
    scale: 5.4,
    speed: 1.65,
    modelFile: "bosses/crystal_colossus.glb",
    goldReward: 600,
    scoreReward: 1400,
    appearanceVi: "Người khổng lồ pha lê trong suốt khúc xạ ánh sáng.",
    coreMechanicVi: "Miễn nhiễm 100% đạn nổ lan Splash; dưới 50% HP nứt lộ lõi đỏ chịu x2 sát thương.",
    skills: [
      { name: "Crystal Wall", trigger: "Định kỳ", descriptionVi: "Dựng tường pha lê 400 HP chắn ngang đường đạn." },
      { name: "Shard Storm", trigger: "Định kỳ", descriptionVi: "Phóng 12 mảnh pha lê tỏa 360°." },
    ],
  },
  {
    id: "swarm_mother",
    chapter: 4,
    name: "SWARM MOTHER",
    hp: 25000,
    scale: 5.5,
    speed: 1.55,
    modelFile: "bosses/swarm_mother.glb",
    goldReward: 850,
    scoreReward: 2000,
    appearanceVi: "Nhện khổng lồ cơ học mang 4 Ổ Trứng Lõi phát sáng.",
    coreMechanicVi: "Boss miễn nhiễm hoàn toàn tới khi phá hết 4 Ổ Trứng Lõi (500 HP/ổ).",
    skills: [
      { name: "Sprinter Brood", trigger: "Mỗi 6s", descriptionVi: "Đẻ 2 Sprinter từ bụng mỗi 6s." },
      { name: "Acid Surge", trigger: "Phase 2", descriptionVi: "Tăng tốc x2 và phun axit bán kính 3m." },
    ],
  },
  {
    id: "omega_prime",
    chapter: 5,
    name: "OMEGA PRIME",
    hp: 40000,
    scale: 5.6,
    speed: 1.7,
    modelFile: "bosses/omega_prime.glb",
    goldReward: 1200,
    scoreReward: 2800,
    appearanceVi: "T-Rex cơ khí có cánh và giàn tên lửa trên lưng.",
    coreMechanicVi: "3 Phase chiến đấu: Không chiến (100→70%), Chạy bộ cắn làn (70→30%), Nổi điên giảm 50% cooldown (<30%).",
    skills: [
      { name: "Orbital Laser", trigger: "Phase 1+", descriptionVi: "Cảnh báo 2s rồi rọi chùm laser từ trên cao." },
      { name: "Missile Rain", trigger: "Phase 1+", descriptionVi: "Thả 5 tên lửa dàn ngang." },
      { name: "Chomp", trigger: "Phase 2+", descriptionVi: "Cắn thẳng vào làn cảnh báo đỏ 1s." },
    ],
  },
  {
    id: "shadow_architect",
    chapter: 6,
    name: "SHADOW ARCHITECT",
    hp: 60000,
    scale: 4.8,
    speed: 1.9,
    modelFile: "bosses/shadow_architect.glb",
    goldReward: 1600,
    scoreReward: 3800,
    appearanceVi: "Hình người bóng đen thuần túy, mắt trắng phát sáng.",
    coreMechanicVi: "Tạo bản sao phân thân (chỉ Boss thật chớp sáng trắng khi trúng đạn).",
    skills: [
      { name: "Reality Flip", trigger: "Định kỳ", descriptionVi: "Đảo ngược 2 làn chơi trong 5s." },
      { name: "Mirror Bullets", trigger: "Định kỳ", descriptionVi: "Phản xạ ngược đạn người chơi trong 2s." },
    ],
  },
  {
    id: "volcanic_titan",
    chapter: 7,
    name: "VOLCANIC TITAN",
    hp: 90000,
    scale: 5.8,
    speed: 1.4,
    modelFile: "bosses/volcanic_titan.glb",
    goldReward: 2100,
    scoreReward: 5000,
    appearanceVi: "Khổng lồ dung nham vỏ đá nứt nẻ rực lửa.",
    coreMechanicVi: "Phase 1 miễn nhiễm trừ điểm nứt sáng (Weak Point); dưới 50% HP lộ lõi thường trực.",
    skills: [
      { name: "Lava Surge", trigger: "Định kỳ", descriptionVi: "Phun sóng dung nham dọc một làn." },
      { name: "Eruption", trigger: "Định kỳ", descriptionVi: "Rải 8 cột lửa tồn tại 3s khắp màn." },
    ],
  },
  {
    id: "chrono_keeper",
    chapter: 8,
    name: "CHRONO KEEPER",
    hp: 130000,
    scale: 5.4,
    speed: 1.6,
    modelFile: "bosses/chrono_keeper.glb",
    goldReward: 2800,
    scoreReward: 6500,
    appearanceVi: "Robot đồng hồ cát khổng lồ với 2 nửa thân xoay ngược chiều.",
    coreMechanicVi: "Điều khiển thời gian và tự tua ngược hồi 10,000 HP mỗi 30s.",
    skills: [
      { name: "Time Slow", trigger: "Định kỳ", descriptionVi: "Làm chậm đạn người chơi 70% trong 4s." },
      { name: "Time Stop", trigger: "Định kỳ", descriptionVi: "Đóng băng mọi đạn/quái 2.5s." },
      { name: "Temporal Clone", trigger: "Định kỳ", descriptionVi: "Gọi bản sao quá khứ tồn tại 10s." },
    ],
  },
  {
    id: "void_leviathan",
    chapter: 9,
    name: "VOID LEVIATHAN",
    hp: 200000,
    scale: 6.0,
    speed: 1.5,
    modelFile: "bosses/void_leviathan.glb",
    goldReward: 3800,
    scoreReward: 9000,
    appearanceVi: "Rắn vũ trụ 10 đốt phát sáng tím đen.",
    coreMechanicVi: "Phải phá từng đốt lần lượt từ đuôi lên đầu (15,000 HP/đốt).",
    skills: [
      { name: "Cosmic Ray", trigger: "Phase 1+", descriptionVi: "Bắn tia vũ trụ xuyên thẳng toàn màn." },
      { name: "Void Drain", trigger: "Định kỳ", descriptionVi: "Hút toàn bộ đạn trên màn trong 3s." },
    ],
  },
  {
    id: "genesis_core",
    chapter: 10,
    name: "GENESIS CORE",
    hp: 350000,
    scale: 6.4,
    speed: 1.35,
    modelFile: "bosses/genesis_core.glb",
    goldReward: 6000,
    scoreReward: 15000,
    appearanceVi: "Lõi năng lượng vũ trụ hình cầu với 3 vòng giáp quỹ đạo.",
    coreMechanicVi: "Phá 3 vòng bảo vệ (mỗi vòng 4 ụ súng) để lộ lõi; dưới 20% HP bật đếm ngược Supernova 10s.",
    skills: [
      { name: "Gravity Well", trigger: "Phase 1+", descriptionVi: "Kéo người chơi về phía Boss." },
      { name: "System Purge", trigger: "Định kỳ", descriptionVi: "Triệu hồi 10 quái ngẫu nhiên." },
      { name: "Supernova Warning", trigger: "<20% HP", descriptionVi: "Đếm ngược 10s bắt buộc kết liễu Boss." },
    ],
  },
];

export const CHAPTER_WAVE_POOLS: Record<number, ChapterWaveConfigSpec> = {
  1: {
    chapter: 1,
    waves: 4,
    enemyPool: ["crawler", "husk"],
    bossId: "iron_warden",
  },
  2: {
    chapter: 2,
    waves: 6,
    enemyPool: ["dasher", "bloater", "regen_beast", "parasite", "crawler"],
    bossId: "nano_hydra",
  },
  3: {
    chapter: 3,
    waves: 7,
    enemyPool: ["wraith", "cryo_leech", "shell_brute", "force_bubble"],
    bossId: "crystal_colossus",
  },
  4: {
    chapter: 4,
    waves: 7,
    enemyPool: ["swarm_queen", "brood_carrier", "splitter", "crawler"],
    bossId: "swarm_mother",
  },
  5: {
    chapter: 5,
    waves: 8,
    enemyPool: ["skywing", "disruptor", "healer_symbiont", "parasite"],
    bossId: "omega_prime",
  },
  6: {
    chapter: 6,
    waves: 8,
    enemyPool: ["wraith", "dasher", "void_hulk", "disruptor"],
    bossId: "shadow_architect",
  },
  7: {
    chapter: 7,
    waves: 8,
    enemyPool: ["spitter", "siege_worm", "behemoth", "bloater"],
    bossId: "volcanic_titan",
  },
  8: {
    chapter: 8,
    waves: 9,
    enemyPool: ["healer_symbiont", "brood_carrier", "regen_beast", "force_bubble"],
    bossId: "chrono_keeper",
  },
  9: {
    chapter: 9,
    waves: 9,
    enemyPool: ["spitter", "siege_worm", "void_hulk", "wraith"],
    bossId: "void_leviathan",
  },
  10: {
    chapter: 10,
    waves: 10,
    enemyPool: ENEMY_CATALOG.map((e) => e.id),
    bossId: "genesis_core",
  },
};

export function getEnemyById(id: string): EnemyArchetypeSpec | undefined {
  return ENEMY_CATALOG.find((item) => item.id === id);
}

export function getBossByChapter(chapter: number): BossSpec {
  return BOSS_CATALOG.find((item) => item.chapter === chapter) ?? BOSS_CATALOG[0];
}

export function getChapterWavePool(chapter: number): ChapterWaveConfigSpec {
  return CHAPTER_WAVE_POOLS[chapter] ?? CHAPTER_WAVE_POOLS[1];
}
