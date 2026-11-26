import type { RageSkillSpecDTO } from "@/dto/GameDTO";

// Cấu hình Rage Skill riêng biệt cho từng loại trong 20 vũ khí theo architect.md
export const RAGE_SKILL_CATALOG: Record<string, RageSkillSpecDTO> = {
  pistol: {
    id: "pistol",
    mode: "DURATION_BUFF",
    durationSeconds: 5,
    bulletSpeedMultiplier: 4,
    pierceCount: 999,
  },
  ak47: {
    id: "ak47",
    mode: "DURATION_BUFF",
    durationSeconds: 5,
    overrideRps: 10,
    damageMultiplier: 1.5,
  },
  shotgun: {
    id: "shotgun",
    mode: "INSTANT_AOE",
    durationSeconds: 0,
    aoeRadius: 9,
    knockbackSpeed: 18,
  },
  smg_neon: {
    id: "smg_neon",
    mode: "DURATION_BUFF",
    durationSeconds: 6,
    parallelStreams: 3,
  },
  cryo_gun: {
    id: "cryo_gun",
    mode: "DURATION_FIELD",
    durationSeconds: 6,
    slowRatio: 0.7,
  },
  minigun: {
    id: "minigun",
    mode: "DURATION_BUFF",
    durationSeconds: 5,
    fireRateMultiplier: 2,
    bulletScaleMultiplier: 2,
  },
  tesla_gun: {
    id: "tesla_gun",
    mode: "INSTANT_AOE",
    durationSeconds: 0,
    stunSeconds: 3,
  },
  scatter: {
    id: "scatter",
    mode: "DURATION_BUFF",
    durationSeconds: 4,
    spreadDeg: 170,
    pelletsPerShot: 9,
  },
  cannon: {
    id: "cannon",
    mode: "AIM_TARGET",
    durationSeconds: 0,
    strikeCount: 3,
    strikeKind: "cannon",
    aoeRadius: 6,
  },
  rocket_launcher: {
    id: "rocket_launcher",
    mode: "DURATION_SWARM",
    durationSeconds: 6,
    swarmTotalCount: 12,
  },
  grenade_launcher: {
    id: "grenade_launcher",
    mode: "INSTANT_AOE",
    durationSeconds: 0,
    mineCount: 20,
    aoeRadius: 3.2,
  },
  flamethrower: {
    id: "flamethrower",
    mode: "DURATION_BUFF",
    durationSeconds: 6,
    fireRateMultiplier: 2,
    parallelStreams: 5,
    bulletScaleMultiplier: 1.8,
  },
  acid_sprayer: {
    id: "acid_sprayer",
    mode: "DURATION_FIELD",
    durationSeconds: 5,
    acidMeltSeconds: 3,
  },
  plasma_rifle: {
    id: "plasma_rifle",
    mode: "INSTANT_AOE",
    durationSeconds: 0,
    aoeRadius: 8,
    knockbackSpeed: 22,
  },
  rail_gun: {
    id: "rail_gun",
    mode: "DURATION_BUFF",
    durationSeconds: 2,
    overrideRps: 2.5,
    pierceCount: 999,
    bulletSpeedMultiplier: 2,
  },
  laser_cannon: {
    id: "laser_cannon",
    mode: "DURATION_FIELD",
    durationSeconds: 8,
  },
  vortex_gun: {
    id: "vortex_gun",
    mode: "DURATION_FIELD",
    durationSeconds: 6,
  },
  photon_burst: {
    id: "photon_burst",
    mode: "INSTANT_AOE",
    durationSeconds: 0,
    aoeRadius: 15,
  },
  nuke_launcher: {
    id: "nuke_launcher",
    mode: "AIM_TARGET",
    durationSeconds: 0,
    strikeCount: 1,
    strikeKind: "nuke",
    aoeRadius: 12,
    falloutSeconds: 10,
  },
  icbm: {
    id: "icbm",
    mode: "AIM_TARGET",
    durationSeconds: 0,
    strikeCount: 3,
    strikeKind: "icbm",
    aoeRadius: 7.5,
  },
};

export function getRageSkillSpec(weaponId: string): RageSkillSpecDTO {
  return RAGE_SKILL_CATALOG[weaponId] ?? RAGE_SKILL_CATALOG.ak47;
}
