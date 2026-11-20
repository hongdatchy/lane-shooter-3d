"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/state-manager/game-store";
import { weaponService } from "@/service/weapon-service";
import { ARENA_CONFIG } from "@/service/game-constants";
import { GameRuntimeRef } from "@/dto/GameDTO";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";
import { WeaponModel3D } from "./WeaponModel3D";

interface WeaponCrateProps {
  runtimeRef: React.MutableRefObject<GameRuntimeRef>;
}

export function WeaponCrate({ runtimeRef }: WeaponCrateProps) {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const crateHits = useGameStore((s) => s.crateHits);
  const crateTargetHits = useGameStore((s) => s.crateTargetHits);
  const weaponIndex = useGameStore((s) => s.weaponIndex);
  const wave = useGameStore((s) => s.wave);
  const maxWaves = useGameStore((s) => s.maxWaves);
  const trans = useTransClientSide();

  const gunPivotRef = useRef<THREE.Group>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  const nextWeapon = weaponService.getNextWeapon(weaponIndex, wave);
  const isAtMaxWeapon = weaponService.isMaxWeapon(weaponIndex);
  const lockedNext = weaponService.getLockedNextWeapon(weaponIndex, wave);
  // Các item mở ở màn cuối (Màn 6) sẽ ẩn hoàn toàn ở các màn trước đó
  const visibleLockedNext = lockedNext && lockedNext.minStage < maxWaves ? lockedNext : null;

  const rewardColor = nextWeapon
    ? nextWeapon.bulletColor
    : visibleLockedNext
      ? "#64748b"
      : "#10b981";

  const progress = nextWeapon
    ? Math.min(1, crateHits / Math.max(1, crateTargetHits))
    : 0;

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    if (runtimeRef.current.cratePulse > 0) {
      runtimeRef.current.cratePulse = Math.max(0, runtimeRef.current.cratePulse - delta * 6);
    }

    const pulse = runtimeRef.current.cratePulse;

    if (gunPivotRef.current) {
      const baseScale = 2.2;
      const scale = baseScale * (1 + pulse * 0.18);
      gunPivotRef.current.scale.setScalar(scale);
      gunPivotRef.current.position.y = 1.68 + Math.sin(t * 2.5) * 0.15;
      // Súng 3D quay tròn liên tục trên bệ đỡ
      gunPivotRef.current.rotation.y = t * 1.55;
      gunPivotRef.current.rotation.z = Math.sin(t * 1.4) * 0.08 + 0.14;
    }

    if (auraRingRef.current) {
      auraRingRef.current.rotation.z = -t * 1.2;
      auraRingRef.current.scale.setScalar(1 + progress * 0.18 + pulse * 0.15);
    }
  });

  const barWidth = 2.8;
  const fillWidth = Math.max(0.01, barWidth * progress);

  return (
    <group position={[ARENA_CONFIG.crateX, 0, ARENA_CONFIG.crateZ]}>
      {/* Bệ đỡ công nghệ cố định trên làn phải */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.6, 1.85, 0.24, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vòng sáng định vị */}
      <mesh ref={auraRingRef} position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.38, 1.66, 32]} />
        <meshBasicMaterial color={rewardColor} transparent opacity={0.85} />
      </mesh>

      {/* Luồng sáng hologram khi có súng tiếp theo để mở khóa */}
      {nextWeapon && (
        <mesh position={[0, 1.45, 0]}>
          <cylinderGeometry args={[1.38, 1.56, 2.5, 24, 1, true]} />
          <meshBasicMaterial
            color={rewardColor}
            transparent
            opacity={0.09 + progress * 0.09}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Chỉ hiện hình súng 3D quay tròn cỡ lớn khi còn súng mở khóa ở màn hiện tại */}
      {nextWeapon && (
        <group ref={gunPivotRef} position={[0, 1.68, 0]}>
          <WeaponModel3D weapon={nextWeapon} spinBarrels />
        </group>
      )}

      {/* Thanh tiến độ 3D chỉ hiện khi còn súng mở khóa */}
      {nextWeapon && (
        <group position={[0, 3.35, 0]}>
          <mesh>
            <boxGeometry args={[barWidth + 0.1, 0.28, 0.08]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh position={[-(barWidth - fillWidth) / 2, 0, 0.05]}>
            <boxGeometry args={[fillWidth, 0.18, 0.04]} />
            <meshBasicMaterial color={rewardColor} />
          </mesh>
        </group>
      )}

      {/* Nhãn thông tin tên súng & tiến độ phóng to phía trên bệ (chỉ hiện khi đang chơi, luôn nằm dưới HUD) */}
      {gameStatus === "PLAYING" && (
        <Html
          center
          position={[0, nextWeapon ? 4.25 : 2.1, 0]}
          distanceFactor={24}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="select-none whitespace-nowrap rounded-xl border-2 border-slate-600/90 bg-slate-950/95 px-4 py-2 text-center shadow-2xl backdrop-blur">
            {nextWeapon ? (
              <>
                <div className="text-base sm:text-lg font-black uppercase tracking-wide text-sky-300 leading-tight">
                  {trans.weapons[nextWeapon.id]}
                </div>
                <div className="mt-0.5 text-sm sm:text-base font-black text-amber-300">
                  {formatText(trans.hud.shotsProgress, {
                    hits: crateHits,
                    target: crateTargetHits,
                  })}
                </div>
              </>
            ) : visibleLockedNext ? (
              <>
                <div className="text-sm sm:text-base font-black uppercase tracking-wide text-amber-300 leading-tight">
                  {trans.weapons[visibleLockedNext.weapon.id]}
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-300">
                  {formatText(trans.hud.unlockAtStage, {
                    stage: visibleLockedNext.minStage,
                  })}
                </div>
              </>
            ) : isAtMaxWeapon ? (
              <>
                <div className="text-sm sm:text-base font-black uppercase tracking-wide text-emerald-300 leading-tight">
                  {trans.crate.maxTitle}
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-300">
                  {trans.crate.readyIcbm}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm sm:text-base font-black uppercase tracking-wide text-emerald-300 leading-tight">
                  {trans.crate.maxTitle}
                </div>
                <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-300">
                  {trans.crate.readyCombat}
                </div>
              </>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
