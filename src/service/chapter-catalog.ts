export interface ChapterConfig {
  id: number;
  code: string;
  shortLabel: string;
  title: string;
  biome: string;
  hazardLevel: number;
  waves: number;
  mapPos: { xPct: number; yPct: number };
  themeGradient: string;
  accentHex: string;
  icon: "city" | "bio" | "ice" | "hive" | "orbit" | "mirror" | "magma" | "time" | "void" | "apex";
  hostiles: string[];
  boss: {
    name: string;
    hp: number;
    description: string;
  };
  weapons: [
    { name: string; tag: string },
    { name: string; tag: string },
  ];
}

export const CHAPTER_CATALOG: ChapterConfig[] = [
  {
    id: 1,
    code: "SEC-01 // IRON",
    shortLabel: "CH 01",
    title: "IRON DISTRICT",
    biome: "RUINED STEEL MEGACITY",
    hazardLevel: 2,
    waves: 4,
    mapPos: { xPct: 12, yPct: 74 },
    themeGradient: "from-[#0b2333] via-[#122a3a] to-[#0a131f]",
    accentHex: "#00F0FF",
    icon: "city",
    hostiles: ["CRAWLER (SWARM)", "HUSK (TOXIN)", "SHELL BRUTE", "SKYWING"],
    boss: {
      name: "IRON WARDEN",
      hp: 260,
      description: "Armored bipedal juggernaut wielding a heavy shield and sweeping lane laser.",
    },
    weapons: [
      { name: "AK ASSAULT RIFLE", tag: "CH.1 · ASSAULT" },
      { name: "SCATTER SHOTGUN", tag: "CH.1 · SHOTGUN" },
    ],
  },
  {
    id: 2,
    code: "SEC-02 // OMEGA",
    shortLabel: "CH 02",
    title: "BIO LAB OMEGA",
    biome: "SUBTERRANEAN GENE VAULT",
    hazardLevel: 4,
    waves: 5,
    mapPos: { xPct: 24, yPct: 52 },
    themeGradient: "from-[#0a2a24] via-[#0f362d] to-[#091518]",
    accentHex: "#10B981",
    icon: "bio",
    hostiles: ["CRAWLER (SWARM)", "HUSK (TOXIN)", "SKYWING (ZIGZAG)", "SHELL BRUTE (ARMOR)"],
    boss: {
      name: "NANO HYDRA",
      hp: 1200,
      description: "Three-headed bio-mech serpent with corrosive lane sweeps and drone spawns.",
    },
    weapons: [
      { name: "SMG NEON", tag: "CH.2 · RAPID" },
      { name: "CRYO GUN", tag: "CH.2 · ENERGY" },
    ],
  },
  {
    id: 3,
    code: "SEC-03 // CRYO",
    shortLabel: "CH 03",
    title: "CRYSTAL TUNDRA",
    biome: "FROZEN PRISM WASTELAND",
    hazardLevel: 5,
    waves: 5,
    mapPos: { xPct: 36, yPct: 34 },
    themeGradient: "from-[#0c2640] via-[#133859] to-[#0a1424]",
    accentHex: "#7DF4FF",
    icon: "ice",
    hostiles: ["DASHER (#05 · SPRINT)", "BLOATER (#06 · EXPLODE)", "SHELL BRUTE (#04 · ARMOR)"],
    boss: {
      name: "CHRONO WARRIOR",
      hp: 2800,
      description: "Time-forged scythe warrior with a 12-halo core; launches temporal energy orbs across lanes.",
    },
    weapons: [
      { name: "MINIGUN", tag: "CH.3 · RAPID" },
      { name: "TESLA GUN", tag: "CH.3 · ENERGY" },
    ],
  },
  {
    id: 4,
    code: "SEC-04 // HIVE",
    shortLabel: "CH 04",
    title: "HIVE CORE",
    biome: "ORGANIC BROOD NEST",
    hazardLevel: 6,
    waves: 7,
    mapPos: { xPct: 48, yPct: 60 },
    themeGradient: "from-[#2c190a] via-[#3d210b] to-[#170c08]",
    accentHex: "#FE9800",
    icon: "hive",
    hostiles: ["SWARM QUEEN", "BROOD CARRIER", "SPLITTER", "CRAWLER (SWARM)"],
    boss: {
      name: "SWARM MOTHER",
      hp: 25000,
      description: "Protected by 4 egg sacs; destroy all brood cores to expose her armored abdomen.",
    },
    weapons: [
      { name: "SCATTER GUN", tag: "CH.3 · KINETIC" },
      { name: "HEAVY CANNON", tag: "CH.4 · HEAVY" },
    ],
  },
  {
    id: 5,
    code: "SEC-05 // ORBIT",
    shortLabel: "CH 05",
    title: "ORBITAL FORTRESS",
    biome: "LOW-EARTH ORBIT STATION",
    hazardLevel: 7,
    waves: 8,
    mapPos: { xPct: 58, yPct: 38 },
    themeGradient: "from-[#121c38] via-[#19284f] to-[#0a0f1f]",
    accentHex: "#38BDF8",
    icon: "orbit",
    hostiles: ["SKYWING", "DISRUPTOR", "HEALER SYMBIONT", "PARASITE"],
    boss: {
      name: "OMEGA PRIME",
      hp: 40000,
      description: "Winged cyber-rex launching orbital beams, missile rain, and enraged lane bites.",
    },
    weapons: [
      { name: "ROCKET LAUNCHER", tag: "CH.5 · HEAVY" },
      { name: "GRENADE LAUNCHER", tag: "CH.5 · HEAVY" },
    ],
  },
  {
    id: 6,
    code: "SEC-06 // MIRROR",
    shortLabel: "CH 06",
    title: "MIRROR DIMENSION",
    biome: "INVERTED VOID PLANE",
    hazardLevel: 8,
    waves: 8,
    mapPos: { xPct: 68, yPct: 66 },
    themeGradient: "from-[#24133d] via-[#301952] to-[#110a1e]",
    accentHex: "#A855F7",
    icon: "mirror",
    hostiles: ["WRAITH (STEALTH)", "DASHER (SWARM)", "VOID HULK", "DISRUPTOR"],
    boss: {
      name: "SHADOW ARCHITECT",
      hp: 60000,
      description: "Spawns shadow decoys, flips lanes, and reflects incoming projectiles back at you.",
    },
    weapons: [
      { name: "FLAMETHROWER", tag: "CH.6 · THERMAL" },
      { name: "ACID SPRAYER", tag: "CH.6 · BIO-ACID" },
    ],
  },
  {
    id: 7,
    code: "SEC-07 // MAGMA",
    shortLabel: "CH 07",
    title: "MAGMA CORE",
    biome: "VOLCANIC CRUST CHAMBERS",
    hazardLevel: 8,
    waves: 8,
    mapPos: { xPct: 77, yPct: 40 },
    themeGradient: "from-[#3b120e] via-[#541911] to-[#1c0808]",
    accentHex: "#F97316",
    icon: "magma",
    hostiles: ["SPITTER (ACID)", "SIEGE WORM", "BEHEMOTH", "BLOATER (ACID)"],
    boss: {
      name: "VOLCANIC TITAN",
      hp: 90000,
      description: "Molten colossus vulnerable only at exposed magma fissures between lava surges.",
    },
    weapons: [
      { name: "ACID SPRAYER", tag: "CH.6 · BIO-ACID" },
      { name: "PLASMA RIFLE", tag: "CH.7 · PLASMA" },
    ],
  },
  {
    id: 8,
    code: "SEC-08 // CHRONO",
    shortLabel: "CH 08",
    title: "TIME RIFT",
    biome: "FRACTURED TEMPORAL LOOP",
    hazardLevel: 9,
    waves: 9,
    mapPos: { xPct: 85, yPct: 62 },
    themeGradient: "from-[#0e2636] via-[#1c324a] to-[#0b101c]",
    accentHex: "#22D3EE",
    icon: "time",
    hostiles: ["HEALER SYMBIONT", "BROOD CARRIER", "REGEN BEAST", "FORCE BUBBLE"],
    boss: {
      name: "CHRONO KEEPER",
      hp: 130000,
      description: "Freezes time, slows player rounds by 70%, and rewinds HP unless bursted fast.",
    },
    weapons: [
      { name: "RAIL GUN", tag: "CH.8 · RAILGUN" },
      { name: "LASER CANNON", tag: "CH.8 · BEAM" },
    ],
  },
  {
    id: 9,
    code: "SEC-09 // VOID",
    shortLabel: "CH 09",
    title: "DEEP SPACE",
    biome: "EVENT HORIZON EXPANSE",
    hazardLevel: 9,
    waves: 9,
    mapPos: { xPct: 87, yPct: 32 },
    themeGradient: "from-[#170f2e] via-[#1f133d] to-[#070612]",
    accentHex: "#C084FC",
    icon: "void",
    hostiles: ["SPITTER (ACID)", "SIEGE WORM", "VOID HULK", "WRAITH (STEALTH)"],
    boss: {
      name: "VOID LEVIATHAN",
      hp: 200000,
      description: "10-segment cosmic serpent; destroy segments from tail to head while dodging beams.",
    },
    weapons: [
      { name: "VORTEX GUN", tag: "CH.9 · GRAVITY" },
      { name: "PHOTON BURST", tag: "CH.9 · PHOTON" },
    ],
  },
  {
    id: 10,
    code: "SEC-10 // APEX",
    shortLabel: "CH 10 APEX",
    title: "GENESIS CORE",
    biome: "COSMIC SINGULARITY NEXUS",
    hazardLevel: 10,
    waves: 10,
    mapPos: { xPct: 93, yPct: 50 },
    themeGradient: "from-[#450a1a] via-[#5c0d24] to-[#1a050b]",
    accentHex: "#FF2A6D",
    icon: "apex",
    hostiles: ["ALL 20 HOSTILES", "VOID HULK", "SIEGE WORM", "BEHEMOTH"],
    boss: {
      name: "GENESIS CORE",
      hp: 350000,
      description: "Orbital defense rings shield the core. Break all turrets before Supernova purge.",
    },
    weapons: [
      { name: "NUKE LAUNCHER", tag: "CH.10 · NUCLEAR" },
      { name: "ICBM STRIKE", tag: "CH.10 · ORBITAL" },
    ],
  },
];
