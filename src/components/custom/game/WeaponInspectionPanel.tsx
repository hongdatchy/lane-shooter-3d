"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import {
  ArmoryWeaponSpec,
  MAX_WEAPON_LEVEL,
  WeaponClass,
  getWeaponImageUrl,
  getWeaponStatsAtLevel,
} from "@/service/armory-catalog";
import { TranslationData, formatText, getWeaponDisplayName } from "@/lang/useTransClientSide";

export const CLASS_BADGE_MAP: Record<WeaponClass, string> = {
  KINETIC: "bg-[#272A32] text-[#E1E2EC] border-[#3B494B]",
  RAPID: "bg-[#00F0FF]/15 text-[#7DF4FF] border-[#00F0FF]/40",
  HEAVY: "bg-[#FE9800]/15 text-[#FFC080] border-[#FE9800]/45",
  ENERGY: "bg-[#A855F7]/15 text-[#D8B4FE] border-[#A855F7]/40",
  STRATEGIC: "bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/45",
};

export function getClassLabel(
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

export function TelemetrySegmentBar({
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

export function computeWeaponTelemetry(weapon: ArmoryWeaponSpec, level: number) {
  const clampedLevel = Math.max(1, Math.min(MAX_WEAPON_LEVEL, level));
  const isMax = clampedLevel >= MAX_WEAPON_LEVEL;
  const stats = getWeaponStatsAtLevel(weapon, clampedLevel);
  const rofRatio = weapon.fireRate > 0 ? Math.min(1, stats.fireRate / 18) : 0.9;
  const dmgRatio = Math.min(1, Math.log10(stats.damage + 1) / Math.log10(160));
  return { clampedLevel, isMax, stats, rofRatio, dmgRatio };
}

export function getWeaponUnlockBadge(
  weapon: ArmoryWeaponSpec,
  chapterMet: boolean,
  isOwned: boolean,
  t: TranslationData["armory"]
): { label: string; className: string } {
  if (!chapterMet) {
    return {
      label: formatText(t.lockedChapter, { ch: weapon.unlockChapter }),
      className: "bg-[#93000A]/50 text-[#FFB4AB] border border-[#FFB4AB]/40",
    };
  }
  if (!isOwned) {
    return {
      label: formatText(t.readyToBuyBadge, {
        ch: weapon.unlockChapter,
        cost: weapon.unlockCost.toLocaleString(),
      }),
      className: "bg-[#FE9800]/20 text-[#FE9800] border border-[#FE9800]/45",
    };
  }
  return {
    label: formatText(t.unlockedChapter, { ch: weapon.unlockChapter }),
    className: "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40",
  };
}

interface WeaponInspectionPanelProps {
  weapon: ArmoryWeaponSpec;
  level: number;
  chapterMet: boolean;
  isOwned: boolean;
  t: TranslationData["armory"];
}

export function WeaponInspectionPanel({
  weapon,
  level,
  chapterMet,
  isOwned,
  t,
}: WeaponInspectionPanelProps) {
  const [inspectAngleDeg, setInspectAngleDeg] = useState<number>(0);

  useEffect(() => {
    setInspectAngleDeg(0);
  }, [weapon.id]);

  const isUnlocked = chapterMet && isOwned;
  const { clampedLevel, isMax, stats, rofRatio, dmgRatio } = computeWeaponTelemetry(
    weapon,
    level
  );
  const unlockBadge = getWeaponUnlockBadge(weapon, chapterMet, isOwned, t);

  function handleRotateStep() {
    setInspectAngleDeg((prev) => {
      if (prev === 0) return -16;
      if (prev < 0) return 16;
      return 0;
    });
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-1 lg:min-h-0">
      {/* Inspector Header */}
      <div className="flex items-start justify-between gap-2 pb-1 border-b border-[#272A32] shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-[9px] text-[#00F0FF] tracking-widest uppercase truncate">
            {formatText(t.inspectionBadge, {
              code: weapon.code,
              serial: weapon.serial,
            })}
          </span>
          <h2 className="font-['Space_Grotesk'] text-base xl:text-lg font-bold text-[#E1E2EC] uppercase truncate leading-tight">
            {getWeaponDisplayName(weapon.id, weapon.name, t)}
          </h2>
          <span className="font-mono text-[10px] text-[#B9CACB]">
            {getClassLabel(weapon.weaponClass, t)} · {weapon.classLabel}
          </span>
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase ${
              CLASS_BADGE_MAP[weapon.weaponClass]
            }`}
          >
            {formatText(t.levelProgress, {
              lv: clampedLevel,
              max: MAX_WEAPON_LEVEL,
            })}
          </span>
          <span className="font-mono text-[9px] text-[#849495]">
            {formatText(t.slotLabel, {
              slot: weapon.slotNumber,
            })}
          </span>
        </div>
      </div>

      {/* Interactive Artwork Stage */}
      <div className="relative rounded-xl bg-[#0A0D14] border border-[#272A32] overflow-hidden h-[130px] lg:h-auto lg:flex-1 lg:min-h-[115px] flex items-center justify-center">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${weapon.tracerHex}22 0%, transparent 70%)`,
          }}
        />
        <img
          src={getWeaponImageUrl(weapon, true)}
          alt={weapon.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            !isUnlocked ? "grayscale opacity-50" : ""
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
            <span>{inspectAngleDeg === 0 ? t.inspect360 : t.resetView}</span>
          </button>
        </div>

        {/* Bottom Caliber & Unlock strip */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2 z-10">
          <span className="px-2 py-0.5 rounded bg-[#131722]/90 border border-[#272A32] font-mono text-[9px] text-[#7DF4FF] uppercase truncate">
            {weapon.caliber}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase shrink-0 ${unlockBadge.className}`}
          >
            {unlockBadge.label}
          </span>
        </div>
      </div>

      {/* Statistics Telemetry Delta */}
      <div className="rounded-xl bg-[#0E121B] border border-[#272A32] p-2.5 flex flex-col gap-1.5 shrink-0">
        <div className="font-mono text-[10px] font-bold text-[#7DF4FF] tracking-wider uppercase flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#00F0FF]" />
          <span>{t.telemetryTitle}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Fire Rate */}
          <div>
            <div className="flex items-center justify-between font-mono text-[9px] gap-1">
              <span className="text-[#B9CACB] uppercase truncate">{t.fireRateLabel}</span>
              <div className="flex items-center gap-1 shrink-0">
                <strong className="text-[#E1E2EC]">
                  {weapon.fireRateLabel ?? `${stats.fireRate}/s`}
                </strong>
                {!isMax && weapon.fireRate > 0 && (
                  <span className="text-[#00F0FF] font-bold">
                    →{stats.nextFireRate}
                  </span>
                )}
              </div>
            </div>
            <TelemetrySegmentBar ratio={rofRatio} accentHex="#00F0FF" />
          </div>

          {/* Damage / Shot */}
          <div>
            <div className="flex items-center justify-between font-mono text-[9px] gap-1">
              <span className="text-[#B9CACB] uppercase truncate">{t.damageLabel}</span>
              <div className="flex items-center gap-1 shrink-0">
                <strong className="text-[#E1E2EC]">{stats.damage}</strong>
                {!isMax && (
                  <span className="text-[#FE9800] font-bold">
                    →{stats.nextDamage}
                  </span>
                )}
              </div>
            </div>
            <TelemetrySegmentBar ratio={dmgRatio} accentHex="#FE9800" />
          </div>
        </div>

        {/* Projectile & Tracer Specs */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#272A32]/80">
          <div className="flex flex-col bg-[#131722] rounded-lg px-2 py-1 border border-[#272A32]">
            <span className="font-mono text-[8px] text-[#849495] uppercase">
              {t.projectileLabel}
            </span>
            <span className="font-mono text-[10px] font-bold text-[#E1E2EC] uppercase truncate">
              {weapon.projectileLabel}
            </span>
          </div>
          <div className="flex flex-col bg-[#131722] rounded-lg px-2 py-1 border border-[#272A32]">
            <span className="font-mono text-[8px] text-[#849495] uppercase">
              {t.tracerLabel}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: weapon.tracerHex }}
              />
              <span className="font-mono text-[10px] font-bold text-[#E1E2EC] uppercase truncate">
                {weapon.tracerLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
