"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpCircle,
  Check,
  Coins,
  Cpu,
  Crosshair,
  Flame,
  Info,
  Lock,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  ARMORY_WEAPONS,
  ArmoryWeaponSpec,
  MAX_WEAPON_LEVEL,
  WeaponClass,
  getArmoryWeaponById,
  getWeaponImageUrl,
  getWeaponStatsAtLevel,
  getWeaponUpgradeCost,
} from "@/service/armory-catalog";
import { ArmoryTab, useGameStore } from "@/state-manager/game-store";
import { useAppStore } from "@/state-manager/app-store";
import {
  TranslationData,
  formatText,
  useTransClientSide,
} from "@/lang/useTransClientSide";

type WeaponFilter = "ALL" | "UNLOCKED" | WeaponClass;
type SortMode = "CHAPTER" | "DMG";

const CLASS_FILTERS: WeaponFilter[] = [
  "ALL",
  "UNLOCKED",
  "KINETIC",
  "RAPID",
  "HEAVY",
  "ENERGY",
  "STRATEGIC",
];

const CLASS_BADGE_MAP: Record<WeaponClass, string> = {
  KINETIC: "bg-[#272A32] text-[#E1E2EC] border-[#3B494B]",
  RAPID: "bg-[#00F0FF]/15 text-[#7DF4FF] border-[#00F0FF]/40",
  HEAVY: "bg-[#FE9800]/15 text-[#FFC080] border-[#FE9800]/45",
  ENERGY: "bg-[#A855F7]/15 text-[#D8B4FE] border-[#A855F7]/40",
  STRATEGIC: "bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/45",
};

function getClassLabel(
  weaponClass: WeaponClass,
  t: TranslationData["armory"]
): string {
  const map: Record<WeaponClass, string> = {
    KINETIC: t.classKINETIC,
    RAPID: t.classRAPID,
    HEAVY: t.classHEAVY,
    ENERGY: t.classENERGY,
    STRATEGIC: t.classSTRATEGIC,
  };
  return map[weaponClass];
}

function TelemetrySegmentBar({
  ratio,
  accentHex = "#00F0FF",
}: {
  ratio: number;
  accentHex?: string;
}) {
  const filledSegments = Math.min(10, Math.max(1, Math.round(ratio * 10)));
  return (
    <div className="grid grid-cols-10 gap-1 mt-1">
      {Array.from({ length: 10 }, (_, idx) => {
        const active = idx < filledSegments;
        return (
          <div
            key={idx}
            className="h-1.5 rounded-[2px] transition-all"
            style={{
              backgroundColor: active ? accentHex : "#272A32",
              boxShadow: active ? `0 0 8px ${accentHex}66` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function ComingSoonTab({
  tab,
  t,
  onOpenArsenal,
}: {
  tab: "UPGRADES" | "PETS";
  t: TranslationData["armory"];
  onOpenArsenal: () => void;
}) {
  const isUpgrades = tab === "UPGRADES";
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-xl bg-[#131722] border border-[#272A32] p-6 flex flex-col items-center text-center gap-3.5 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/35 flex items-center justify-center text-[#00F0FF]">
          {isUpgrades ? (
            <Wrench className="w-6 h-6" />
          ) : (
            <Cpu className="w-6 h-6" />
          )}
        </div>
        <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#E1E2EC] uppercase tracking-wide">
          {isUpgrades ? t.tabUpgrades : t.tabPets}
        </h2>
        <span className="px-3 py-1 rounded-full bg-[#FE9800]/15 border border-[#FE9800]/45 font-mono text-[11px] font-bold tracking-widest text-[#FE9800] uppercase">
          {t.comingSoonBadge}
        </span>
        <button
          type="button"
          onClick={onOpenArsenal}
          className="mt-1 px-4 py-2 rounded-lg bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#051018] font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
          <span>{t.returnToArsenal}</span>
        </button>
      </div>
    </div>
  );
}

function WeaponGridCard({
  weapon,
  level,
  isSelected,
  isEquipped,
  chapterMet,
  isOwned,
  t,
  onSelect,
}: {
  weapon: ArmoryWeaponSpec;
  level: number;
  isSelected: boolean;
  isEquipped: boolean;
  chapterMet: boolean;
  isOwned: boolean;
  t: TranslationData["armory"];
  onSelect: () => void;
}) {
  const stats = getWeaponStatsAtLevel(weapon, level);
  const rofText = weapon.fireRateLabel ?? `${stats.fireRate}/s`;
  const inLoadout = isEquipped;
  const isUsable = chapterMet && isOwned;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group text-left rounded-xl p-2.5 transition-all flex flex-col gap-2 border relative overflow-hidden cursor-pointer ${
        isSelected
          ? "bg-[#192334] border-[#00F0FF] shadow-[0_0_22px_rgba(0,240,255,0.28)]"
          : inLoadout
            ? "bg-[#142030] border-[#00F0FF]/75 shadow-[0_0_16px_rgba(0,240,255,0.16)] hover:border-[#7DF4FF]"
            : "bg-[#131722] border-[#272A32] hover:border-[#3B494B] hover:bg-[#171C28]"
      }`}
    >
      {inLoadout && (
        <span className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#00F0FF] via-[#7DF4FF] to-[#00F0FF]/40" />
      )}
      {/* Top row: serial & loadout/unlock badge */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-mono text-[10px] font-bold text-[#7DF4FF]">
            {weapon.serial}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
              level >= MAX_WEAPON_LEVEL
                ? "bg-[#FE9800]/20 text-[#FE9800]"
                : "bg-[#272A32] text-[#E1E2EC]"
            }`}
          >
            {level >= MAX_WEAPON_LEVEL
              ? t.maxBadge
              : formatText(t.levelBadge, { lv: level })}
          </span>
        </div>

        {inLoadout ? (
          <span className="px-1.5 py-0.5 rounded bg-[#00F0FF] text-[#051018] shadow-[0_0_10px_rgba(0,240,255,0.45)] font-mono text-[9px] font-bold flex items-center gap-0.5 shrink-0">
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
            <span>{t.inLoadoutBadge}</span>
          </span>
        ) : !chapterMet ? (
          <span className="px-1.5 py-0.5 rounded bg-[#272A32] text-[#849495] font-mono text-[9px] flex items-center gap-0.5 shrink-0">
            <Lock className="w-2.5 h-2.5" />
            <span>CH.{weapon.unlockChapter}</span>
          </span>
        ) : !isOwned ? (
          <span className="px-1.5 py-0.5 rounded bg-[#FE9800]/20 text-[#FE9800] border border-[#FE9800]/40 font-mono text-[9px] font-bold flex items-center gap-0.5 shrink-0">
            <Coins className="w-2.5 h-2.5" />
            <span>{weapon.unlockCost.toLocaleString()}G</span>
          </span>
        ) : (
          <span
            className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold shrink-0 ${
              CLASS_BADGE_MAP[weapon.weaponClass]
            }`}
          >
            {weapon.classLabel}
          </span>
        )}
      </div>

      {/* Artwork frame */}
      <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-[#0A0D14] border border-[#272A32]/80 flex items-center justify-center">
        <img
          src={getWeaponImageUrl(weapon, false)}
          alt={weapon.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            !isUsable ? "grayscale opacity-45" : ""
          }`}
        />
        {!chapterMet ? (
          <div className="absolute inset-0 bg-[#0A0D14]/45 flex items-center justify-center">
            <div className="px-2 py-1 rounded bg-[#0B0E14]/90 border border-[#3B494B] font-mono text-[9px] text-[#B9CACB] flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#FE9800]" />
              <span>
                {formatText(t.lockedChapter, { ch: weapon.unlockChapter })}
              </span>
            </div>
          </div>
        ) : !isOwned ? (
          <div className="absolute inset-0 bg-[#0A0D14]/35 flex items-center justify-center">
            <div className="px-2 py-1 rounded bg-[#0B0E14]/90 border border-[#FE9800]/55 font-mono text-[9px] font-bold text-[#FE9800] flex items-center gap-1">
              <Coins className="w-3 h-3" />
              <span>
                {formatText(t.buyCostShort, {
                  cost: weapon.unlockCost.toLocaleString(),
                })}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Name & Telemetry */}
      <div className="flex flex-col gap-1">
        <span className="font-['Space_Grotesk'] text-xs font-bold text-[#E1E2EC] uppercase truncate">
          {weapon.name}
        </span>
        <div className="flex items-center justify-between font-mono text-[10px] text-[#B9CACB]">
          <span>
            {t.rofShort}: <strong className="text-[#7DF4FF]">{rofText}</strong>
          </span>
          <span>
            {t.dmgShort}:{" "}
            <strong className="text-[#FE9800]">{stats.damage}</strong>
          </span>
        </div>
      </div>
    </button>
  );
}

export function ArmoryScreen() {
  const saveData = useGameStore((s) => s.saveData);
  const saveError = useGameStore((s) => s.saveError);
  const player = useGameStore((s) => s.player);
  const platformTarget = useGameStore((s) => s.platformTarget);
  const platformError = useGameStore((s) => s.platformError);
  const platformReady = useGameStore((s) => s.platformReady);
  const authLoading = useGameStore((s) => s.authLoading);
  const loginWithPlatform = useGameStore((s) => s.loginWithPlatform);
  const armoryTab = useGameStore((s) => s.armoryTab);
  const armorySaving = useGameStore((s) => s.armorySaving);
  const previousMenuScreen = useGameStore((s) => s.previousMenuScreen);
  const setArmoryTab = useGameStore((s) => s.setArmoryTab);
  const closeArmory = useGameStore((s) => s.closeArmory);
  const openLobby = useGameStore((s) => s.openLobby);
  const openWorldMap = useGameStore((s) => s.openWorldMap);
  const unlockArmoryWeapon = useGameStore((s) => s.unlockArmoryWeapon);
  const assignWeaponToLoadout = useGameStore((s) => s.assignWeaponToLoadout);
  const upgradeArmoryWeapon = useGameStore((s) => s.upgradeArmoryWeapon);

  const locale = useAppStore((s) => s.locale);
  const trans = useTransClientSide();
  const t = trans.armory;

  const [classFilter, setClassFilter] = useState<WeaponFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("CHAPTER");
  const [inspectedId, setInspectedId] = useState<string>(() =>
    getArmoryWeaponById(saveData.equippedLoadoutIds[0] ?? saveData.equippedWeaponId).id
  );
  const [inspectAngleDeg, setInspectAngleDeg] = useState<number>(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeArmory();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeArmory]);

  const equippedWeaponId = saveData.equippedLoadoutIds[0] ?? saveData.equippedWeaponId;
  const equippedWeapon = getArmoryWeaponById(equippedWeaponId);
  const equippedWeaponLevel = Math.max(
    1,
    saveData.weaponLevels[equippedWeapon.id] ?? 1
  );
  const ownedWeaponSet = useMemo(
    () => new Set(saveData.unlockedWeaponIds),
    [saveData.unlockedWeaponIds]
  );

  const inspectedWeapon = useMemo(
    () => getArmoryWeaponById(inspectedId),
    [inspectedId]
  );

  const unlockedCount = useMemo(
    () =>
      ARMORY_WEAPONS.filter(
        (w) =>
          saveData.unlockedChapter >= w.unlockChapter && ownedWeaponSet.has(w.id)
      ).length,
    [saveData.unlockedChapter, ownedWeaponSet]
  );

  const filteredWeapons = useMemo(() => {
    const base =
      classFilter === "ALL"
        ? ARMORY_WEAPONS
        : classFilter === "UNLOCKED"
          ? ARMORY_WEAPONS.filter(
              (w) =>
                saveData.unlockedChapter >= w.unlockChapter &&
                ownedWeaponSet.has(w.id)
            )
          : ARMORY_WEAPONS.filter((w) => w.weaponClass === classFilter);

    return [...base].sort((a, b) => {
      if (sortMode === "DMG") {
        const lvA = Math.max(1, saveData.weaponLevels[a.id] ?? 1);
        const lvB = Math.max(1, saveData.weaponLevels[b.id] ?? 1);
        const dmgDiff =
          getWeaponStatsAtLevel(b, lvB).damage -
          getWeaponStatsAtLevel(a, lvA).damage;
        if (dmgDiff !== 0) return dmgDiff;
      }
      return a.slotNumber - b.slotNumber;
    });
  }, [
    classFilter,
    sortMode,
    saveData.weaponLevels,
    saveData.unlockedChapter,
    ownedWeaponSet,
  ]);

  const inspectedLevel = Math.max(
    1,
    saveData.weaponLevels[inspectedWeapon.id] ?? 1
  );
  const inspectedChapterMet =
    saveData.unlockedChapter >= inspectedWeapon.unlockChapter;
  const inspectedOwned = ownedWeaponSet.has(inspectedWeapon.id);
  const inspectedUnlocked = inspectedChapterMet && inspectedOwned;
  const canAffordUnlock = saveData.gold >= inspectedWeapon.unlockCost;
  const isInspectedEquipped = equippedWeapon.id === inspectedWeapon.id;
  const inspectedIsMax = inspectedLevel >= MAX_WEAPON_LEVEL;
  const inspectedStats = getWeaponStatsAtLevel(inspectedWeapon, inspectedLevel);
  const upgradeCost = getWeaponUpgradeCost(inspectedWeapon, inspectedLevel);
  const hasEnoughGold = saveData.gold >= upgradeCost;
  const canPersist = platformReady && !saveError && !armorySaving;

  const rofRatio =
    inspectedWeapon.fireRate > 0
      ? Math.min(1, inspectedStats.fireRate / 18)
      : 0.9;
  const dmgRatio = Math.min(
    1,
    Math.log10(inspectedStats.damage + 1) / Math.log10(160)
  );

  const mainTabs: { id: ArmoryTab; code: string; label: string }[] = [
    { id: "UPGRADES", code: t.tabUpgradesCode, label: t.tabUpgrades },
    { id: "PETS", code: t.tabPetsCode, label: t.tabPets },
    {
      id: "ARSENAL",
      code: t.tabArsenalCode,
      label: formatText(t.tabArsenal, { count: ARMORY_WEAPONS.length }),
    },
  ];

  function handleSelectWeapon(id: string) {
    setInspectedId(id);
    setInspectAngleDeg(0);
  }

  function handleRotateStep() {
    setInspectAngleDeg((prev) => {
      if (prev === 0) return -16;
      if (prev < 0) return 16;
      return 0;
    });
  }

  function getFilterLabel(filter: WeaponFilter): string {
    if (filter === "ALL") {
      return formatText(t.filterAll, { count: ARMORY_WEAPONS.length });
    }
    if (filter === "UNLOCKED") {
      return t.filterUnlocked;
    }
    return getClassLabel(filter, t);
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-[#0A0D14] text-[#E1E2EC] relative overflow-y-auto lg:overflow-hidden lg:max-h-[calc(100vh-3.5rem)] select-none">
      {/* Subtle tactical backdrop */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,240,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,240,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ─── TOP PROTOCOL TELEMETRY & NAV BAR ─── */}
      <div className="relative z-20 bg-[#131722]/95 border-b border-[#272A32] px-3 md:px-5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={closeArmory}
            className="px-2.5 py-1.5 rounded-lg bg-[#272A32] hover:bg-[#32353D] border border-[#3B494B] font-mono text-[10px] font-bold text-[#00F0FF] uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {previousMenuScreen === "WORLD_MAP" ? t.worldMap : t.backLobby}
            </span>
          </button>

          {previousMenuScreen === "WORLD_MAP" ? (
            <button
              type="button"
              onClick={openLobby}
              className="hidden sm:flex px-2.5 py-1.5 rounded-lg bg-[#191B23] hover:bg-[#272A32] border border-[#272A32] font-mono text-[10px] text-[#B9CACB] uppercase items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{t.backLobby}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openWorldMap}
              className="hidden sm:flex px-2.5 py-1.5 rounded-lg bg-[#191B23] hover:bg-[#272A32] border border-[#272A32] font-mono text-[10px] text-[#B9CACB] uppercase items-center gap-1 transition-colors cursor-pointer"
            >
              <MapIcon className="w-3 h-3 text-[#00F0FF]" />
              <span>{t.worldMap}</span>
            </button>
          )}
        </div>

        <div className="hidden xl:flex items-center gap-2 font-mono text-[10px] tracking-widest text-[#7DF4FF] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
          <span>{t.protocolBanner}</span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#191B23] border border-[#00F0FF]/35 font-mono text-[10px] text-[#00F0FF] font-bold">
            <Crosshair className="w-3 h-3" />
            <span className="max-w-[180px] truncate uppercase">
              {equippedWeapon.name} · LV.{equippedWeaponLevel}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded bg-[#191B23] border border-[#272A32] font-mono text-[10px] text-[#7DF4FF] font-bold">
            {formatText(t.unlockedCount, {
              count: unlockedCount,
              total: ARMORY_WEAPONS.length,
            })}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FE9800]/15 border border-[#FE9800]/45 font-mono text-xs font-bold text-[#FE9800]">
            <Coins className="w-3.5 h-3.5" />
            <span>{saveData.gold.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Zero-fallback Fatal Error Alert / Guest Login Prompt */}
      {(platformError || (player && saveError)) && (
        <div className="relative z-20 mx-3 md:mx-5 mt-2 px-3 py-2 rounded-lg bg-[#93000A]/35 border border-[#FFB4AB]/45 font-mono text-[11px] text-[#FFB4AB] flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{platformError ?? saveError}</span>
        </div>
      )}
      {!player && !platformError && saveError && (
        <div className="relative z-20 mx-3 md:mx-5 mt-2 px-3 py-2 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/45 font-mono text-[11px] text-[#E1FBFF] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span>
            {formatText(trans.modals.guestLoginToSave, {
              platform: platformTarget === "web" ? "Google" : "CrazyGames",
            })}
          </span>
          <button
            type="button"
            disabled={authLoading}
            onClick={() => void loginWithPlatform()}
            className="px-2.5 py-1 rounded bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#051018] font-mono text-[10px] font-bold uppercase cursor-pointer disabled:opacity-50"
          >
            {authLoading
              ? trans.lobby.authenticating
              : platformTarget === "web"
                ? trans.lobby.loginGoogle
                : trans.lobby.loginCrazyGames}
          </button>
        </div>
      )}

      {/* ─── 3-TAB SUB-NAVIGATION ─── */}
      <div className="relative z-20 bg-[#0F131C]/90 border-b border-[#272A32] px-3 md:px-5 flex items-center justify-between gap-2 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1">
          {mainTabs.map((tab) => {
            const active = armoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setArmoryTab(tab.id)}
                className={`relative px-3.5 md:px-5 py-2.5 font-mono text-[11px] font-bold tracking-wider uppercase whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  active
                    ? "text-[#00F0FF] bg-[#00F0FF]/10"
                    : "text-[#849495] hover:text-[#E1E2EC] hover:bg-[#191B23]"
                }`}
              >
                <span className={active ? "text-[#FE9800]" : "text-[#586568]"}>
                  {tab.code} {"//"}
                </span>
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#00F0FF] shadow-[0_0_10px_#00F0FF]" />
                )}
              </button>
            );
          })}
        </div>

        <span className="hidden lg:inline font-mono text-[10px] text-[#849495] uppercase shrink-0">
          {t.escHint}
        </span>
      </div>

      {/* ─── MAIN CONTENT AREA ─── */}
      {armoryTab !== "ARSENAL" ? (
        <ComingSoonTab
          tab={armoryTab}
          t={t}
          onOpenArsenal={() => setArmoryTab("ARSENAL")}
        />
      ) : (
        <div className="relative z-10 flex-1 grid grid-cols-12 gap-3 p-3 md:p-4 min-h-0">
          {/* ══ LEFT COLUMN (2/3): SINGLE EQUIPPED WEAPON BAR + FILTER BAR + WEAPON GRID ══ */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-2.5 min-h-0">
            {/* Active Single-Weapon Combat Strip */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0F2133] via-[#131D2D] to-[#111622] border border-[#00F0FF]/70 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 shadow-[0_0_28px_rgba(0,240,255,0.16),inset_0_1px_0_rgba(125,244,255,0.22)]">
              <div className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#00F0FF] via-[#7DF4FF] to-[#FE9800]" />
              <div className="pointer-events-none -top-12 -left-10 absolute w-48 h-24 rounded-full bg-[#00F0FF]/15 blur-2xl" />

              <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/60 flex items-center justify-center text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.3)] shrink-0">
                  <Crosshair className="w-4 h-4" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[11px] font-bold text-[#7DF4FF] tracking-wider uppercase drop-shadow-[0_0_8px_rgba(0,240,255,0.35)]">
                    {t.activeLoadoutTitle}
                  </span>
                  <span className="font-mono text-[10px] text-[#9EB2B8] truncate">
                    {t.loadoutSummary}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectWeapon(equippedWeapon.id)}
                className={`relative z-10 group flex items-center gap-3 rounded-xl border pl-3 pr-3.5 py-2 text-left transition-all cursor-pointer shrink-0 ${
                  inspectedWeapon.id === equippedWeapon.id
                    ? "bg-gradient-to-r from-[#193048] via-[#152438] to-[#131C2B] border-[#7DF4FF] ring-1 ring-[#00F0FF]/60 shadow-[0_0_22px_rgba(0,240,255,0.28)]"
                    : "bg-gradient-to-r from-[#152334] to-[#121926] border-[#00F0FF]/60 hover:border-[#7DF4FF] shadow-[0_4px_16px_rgba(0,240,255,0.12)]"
                }`}
              >
                <div className="w-16 h-10 rounded-md overflow-hidden border border-[#00F0FF]/45 bg-[#080C14] shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.14)]">
                  <img
                    src={getWeaponImageUrl(equippedWeapon, false)}
                    alt={equippedWeapon.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col min-w-0 gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#00F0FF] text-[#051018] font-mono text-[9px] font-bold leading-none">
                      {t.slotBadge}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#FE9800]/15 border border-[#FE9800]/35 font-mono text-[9px] text-[#FE9800] font-bold leading-none">
                      LV.{equippedWeaponLevel}
                    </span>
                  </div>
                  <span className="font-['Space_Grotesk'] text-xs sm:text-sm font-bold text-white uppercase truncate max-w-[190px] leading-tight">
                    {equippedWeapon.name}
                  </span>
                  <span className="font-mono text-[9px] text-[#7DF4FF]/85 uppercase truncate leading-none">
                    {getClassLabel(equippedWeapon.weaponClass, t)} · {t.dmgShort}{" "}
                    {getWeaponStatsAtLevel(equippedWeapon, equippedWeaponLevel).damage}
                  </span>
                </div>
              </button>
            </div>

            {/* Armory Header + Category Filters + Sort Toggle */}
            <div className="bg-[#131722] border border-[#272A32] rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-[#00F0FF] tracking-widest uppercase">
                  {t.vaultBadge}
                </span>
                <h1 className="font-['Space_Grotesk'] text-base md:text-lg font-bold text-[#E1E2EC] uppercase leading-tight">
                  {t.vaultTitle}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Category filter buttons */}
                <div className="flex flex-wrap items-center gap-1 bg-[#0B0E14] p-1 rounded-lg border border-[#272A32]">
                  {CLASS_FILTERS.map((filter) => {
                    const active = classFilter === filter;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setClassFilter(filter)}
                        className={`px-2 py-1 rounded font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          active
                            ? "bg-[#00F0FF] text-[#051018]"
                            : "text-[#B9CACB] hover:text-[#E1E2EC] hover:bg-[#1D1F27]"
                        }`}
                      >
                        {getFilterLabel(filter)}
                      </button>
                    );
                  })}
                </div>

                {/* Sort toggle */}
                <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-lg border border-[#272A32]">
                  <span className="px-1.5 font-mono text-[9px] text-[#849495] uppercase">
                    {t.sortLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSortMode("CHAPTER")}
                    className={`px-2 py-1 rounded font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                      sortMode === "CHAPTER"
                        ? "bg-[#272A32] text-[#00F0FF]"
                        : "text-[#849495] hover:text-[#E1E2EC]"
                    }`}
                  >
                    {t.sortChapter}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode("DMG")}
                    className={`px-2 py-1 rounded font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                      sortMode === "DMG"
                        ? "bg-[#272A32] text-[#FE9800]"
                        : "text-[#849495] hover:text-[#E1E2EC]"
                    }`}
                  >
                    {t.sortDmg}
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable 20-Weapon Grid */}
            <div className="flex-1 min-h-0 lg:overflow-y-auto pr-0.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-2">
                {filteredWeapons.map((weapon) => (
                  <WeaponGridCard
                    key={weapon.id}
                    weapon={weapon}
                    level={Math.max(1, saveData.weaponLevels[weapon.id] ?? 1)}
                    isSelected={inspectedWeapon.id === weapon.id}
                    isEquipped={equippedWeapon.id === weapon.id}
                    chapterMet={saveData.unlockedChapter >= weapon.unlockChapter}
                    isOwned={ownedWeaponSet.has(weapon.id)}
                    t={t}
                    onSelect={() => handleSelectWeapon(weapon.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ══ RIGHT COLUMN (1/3): WEAPON INSPECTION VAULT ══ */}
          <div className="col-span-12 lg:col-span-4 bg-[#131722] border border-[#272A32] rounded-xl p-3.5 flex flex-col gap-3 min-h-0 lg:overflow-y-auto">
            {/* Inspector Header */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#272A32] shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-[9px] text-[#00F0FF] tracking-widest uppercase truncate">
                  {formatText(t.inspectionBadge, {
                    code: inspectedWeapon.code,
                    serial: inspectedWeapon.serial,
                  })}
                </span>
                <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#E1E2EC] uppercase truncate">
                  {inspectedWeapon.name}
                </h2>
                <span className="font-mono text-[10px] text-[#B9CACB]">
                  {getClassLabel(inspectedWeapon.weaponClass, t)} ·{" "}
                  {inspectedWeapon.classLabel}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase ${
                    CLASS_BADGE_MAP[inspectedWeapon.weaponClass]
                  }`}
                >
                  {formatText(t.levelProgress, {
                    lv: inspectedLevel,
                    max: MAX_WEAPON_LEVEL,
                  })}
                </span>
                <span className="font-mono text-[9px] text-[#849495]">
                  {formatText(t.slotLabel, {
                    slot: inspectedWeapon.slotNumber,
                  })}
                </span>
              </div>
            </div>

            {/* Interactive Artwork Stage */}
            <div className="relative rounded-xl bg-[#0A0D14] border border-[#272A32] overflow-hidden aspect-[16/10] flex items-center justify-center shrink-0">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${inspectedWeapon.tracerHex}22 0%, transparent 70%)`,
                }}
              />
              <img
                src={getWeaponImageUrl(inspectedWeapon, true)}
                alt={inspectedWeapon.name}
                className={`w-full h-full object-cover transition-transform duration-500 ${
                  !inspectedUnlocked ? "grayscale opacity-50" : ""
                }`}
                style={{
                  transform: `perspective(900px) rotateY(${inspectAngleDeg}deg) scale(${
                    inspectAngleDeg === 0 ? 1 : 1.04
                  })`,
                }}
              />

              {/* Top Controls inside stage */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={handleRotateStep}
                  className="px-2 py-1 rounded bg-[#131722]/90 hover:bg-[#272A32] border border-[#3B494B] font-mono text-[9px] font-bold text-[#00F0FF] uppercase flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>
                    {inspectAngleDeg === 0 ? t.inspect360 : t.resetView}
                  </span>
                </button>
              </div>

              {/* Bottom Caliber & Unlock strip */}
              <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2 z-10">
                <span className="px-2 py-0.5 rounded bg-[#131722]/90 border border-[#272A32] font-mono text-[9px] text-[#7DF4FF] uppercase truncate">
                  {inspectedWeapon.caliber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase shrink-0 ${
                    !inspectedChapterMet
                      ? "bg-[#93000A]/50 text-[#FFB4AB] border border-[#FFB4AB]/40"
                      : !inspectedOwned
                        ? "bg-[#FE9800]/20 text-[#FE9800] border border-[#FE9800]/45"
                        : "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40"
                  }`}
                >
                  {!inspectedChapterMet
                    ? formatText(t.lockedChapter, {
                        ch: inspectedWeapon.unlockChapter,
                      })
                    : !inspectedOwned
                      ? formatText(t.readyToBuyBadge, {
                          ch: inspectedWeapon.unlockChapter,
                          cost: inspectedWeapon.unlockCost.toLocaleString(),
                        })
                      : formatText(t.unlockedChapter, {
                          ch: inspectedWeapon.unlockChapter,
                        })}
                </span>
              </div>
            </div>

            {/* Statistics Telemetry Delta */}
            <div className="rounded-xl bg-[#0E121B] border border-[#272A32] p-3 flex flex-col gap-2.5 shrink-0">
              <div className="font-mono text-[10px] font-bold text-[#7DF4FF] tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>{t.telemetryTitle}</span>
              </div>

              {/* Fire Rate */}
              <div>
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#B9CACB] uppercase">
                    {t.fireRateLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-[#E1E2EC]">
                      {inspectedWeapon.fireRateLabel ??
                        `${inspectedStats.fireRate}/s`}
                    </strong>
                    {!inspectedIsMax && inspectedWeapon.fireRate > 0 && (
                      <span className="text-[#00F0FF] font-bold">
                        → {inspectedStats.nextFireRate}/s
                      </span>
                    )}
                  </div>
                </div>
                <TelemetrySegmentBar ratio={rofRatio} accentHex="#00F0FF" />
              </div>

              {/* Damage / Shot */}
              <div>
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#B9CACB] uppercase">
                    {t.damageLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-[#E1E2EC]">
                      {inspectedStats.damage}
                    </strong>
                    {!inspectedIsMax && (
                      <span className="text-[#FE9800] font-bold">
                        → {inspectedStats.nextDamage}
                      </span>
                    )}
                  </div>
                </div>
                <TelemetrySegmentBar ratio={dmgRatio} accentHex="#FE9800" />
              </div>

              {/* Projectile & Tracer Specs */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#272A32]/80">
                <div className="flex flex-col bg-[#131722] rounded-lg px-2.5 py-1.5 border border-[#272A32]">
                  <span className="font-mono text-[9px] text-[#849495] uppercase">
                    {t.projectileLabel}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#E1E2EC] uppercase truncate">
                    {inspectedWeapon.projectileLabel}
                  </span>
                </div>
                <div className="flex flex-col bg-[#131722] rounded-lg px-2.5 py-1.5 border border-[#272A32]">
                  <span className="font-mono text-[9px] text-[#849495] uppercase">
                    {t.tracerLabel}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: inspectedWeapon.tracerHex }}
                    />
                    <span className="font-mono text-[10px] font-bold text-[#E1E2EC] uppercase truncate">
                      {inspectedWeapon.tracerLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rage Skill Card */}
            <div className="rounded-xl bg-[#1A1614] border border-[#FE9800]/35 p-3 flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-bold text-[#FE9800] tracking-wider uppercase flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{t.rageSkillLabel}</span>
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] font-bold text-[#FFC080] uppercase">
                  {inspectedWeapon.rageSkillName}
                </span>
              </div>
              <p className="text-[11px] text-[#E1E2EC]/90 leading-relaxed">
                {locale === "vi"
                  ? inspectedWeapon.rageSkillDescVi
                  : inspectedWeapon.rageSkillDescEn}
              </p>
            </div>

            {/* Action Dock: 3-Slot Assignment + Upgrade */}
            <div className="flex flex-col gap-2 mt-auto pt-1 shrink-0">
              {!inspectedChapterMet ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-lg bg-[#272A32] border border-[#3B494B] font-mono text-xs font-bold text-[#849495] uppercase flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {formatText(t.unlockHintBtn, {
                        prev: Math.max(1, inspectedWeapon.unlockChapter - 1),
                      })}
                    </span>
                  </button>
                  <div className="px-3 py-1.5 rounded-lg bg-[#0E121B] border border-[#272A32] font-mono text-[10px] text-[#FE9800] text-center">
                    {formatText(t.unlockCostPreview, {
                      ch: inspectedWeapon.unlockChapter,
                      cost: inspectedWeapon.unlockCost.toLocaleString(),
                    })}
                  </div>
                </div>
              ) : !inspectedOwned ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    disabled={!canAffordUnlock || !canPersist}
                    onClick={() => void unlockArmoryWeapon(inspectedWeapon.id)}
                    className={`w-full py-3 rounded-lg font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${
                      canAffordUnlock && canPersist
                        ? "bg-[#FE9800] hover:bg-[#FFB03B] text-[#140B00] cursor-pointer shadow-[0_0_18px_rgba(254,152,0,0.3)]"
                        : "bg-[#272A32] text-[#FFB4AB] border border-[#93000A]/60 cursor-not-allowed opacity-85"
                    }`}
                  >
                    {canAffordUnlock ? (
                      <Coins className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>
                      {armorySaving
                        ? t.savingBtn
                        : canAffordUnlock
                          ? formatText(t.unlockWeaponBtn, {
                              cost: inspectedWeapon.unlockCost.toLocaleString(),
                            })
                          : formatText(t.needGoldUnlockBtn, {
                              cost: inspectedWeapon.unlockCost.toLocaleString(),
                            })}
                    </span>
                  </button>
                  <div className="px-3 py-1.5 rounded-lg bg-[#0E121B] border border-[#272A32] font-mono text-[10px] text-[#7DF4FF] text-center">
                    {formatText(t.prereqMetNote, {
                      ch: inspectedWeapon.unlockChapter,
                      cost: inspectedWeapon.unlockCost.toLocaleString(),
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#0E121B] border border-[#272A32] p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#7DF4FF] uppercase">
                    <span>{t.assignSlotTitle}</span>
                  </div>

                  {isInspectedEquipped ? (
                    <div className="w-full py-2.5 px-3 rounded-lg bg-[#00F0FF]/18 border border-[#00F0FF]/65 text-[#00F0FF] font-mono text-xs font-bold uppercase flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                      <span>{t.inSlotActiveBtn}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canPersist}
                      onClick={() =>
                        void assignWeaponToLoadout(inspectedWeapon.id)
                      }
                      className="w-full py-2.5 px-3 rounded-lg bg-[#00F0FF] hover:bg-[#7DF4FF] text-[#051018] font-mono text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_16px_rgba(0,240,255,0.28)] disabled:opacity-50"
                    >
                      <Crosshair className="w-4 h-4" />
                      <span>
                        {armorySaving ? t.savingBtn : t.addToLoadoutBtn}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Upgrade Button */}
              {inspectedUnlocked && (
                <button
                  type="button"
                  disabled={inspectedIsMax || !hasEnoughGold || !canPersist}
                  onClick={() => void upgradeArmoryWeapon(inspectedWeapon.id)}
                  className={`w-full py-2.5 rounded-lg font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${
                    inspectedIsMax
                      ? "bg-[#272A32] text-[#849495] border border-[#3B494B] cursor-not-allowed"
                      : hasEnoughGold && canPersist
                        ? "bg-[#FE9800] hover:bg-[#FFB03B] text-[#140B00] cursor-pointer shadow-[0_0_16px_rgba(254,152,0,0.28)]"
                        : "bg-[#272A32] text-[#FFB4AB] border border-[#93000A]/60 cursor-not-allowed opacity-85"
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>
                    {armorySaving
                      ? t.savingBtn
                      : inspectedIsMax
                        ? t.maxLevelBtn
                        : hasEnoughGold
                          ? formatText(t.upgradeBtn, {
                              next: inspectedLevel + 1,
                              cost: upgradeCost.toLocaleString(),
                            })
                          : formatText(t.insufficientGoldBtn, {
                              cost: upgradeCost.toLocaleString(),
                            })}
                  </span>
                </button>
              )}
            </div>

            {/* Combat Switching & Right Lane Policy Note */}
            <div className="rounded-lg bg-[#0B0E14] border border-[#272A32] px-3 py-2 flex items-start gap-2 shrink-0">
              <Info className="w-3.5 h-3.5 text-[#00F0FF] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] font-bold text-[#7DF4FF] uppercase">
                  {t.combatNoteTitle}
                </span>
                <span className="text-[10px] text-[#849495] leading-snug">
                  {t.combatNoteDesc}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
