"use client";

import { forwardRef, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { WeaponConfigDTO } from "@/dto/GameDTO";
import { ARENA_CONFIG, RAGE_CONFIG } from "@/service/game-constants";
import { useGameStore } from "@/state-manager/game-store";
import { WeaponModel3D } from "./WeaponModel3D";

interface PlayerUnitProps {
  weapon: WeaponConfigDTO;
  muzzleFlashRef: React.MutableRefObject<number>;
}

export const PlayerUnit = forwardRef<THREE.Group, PlayerUnitProps>(
  function PlayerUnit({ weapon, muzzleFlashRef }, ref) {
    const rage = useGameStore((s) => s.rage);
    const rageReady = useGameStore((s) => s.rageReady);
    const rageActive = useGameStore((s) => s.rageActive);
    const rageTimeLeft = useGameStore((s) => s.rageTimeLeft);
    const icbmAiming = useGameStore((s) => s.icbmAiming);
    const icbmPending = useGameStore((s) => s.icbmPending);

    const flashMeshRef = useRef<THREE.Mesh>(null);
    const rageRingRef = useRef<THREE.Mesh>(null);
    const rageReadyGlowRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
      if (muzzleFlashRef.current > 0) {
        muzzleFlashRef.current = Math.max(0, muzzleFlashRef.current - delta);
      }
      if (flashMeshRef.current) {
        const isHeavyWeapon = weapon.id === "cannon" || weapon.id === "icbm";
        const baseFlash = (isHeavyWeapon ? 1.25 : 0.65) * (rageActive ? 1.35 : 1);
        const s = muzzleFlashRef.current > 0 ? baseFlash + muzzleFlashRef.current * 9 : 0.001;
        flashMeshRef.current.visible = muzzleFlashRef.current > 0;
        flashMeshRef.current.scale.setScalar(s);
      }
      if (rageRingRef.current) {
        rageRingRef.current.visible = rageActive || rageReady || icbmAiming;
        if (rageActive || icbmAiming) {
          const pulse = 1 + Math.sin(state.clock.elapsedTime * 14) * 0.14;
          rageRingRef.current.scale.setScalar(pulse);
        } else if (rageReady) {
          const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.08;
          rageRingRef.current.scale.setScalar(pulse);
        }
      }
      if (rageReadyGlowRef.current) {
        const mat = rageReadyGlowRef.current.material as THREE.MeshBasicMaterial;
        if (rageActive || icbmAiming) {
          mat.color.set("#facc15");
        } else if (rageReady) {
          const flash = Math.sin(state.clock.elapsedTime * 8) > 0;
          mat.color.set(flash ? "#fde047" : "#f97316");
        } else {
          mat.color.set("#f97316");
        }
      }
    });

    const activeAccent = rageActive ? "#f59e0b" : weapon.bulletColor;
    const rageProgress = Math.min(1, Math.max(0, rage / RAGE_CONFIG.maxRage));
    const ragePercent = Math.round(rageProgress * 100);
    const rageBarWidth = 1.65;
    const rageFillWidth = Math.max(0.01, rageBarWidth * rageProgress);

    return (
      <group ref={ref} position={[ARENA_CONFIG.playerStartX, 0, ARENA_CONFIG.playerZ]}>
        {/* Đế trượt năng lượng */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.72, 0.85, 0.35, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Vòng sáng dưới chân nhân vật */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 0.98, 24]} />
          <meshBasicMaterial color={activeAccent} transparent opacity={0.85} />
        </mesh>

        {/* Vòng hào quang khi Nộ đầy hoặc đang xả Mưa Đạn */}
        <mesh
          ref={rageRingRef}
          position={[0, 0.06, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[1.08, 1.38, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} />
        </mesh>

        {/* Thân nhân vật / Robot chiến đấu */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <boxGeometry args={[0.92, 0.95, 0.86]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.35} />
        </mesh>

        {/* Kính ngắm hướng về phía trước (-Z) */}
        <mesh position={[0, 1.0, -0.44]}>
          <boxGeometry args={[0.66, 0.24, 0.08]} />
          <meshStandardMaterial
            color={activeAccent}
            emissive={activeAccent}
            emissiveIntensity={2}
          />
        </mesh>

        {/* Khẩu súng 3D thực tế đang cầm trên tay / vai phải */}
        <group position={[0.45, 0.78, -0.58]} scale={0.75}>
          <WeaponModel3D weapon={weapon} spinBarrels={rageActive || weapon.id === "machine-gun"} />

          {/* Hiệu ứng tia lửa đầu nòng khi bắn */}
          <mesh ref={flashMeshRef} position={[0, 0.06, -1.15]} visible={false}>
            <sphereGeometry args={[0.28, 10, 10]} />
            <meshBasicMaterial color={activeAccent} transparent opacity={0.9} />
          </mesh>
        </group>

        {/* Thanh Nộ 3D đặt ngay trên đầu nhân vật */}
        <group position={[0, 1.92, 0]}>
          <mesh>
            <boxGeometry args={[rageBarWidth + 0.1, 0.24, 0.08]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh
            ref={rageReadyGlowRef}
            position={[-(rageBarWidth - rageFillWidth) / 2, 0, 0.05]}
          >
            <boxGeometry args={[rageFillWidth, 0.16, 0.04]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
        </group>

        {/* Nhãn trạng thái Nộ trên đầu nhân vật */}
        <Html center position={[0, 2.38, 0]} distanceFactor={16} style={{ pointerEvents: "none" }}>
          <div className="select-none whitespace-nowrap text-center">
            {icbmAiming ? (
              <span className="animate-pulse rounded-full border border-rose-300 bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white shadow-lg">
                CLICK CHỌN ĐIỂM PHÓNG!
              </span>
            ) : icbmPending ? (
              <span className="rounded-full border border-amber-300 bg-orange-950/90 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow">
                TÊN LỬA ĐANG BAY!
              </span>
            ) : rageActive ? (
              <span className="rounded-full border border-amber-300/80 bg-amber-950/90 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow">
                MƯA ĐẠN {rageTimeLeft.toFixed(1)}s
              </span>
            ) : rageReady ? (
              <span className="animate-pulse rounded-full border border-yellow-300 bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-lg">
                {weapon.id === "icbm" ? "TÊN LỬA SẴN SÀNG [R]" : "NỘ ĐẦY • BẤM [R]"}
              </span>
            ) : (
              <span className="rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                NỘ {ragePercent}%
              </span>
            )}
          </div>
        </Html>
      </group>
    );
  }
);
