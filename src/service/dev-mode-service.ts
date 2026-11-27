import {
  ARMORY_WEAPONS,
  ArmoryWeaponSpec,
  MAX_WEAPON_LEVEL,
  getArmoryWeaponById,
  getWeaponUpgradeCost,
} from "@/service/armory-catalog";
import { weaponService } from "@/service/weapon-service";

export const DEV_SPEED_OPTIONS = [1, 2, 5, 10] as const;
export type DevSpeedOption = (typeof DEV_SPEED_OPTIONS)[number];

export function isLocalDevEnvironment(): boolean {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    );
  }
  return process.env.NODE_ENV === "development";
}

export interface DevBalanceReportInput {
  won: boolean;
  activeChapter: number;
  reachedWave: number;
  maxWaves: number;
  kills: number;
  score: number;
  goldEarned: number;
  maxHp: number;
  weaponId: string;
  weaponLevel: number;
  simSeconds: number;
  bossSpawnedAtSimSec: number | null;
  bossKilledAtSimSec: number | null;
  simulatedDamageTaken: number;
  simulatedEnemyBreaches: number;
  simulatedProjectileHits: number;
  simulatedFirstFailWave: number | null;
  bossBreachedLine: boolean;
  bossRemainingHp: number;
  bossMaxHp: number;
}

export interface DevNextWeaponEstimate {
  weapon: ArmoryWeaponSpec;
  runsNeeded: number;
}

export interface DevBalanceReport {
  won: boolean;
  passRealCheck: boolean;
  verdictLabel: string;
  verdictReason: string;
  activeChapter: number;
  reachedWave: number;
  maxWaves: number;
  kills: number;
  score: number;
  goldEarned: number;
  maxHp: number;
  simulatedDamageTaken: number;
  simulatedRemainingHp: number;
  simulatedEnemyBreaches: number;
  simulatedProjectileHits: number;
  simulatedFirstFailWave: number | null;
  bossBreachedLine: boolean;
  bossRemainingHp: number;
  bossMaxHp: number;
  bossRemainingPct: number;
  bossKillSeconds: number | null;
  simSeconds: number;
  testedWeapon: ArmoryWeaponSpec;
  testedWeaponLevel: number;
  effectiveDps: number;
  upgradeCostNextLevel: number | null;
  upgradeRunsNeeded: number | null;
  nextWeapon: DevNextWeaponEstimate | null;
  nextChapterWeapon: DevNextWeaponEstimate | null;
}

export function buildDevBalanceReport(input: DevBalanceReportInput): DevBalanceReport {
  const testedWeapon = getArmoryWeaponById(input.weaponId);
  const clampedLevel = Math.max(1, Math.min(MAX_WEAPON_LEVEL, Math.floor(input.weaponLevel)));
  const combatSpec = weaponService.resolveCombatWeapon(testedWeapon.id, clampedLevel);
  const effectiveDps = Number(
    (combatSpec.damage * combatSpec.bulletCount * combatSpec.fireRate).toFixed(1)
  );

  const safeGoldPerRun = Math.max(1, input.goldEarned);
  const upgradeCostNextLevel =
    clampedLevel < MAX_WEAPON_LEVEL
      ? getWeaponUpgradeCost(testedWeapon, clampedLevel)
      : null;
  const upgradeRunsNeeded =
    upgradeCostNextLevel !== null
      ? Math.ceil(upgradeCostNextLevel / safeGoldPerRun)
      : null;

  const idx = ARMORY_WEAPONS.findIndex((w) => w.id === testedWeapon.id);
  const nextImmediate =
    idx >= 0 && idx + 1 < ARMORY_WEAPONS.length ? ARMORY_WEAPONS[idx + 1] : null;
  const nextChapterSpec =
    ARMORY_WEAPONS.find(
      (w) => w.slotNumber > testedWeapon.slotNumber && w.unlockChapter > input.activeChapter
    ) ?? null;

  const nextWeapon: DevNextWeaponEstimate | null = nextImmediate
    ? {
        weapon: nextImmediate,
        runsNeeded: Math.ceil(Math.max(0, nextImmediate.unlockCost) / safeGoldPerRun),
      }
    : null;

  const nextChapterWeapon: DevNextWeaponEstimate | null =
    nextChapterSpec && nextChapterSpec.id !== nextImmediate?.id
      ? {
          weapon: nextChapterSpec,
          runsNeeded: Math.ceil(Math.max(0, nextChapterSpec.unlockCost) / safeGoldPerRun),
        }
      : null;

  const simulatedRemainingHp = Math.max(0, input.maxHp - input.simulatedDamageTaken);
  const bossRemainingPct =
    input.bossMaxHp > 0
      ? Math.round((Math.max(0, input.bossRemainingHp) / input.bossMaxHp) * 100)
      : 0;
  const bossKillSeconds =
    input.bossSpawnedAtSimSec !== null && input.bossKilledAtSimSec !== null
      ? Number(Math.max(0, input.bossKilledAtSimSec - input.bossSpawnedAtSimSec).toFixed(1))
      : null;

  const passRealCheck = input.won && !input.bossBreachedLine;

  let verdictLabel: string;
  let verdictReason: string;

  if (input.bossBreachedLine) {
    verdictLabel = "KHÔNG QUA ĐƯỢC MÀN";
    verdictReason = `Boss chạm vạch phòng thủ ở Wave ${input.reachedWave}/${input.maxWaves} (còn ${Math.round(input.bossRemainingHp).toLocaleString()} / ${Math.round(input.bossMaxHp).toLocaleString()} HP — ${bossRemainingPct}%).`;
  } else if (!input.won) {
    verdictLabel = "KHÔNG QUA ĐƯỢC MÀN";
    verdictReason = `Hết ${input.maxHp}/${input.maxHp} HP tại Wave ${input.reachedWave}/${input.maxWaves} do quái tràn qua vạch phòng thủ (${input.simulatedEnemyBreaches} lượt quái lọt vạch; đã miễn nhiễm ${input.simulatedProjectileHits} đạn bắn từ xa).`;
  } else {
    verdictLabel = "QUA ĐƯỢC MÀN NÀY";
    verdictReason = `Đủ lực qua màn thực tế — còn dư ${simulatedRemainingHp}/${input.maxHp} HP${bossKillSeconds !== null ? `, hạ Boss trong ${bossKillSeconds}s` : ""} (${input.simulatedEnemyBreaches} quái lọt vạch, miễn nhiễm ${input.simulatedProjectileHits} đạn quái/boss bắn xa).`;
  }

  return {
    won: input.won,
    passRealCheck,
    verdictLabel,
    verdictReason,
    activeChapter: input.activeChapter,
    reachedWave: input.reachedWave,
    maxWaves: input.maxWaves,
    kills: input.kills,
    score: input.score,
    goldEarned: input.goldEarned,
    maxHp: input.maxHp,
    simulatedDamageTaken: input.simulatedDamageTaken,
    simulatedRemainingHp,
    simulatedEnemyBreaches: input.simulatedEnemyBreaches,
    simulatedProjectileHits: input.simulatedProjectileHits,
    simulatedFirstFailWave: input.simulatedFirstFailWave,
    bossBreachedLine: input.bossBreachedLine,
    bossRemainingHp: input.bossRemainingHp,
    bossMaxHp: input.bossMaxHp,
    bossRemainingPct,
    bossKillSeconds,
    simSeconds: Number(input.simSeconds.toFixed(1)),
    testedWeapon,
    testedWeaponLevel: clampedLevel,
    effectiveDps,
    upgradeCostNextLevel,
    upgradeRunsNeeded,
    nextWeapon,
    nextChapterWeapon,
  };
}

export function logDevBalanceReportToConsole(report: DevBalanceReport): void {
  if (typeof console === "undefined") return;
  console.group(
    `[DEV BALANCE] Ch.${report.activeChapter} | ${report.testedWeapon.name} Lv.${report.testedWeaponLevel} => ${report.verdictLabel}`
  );
  console.log("Kết luận:", report.verdictReason);
  console.table({
    Chapter: report.activeChapter,
    Weapon: `${report.testedWeapon.name} (Lv.${report.testedWeaponLevel})`,
    TheoreticalDPS: report.effectiveDps,
    Kills: report.kills,
    GoldEarned: report.goldEarned,
    SimDurationSec: report.simSeconds,
    BossKillSec: report.bossKillSeconds ?? "FAILED",
    SimulatedDmgTaken: `${report.simulatedDamageTaken}/${report.maxHp}`,
    BreachesAndHits: `${report.simulatedEnemyBreaches} creeps / ${report.simulatedProjectileHits} shots`,
    UpgradeRunsNeeded:
      report.upgradeRunsNeeded !== null
        ? `${report.upgradeRunsNeeded} ván (${report.upgradeCostNextLevel} Gold)`
        : "MAX LV",
    NextWeapon: report.nextWeapon
      ? `${report.nextWeapon.weapon.name} (${report.nextWeapon.weapon.unlockCost} Gold -> ${report.nextWeapon.runsNeeded} ván)`
      : "MAX WEAPON",
  });
  console.groupEnd();
}
