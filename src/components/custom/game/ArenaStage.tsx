"use client";

import { useMemo } from "react";
import { Stars } from "@react-three/drei";
import { ARENA_CONFIG } from "@/service/game-constants";
import { useAppStore } from "@/state-manager/app-store";

export function ArenaStage() {
  const theme = useAppStore((s) => s.theme);
  const isLight = theme === "light";
  const dividerSegments = useMemo(() => {
    const list: number[] = [];
    for (let z = -34; z <= 10; z += 2.6) {
      list.push(z);
    }
    return list;
  }, []);

  const halfWidth = ARENA_CONFIG.width / 2;
  const leftLaneWidth = ARENA_CONFIG.dividerX - -halfWidth;
  const leftLaneCenterX = (-halfWidth + ARENA_CONFIG.dividerX) / 2;
  const rightLaneWidth = halfWidth - ARENA_CONFIG.dividerX;
  const rightLaneCenterX = (ARENA_CONFIG.dividerX + halfWidth) / 2;
  const portalHalfSpan = leftLaneWidth / 2 - 0.85;

  return (
    <group>
      {/* Nền sao vũ trụ (chỉ hiện ở giao diện Tối) */}
      {!isLight && (
        <Stars radius={65} depth={35} count={1400} factor={3.2} saturation={0.2} fade speed={0.5} />
      )}

      {/* Lưới nền không gian phía dưới sân đấu */}
      <gridHelper
        args={[100, 50, isLight ? "#94a3b8" : "#1e293b", isLight ? "#cbd5e1" : "#0f172a"]}
        position={[0, -0.35, -10]}
      />

      {/* Mặt sàn chính của cầu đấu 2 làn */}
      <mesh position={[0, -0.1, ARENA_CONFIG.centerZ]} receiveShadow>
        <boxGeometry args={[ARENA_CONFIG.width, 0.2, ARENA_CONFIG.length]} />
        <meshStandardMaterial color={isLight ? "#cbd5e1" : "#111827"} roughness={0.75} metalness={0.25} />
      </mesh>

      {/* Làn trái (rộng 3x): Khu vực quái */}
      <mesh
        position={[leftLaneCenterX, 0.005, ARENA_CONFIG.centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[leftLaneWidth - 0.25, ARENA_CONFIG.length - 1]} />
        <meshStandardMaterial color={isLight ? "#f1e4e8" : "#1e131b"} roughness={0.85} metalness={0.1} />
      </mesh>

      {/* Làn phải: Khu vực Hòm Item / Vũ khí */}
      <mesh
        position={[rightLaneCenterX, 0.005, ARENA_CONFIG.centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[rightLaneWidth - 0.25, ARENA_CONFIG.length - 1]} />
        <meshStandardMaterial color={isLight ? "#e0f2fe" : "#0f1b2e"} roughness={0.8} metalness={0.15} />
      </mesh>

      {/* Vạch phân chia giữa 2 làn tại dividerX */}
      {dividerSegments.map((z) => (
        <mesh key={z} position={[ARENA_CONFIG.dividerX, 0.02, z]}>
          <boxGeometry args={[0.16, 0.03, 1.4]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}

      {/* Thành lan can hai bên sân đấu */}
      <mesh position={[-halfWidth - 0.25, 0.35, ARENA_CONFIG.centerZ]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.7, ARENA_CONFIG.length]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[halfWidth + 0.25, 0.35, ARENA_CONFIG.centerZ]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.7, ARENA_CONFIG.length]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Dải đèn neon trên lan can */}
      <mesh position={[-halfWidth - 0.25, 0.72, ARENA_CONFIG.centerZ]}>
        <boxGeometry args={[0.16, 0.06, ARENA_CONFIG.length]} />
        <meshStandardMaterial color="#f43f5e" emissive="#e11d48" emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[halfWidth + 0.25, 0.72, ARENA_CONFIG.centerZ]}>
        <boxGeometry args={[0.16, 0.06, ARENA_CONFIG.length]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.6} />
      </mesh>

      {/* Vạch laser giới hạn phòng thủ gần người chơi (phủ ngang làn quái) */}
      <mesh position={[leftLaneCenterX, 0.03, ARENA_CONFIG.defenseLineZ]}>
        <boxGeometry args={[leftLaneWidth - 0.25, 0.04, 0.16]} />
        <meshStandardMaterial color="#fb7185" emissive="#e11d48" emissiveIntensity={2.2} />
      </mesh>

      {/* Cổng xuất hiện quái phía xa (phủ rộng theo làn quái) */}
      <group position={[leftLaneCenterX, 0, ARENA_CONFIG.spawnZ - 1]}>
        <mesh position={[-portalHalfSpan, 1.8, 0]} castShadow>
          <boxGeometry args={[0.45, 3.6, 0.6]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[portalHalfSpan, 1.8, 0]} castShadow>
          <boxGeometry args={[0.45, 3.6, 0.6]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 3.5, 0]} castShadow>
          <boxGeometry args={[portalHalfSpan * 2 + 0.45, 0.45, 0.6]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.7, 0]}>
          <planeGeometry args={[portalHalfSpan * 2 - 0.45, 3.15]} />
          <meshBasicMaterial color="#9f1239" transparent opacity={0.28} />
        </mesh>
      </group>
    </group>
  );
}
