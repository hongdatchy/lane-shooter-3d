"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BuffGateSpecDTO, RightLaneGateEntityDTO } from "@/dto/GameDTO";
import { getBuffGateSpec } from "@/service/buff-catalog";
import { useGameStore } from "@/state-manager/game-store";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";
import { WorldHtml } from "./WorldHtml";

function resolveScopeLabel(
  spec: BuffGateSpecDTO,
  buffsTrans: ReturnType<typeof useTransClientSide>["buffs"]
): string {
  switch (spec.scope) {
    case "RUN":
      return buffsTrans.scopeRun;
    case "WAVE":
      return buffsTrans.scopeWave;
    case "CHARGES":
      return buffsTrans.scopeCharges;
    case "INSTANT":
      return buffsTrans.scopeInstant;
    case "TIMED":
      return formatText(buffsTrans.scopeTimed, { sec: spec.durationSeconds ?? 5 });
  }
}

function BuffGateUnit({ gate }: { gate: RightLaneGateEntityDTO }) {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const trans = useTransClientSide();
  const spec = getBuffGateSpec(gate.buffId);

  const corePivotRef = useRef<THREE.Group>(null);
  const haloRingRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);
  const gatePulseRef = useRef(0);
  const prevHitsRef = useRef(gate.hits);

  useEffect(() => {
    if (gate.hits > prevHitsRef.current) {
      gatePulseRef.current = 1;
    }
    prevHitsRef.current = gate.hits;
  }, [gate.hits]);

  const progress = Math.min(1, gate.hits / Math.max(1, gate.targetHits));
  const barWidth = 2.05;
  const fillWidth = Math.max(0.01, barWidth * progress);
  const scopeLabel = resolveScopeLabel(spec, trans.buffs);
  const itemDesc = trans.buffs.items[spec.id];

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime + gate.slotIndex * 1.4;

    if (gatePulseRef.current > 0) {
      gatePulseRef.current = Math.max(0, gatePulseRef.current - delta * 6);
    }
    const pulse = gatePulseRef.current;

    if (corePivotRef.current) {
      const scale = 1 + pulse * 0.24;
      corePivotRef.current.scale.setScalar(scale);
      corePivotRef.current.position.y = 1.45 + Math.sin(t * 2.8) * 0.14;
      corePivotRef.current.rotation.y = t * 1.9;
      corePivotRef.current.rotation.x = Math.sin(t * 1.3) * 0.22;
    }

    if (haloRingRef.current) {
      haloRingRef.current.rotation.z = t * 1.7;
      haloRingRef.current.rotation.x = Math.PI / 3 + Math.sin(t * 0.9) * 0.2;
    }

    if (auraRingRef.current) {
      auraRingRef.current.rotation.z = -t * 1.2;
      auraRingRef.current.scale.setScalar(1 + progress * 0.16 + pulse * 0.14);
    }
  });

  if (gate.claimed) {
    return null;
  }

  return (
    <group position={[gate.x, 0, gate.z]}>
      {/* Bệ Cổng Buff */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.1, 0.2, 1.55]} />
        <meshStandardMaterial color="#1e293b" metalness={0.72} roughness={0.28} />
      </mesh>

      {/* Hai trụ cổng phát sáng hai bên */}
      <mesh position={[-0.95, 1.35, 0]} castShadow>
        <boxGeometry args={[0.16, 2.5, 0.22]} />
        <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0.95, 1.35, 0]} castShadow>
        <boxGeometry args={[0.16, 2.5, 0.22]} />
        <meshStandardMaterial color="#334155" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.56, 0]} castShadow>
        <boxGeometry args={[2.06, 0.18, 0.26]} />
        <meshStandardMaterial
          color={spec.color}
          emissive={spec.color}
          emissiveIntensity={0.8}
          metalness={0.5}
        />
      </mesh>

      {/* Màn năng lượng bên trong cổng */}
      <mesh position={[0, 1.32, 0]}>
        <planeGeometry args={[1.74, 2.28]} />
        <meshBasicMaterial
          color={spec.color}
          transparent
          opacity={0.14 + progress * 0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Vòng sáng chân cổng */}
      <mesh ref={auraRingRef} position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.98, 28]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.85} />
      </mesh>

      {/* Tinh thể lõi xoay giữa cổng */}
      <group ref={corePivotRef} position={[0, 1.45, 0]}>
        <mesh castShadow>
          <octahedronGeometry args={[0.48, 0]} />
          <meshStandardMaterial
            color={spec.color}
            emissive={spec.color}
            emissiveIntensity={1.25}
            metalness={0.45}
            roughness={0.18}
          />
        </mesh>
        <mesh ref={haloRingRef}>
          <torusGeometry args={[0.72, 0.045, 10, 24]} />
          <meshStandardMaterial
            color={spec.color}
            emissive={spec.color}
            emissiveIntensity={1.1}
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* Thanh tiến độ 3D trên đỉnh cổng */}
      <group position={[0, 2.95, 0]}>
        <mesh>
          <boxGeometry args={[barWidth + 0.08, 0.22, 0.08]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[-(barWidth - fillWidth) / 2, 0, 0.05]}>
          <boxGeometry args={[fillWidth, 0.14, 0.04]} />
          <meshBasicMaterial color={spec.color} />
        </mesh>
      </group>

      {/* Nhãn thông tin Cổng Buff */}
      {gameStatus === "PLAYING" && (
        <WorldHtml
          center
          position={[0, 3.85, 0]}
          distanceFactor={20}
          zIndexRange={[1, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="select-none whitespace-nowrap rounded-xl border-2 border-slate-600/90 bg-slate-950/95 px-3 py-1.5 text-center shadow-2xl backdrop-blur">
            <div className="flex items-center justify-center gap-1.5">
              <span
                className="text-sm sm:text-base font-black uppercase tracking-wide leading-tight"
                style={{ color: spec.color }}
              >
                {spec.badgeText}
              </span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                {scopeLabel}
              </span>
            </div>
            <div className="mt-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-200">
              {itemDesc}
            </div>
            <div className="mt-0.5 text-xs sm:text-sm font-black text-amber-300">
              {formatText(trans.hud.shotsProgress, {
                hits: gate.hits,
                target: gate.targetHits,
              })}
            </div>
          </div>
        </WorldHtml>
      )}
    </group>
  );
}

export function WeaponCrate() {
  const rightLaneGates = useGameStore((s) => s.rightLaneGates);

  return (
    <group>
      {rightLaneGates.map((gate) => (
        <BuffGateUnit key={`${gate.slotIndex}-${gate.buffId}`} gate={gate} />
      ))}
    </group>
  );
}
