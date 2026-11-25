"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WeaponConfigDTO } from "@/dto/GameDTO";

interface WeaponModel3DProps {
  weapon: WeaponConfigDTO;
  spinBarrels?: boolean;
}

export function WeaponModel3D({ weapon, spinBarrels = false }: WeaponModel3DProps) {
  const gatlingClusterRef = useRef<THREE.Group>(null);

  const gatlingOffsets = useMemo(() => {
    const r = 0.14;
    return Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r] as const;
    });
  }, []);

  useFrame((_, rawDelta) => {
    if (spinBarrels && gatlingClusterRef.current) {
      gatlingClusterRef.current.rotation.z += Math.min(rawDelta, 0.05) * 6;
    }
  });

  if (weapon.modelKind === "pistol") {
    return (
      <group>
        {/* Tay cầm súng lục hơi nghiêng */}
        <mesh position={[0, -0.22, 0.24]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 0.44, 0.22]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.3} />
        </mesh>

        {/* Vòng bảo vệ cò */}
        <mesh position={[0, -0.09, 0.04]}>
          <boxGeometry args={[0.07, 0.13, 0.22]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Khối thân dưới */}
        <mesh position={[0, -0.02, -0.02]} castShadow>
          <boxGeometry args={[0.17, 0.1, 0.72]} />
          <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* Thanh trượt kim loại phía trên */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <boxGeometry args={[0.19, 0.18, 0.86]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.22} />
        </mesh>

        {/* Dải ngắm phát sáng */}
        <mesh position={[0, 0.2, 0.05]}>
          <boxGeometry args={[0.06, 0.04, 0.56]} />
          <meshStandardMaterial
            color={weapon.bulletColor}
            emissive={weapon.bulletColor}
            emissiveIntensity={1.6}
          />
        </mesh>

        {/* Đầu nòng */}
        <mesh position={[0, 0.09, -0.47]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.14, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    );
  }

  if (weapon.modelKind === "ak-rifle") {
    return (
      <group>
        {/* Báng gỗ đặc trưng của AKA */}
        <mesh position={[0, -0.04, 0.66]} rotation={[-0.14, 0, 0]} castShadow>
          <boxGeometry args={[0.14, 0.26, 0.58]} />
          <meshStandardMaterial color="#92400e" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* Tay cầm gỗ */}
        <mesh position={[0, -0.22, 0.28]} rotation={[0.32, 0, 0]} castShadow>
          <boxGeometry args={[0.13, 0.36, 0.17]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* Thân súng kim loại */}
        <mesh position={[0, 0.04, 0.04]} castShadow>
          <boxGeometry args={[0.18, 0.24, 0.72]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.28} />
        </mesh>

        {/* Dải ngắm phát sáng trên nắp hộp khóa nòng */}
        <mesh position={[0, 0.17, 0.04]}>
          <boxGeometry args={[0.06, 0.04, 0.44]} />
          <meshStandardMaterial
            color={weapon.bulletColor}
            emissive={weapon.bulletColor}
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* Băng đạn cong hình chuối đặc trưng của AK */}
        <mesh position={[0, -0.2, -0.04]} rotation={[-0.22, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.32, 0.2]} />
          <meshStandardMaterial color="#475569" metalness={0.65} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.42, -0.14]} rotation={[-0.52, 0, 0]} castShadow>
          <boxGeometry args={[0.115, 0.28, 0.19]} />
          <meshStandardMaterial color="#b45309" metalness={0.55} roughness={0.4} />
        </mesh>

        {/* Ốp lót tay bằng gỗ phía trước */}
        <mesh position={[0, 0.02, -0.48]} castShadow>
          <boxGeometry args={[0.17, 0.19, 0.46]} />
          <meshStandardMaterial color="#92400e" roughness={0.68} metalness={0.12} />
        </mesh>

        {/* Nòng súng dài */}
        <mesh position={[0, 0.05, -0.82]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.052, 0.95, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Ống trích khí phía trên nòng */}
        <mesh position={[0, 0.14, -0.52]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.036, 0.038, 0.5, 10]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Đầu ruồi ngắm ở mũi nòng */}
        <mesh position={[0, 0.17, -1.14]}>
          <boxGeometry args={[0.04, 0.14, 0.08]} />
          <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  if (weapon.modelKind === "machine-gun") {
    return (
      <group>
        {/* Cụm động cơ xoay phía sau */}
        <mesh position={[0, 0.04, 0.36]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.27, 0.62, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Tay xách phía trên kiểu Minigun */}
        <mesh position={[0, 0.38, 0.12]}>
          <boxGeometry args={[0.08, 0.07, 0.5]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.26, 0.34]}>
          <boxGeometry args={[0.08, 0.24, 0.08]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.26, -0.1]}>
          <boxGeometry args={[0.08, 0.24, 0.08]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Hộp đạn trống (Ammo Drum) treo bên dưới */}
        <mesh position={[0, -0.25, 0.18]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.36, 16]} />
          <meshStandardMaterial color="#064e3b" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.25, 0.18]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.39, 14]} />
          <meshStandardMaterial
            color={weapon.bulletColor}
            emissive={weapon.bulletColor}
            emissiveIntensity={1.4}
          />
        </mesh>

        {/* Cụm 6 nòng xoay Gatling */}
        <group ref={gatlingClusterRef} position={[0, 0.04, -0.52]}>
          {gatlingOffsets.map(([gx, gy], i) => (
            <mesh key={i} position={[gx, gy, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.036, 0.04, 1.18, 10]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}

          {/* Hai vòng kẹp nòng phát sáng */}
          <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.1, 16]} />
            <meshStandardMaterial
              color="#334155"
              emissive={weapon.accentColor}
              emissiveIntensity={0.8}
              metalness={0.85}
            />
          </mesh>
          <mesh position={[0, 0, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.1, 16]} />
            <meshStandardMaterial
              color="#334155"
              emissive={weapon.bulletColor}
              emissiveIntensity={1.1}
              metalness={0.85}
            />
          </mesh>
        </group>
      </group>
    );
  }

  if (weapon.modelKind === "cannon") {
    return (
      <group>
        {/* Giá đỡ pháo hạng nặng */}
        <mesh position={[0, -0.14, 0.18]} castShadow>
          <boxGeometry args={[0.56, 0.26, 0.78]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Cánh giáp tản nhiệt 2 bên */}
        <mesh position={[-0.34, 0.04, 0.18]} castShadow>
          <boxGeometry args={[0.12, 0.34, 0.62]} />
          <meshStandardMaterial color="#881337" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.34, 0.04, 0.18]} castShadow>
          <boxGeometry args={[0.12, 0.34, 0.62]} />
          <meshStandardMaterial color="#881337" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Khoang nạp năng lượng phía sau */}
        <mesh position={[0, 0.26, 0.26]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.48, 14]} />
          <meshStandardMaterial
            color={weapon.bulletColor}
            emissive={weapon.bulletColor}
            emissiveIntensity={1.6}
          />
        </mesh>

        {/* Nòng pháo đại bác to & dài */}
        <mesh position={[0, 0.08, -0.36]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.29, 1.32, 18]} />
          <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Vành hãm giật đầu nòng đại bác */}
        <mesh position={[0, 0.08, -0.96]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.27, 0.27, 0.16, 18]} />
          <meshStandardMaterial
            color={weapon.bulletColor}
            emissive={weapon.bulletColor}
            emissiveIntensity={1.4}
            metalness={0.6}
          />
        </mesh>
      </group>
    );
  }

  // weapon.id === "icbm": Bệ phóng Tên Lửa Liên Lục Địa
  return (
    <group>
      {/* Đế bệ phóng kép bọc thép */}
      <mesh position={[0, -0.16, 0.16]} castShadow>
        <boxGeometry args={[0.64, 0.24, 0.88]} />
        <meshStandardMaterial color="#1e293b" metalness={0.82} roughness={0.28} />
      </mesh>

      {/* Hai thanh ray dẫn phóng cam-vàng 2 bên */}
      <mesh position={[-0.3, 0.08, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.34, 1.1]} />
        <meshStandardMaterial color="#9a3412" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0.3, 0.08, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.34, 1.1]} />
        <meshStandardMaterial color="#9a3412" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Thân quả tên lửa trắng bạc nằm giữa bệ phóng */}
      <mesh position={[0, 0.16, -0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 1.12, 16]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.65} roughness={0.25} />
      </mesh>

      {/* Đầu đạn nhọn màu đỏ cam */}
      <mesh position={[0, 0.16, -0.9]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.21, 0.46, 16]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#dc2626"
          emissiveIntensity={0.75}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Cánh đuôi ổn định của tên lửa */}
      <mesh position={[0, 0.16, 0.32]}>
        <boxGeometry args={[0.66, 0.05, 0.24]} />
        <meshStandardMaterial color="#ea580c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.28, 0.32]}>
        <boxGeometry args={[0.05, 0.46, 0.24]} />
        <meshStandardMaterial color="#ea580c" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Đuôi động cơ phản lực phát sáng */}
      <mesh position={[0, 0.16, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.16, 14]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f97316"
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  );
}
