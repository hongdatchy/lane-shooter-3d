"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/state-manager/game-store";
import { ARENA_CONFIG } from "@/service/game-constants";
import { GameRuntimeRef } from "@/dto/GameDTO";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";

interface WeaponCrateProps {
  runtimeRef: React.MutableRefObject<GameRuntimeRef>;
}

export function WeaponCrate({ runtimeRef }: WeaponCrateProps) {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const crateHits = useGameStore((s) => s.crateHits);
  const crateTargetHits = useGameStore((s) => s.crateTargetHits);
  const overdriveLevel = useGameStore((s) => s.overdriveLevel);
  const trans = useTransClientSide();

  const corePivotRef = useRef<THREE.Group>(null);
  const haloRingRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);

  const rewardColor = overdriveLevel >= 3 ? "#f59e0b" : "#00f0ff";
  const progress = Math.min(1, crateHits / Math.max(1, crateTargetHits));

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    if (runtimeRef.current.cratePulse > 0) {
      runtimeRef.current.cratePulse = Math.max(0, runtimeRef.current.cratePulse - delta * 6);
    }

    const pulse = runtimeRef.current.cratePulse;

    if (corePivotRef.current) {
      const scale = 1 + pulse * 0.22;
      corePivotRef.current.scale.setScalar(scale);
      corePivotRef.current.position.y = 1.65 + Math.sin(t * 2.8) * 0.16;
      corePivotRef.current.rotation.y = t * 1.8;
      corePivotRef.current.rotation.x = Math.sin(t * 1.2) * 0.22;
    }

    if (haloRingRef.current) {
      haloRingRef.current.rotation.z = t * 1.6;
      haloRingRef.current.rotation.x = Math.PI / 3 + Math.sin(t * 0.9) * 0.2;
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
      {/* Bệ Buff Overdrive cố định trên làn phải (không liên quan tới đổi súng) */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.6, 1.85, 0.24, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.28} />
      </mesh>

      {/* Vòng sáng định vị */}
      <mesh ref={auraRingRef} position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.38, 1.66, 32]} />
        <meshBasicMaterial color={rewardColor} transparent opacity={0.85} />
      </mesh>

      {/* Cột hologram năng lượng */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[1.32, 1.5, 2.45, 24, 1, true]} />
        <meshBasicMaterial
          color={rewardColor}
          transparent
          opacity={0.1 + progress * 0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Lõi tinh thể Overdrive Buff xoay tròn */}
      <group ref={corePivotRef} position={[0, 1.65, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.72, 0]} />
          <meshStandardMaterial
            color={rewardColor}
            emissive={rewardColor}
            emissiveIntensity={1.25}
            metalness={0.45}
            roughness={0.18}
          />
        </mesh>
        <mesh ref={haloRingRef}>
          <torusGeometry args={[1.02, 0.06, 10, 28]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={1.4}
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* Thanh tiến độ 3D */}
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

      {/* Nhãn Buff Overdrive */}
      {gameStatus === "PLAYING" && (
        <Html
          center
          position={[0, 4.25, 0]}
          distanceFactor={24}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="select-none whitespace-nowrap rounded-xl border-2 border-slate-600/90 bg-slate-950/95 px-4 py-2 text-center shadow-2xl backdrop-blur">
            <div className="text-base sm:text-lg font-black uppercase tracking-wide text-cyan-300 leading-tight">
              {formatText(trans.crate.overdriveTitle, { lv: overdriveLevel + 1 })}
            </div>
            <div className="text-[11px] font-bold text-emerald-300">
              {trans.crate.overdriveBonus}
            </div>
            <div className="mt-0.5 text-sm sm:text-base font-black text-amber-300">
              {formatText(trans.hud.shotsProgress, {
                hits: crateHits,
                target: crateTargetHits,
              })}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
