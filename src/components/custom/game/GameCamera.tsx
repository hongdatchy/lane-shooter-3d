"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/state-manager/game-store";
import { GameRuntimeRef } from "@/dto/GameDTO";

interface GameCameraProps {
  runtimeRef: React.MutableRefObject<GameRuntimeRef>;
}

const desiredPos = new THREE.Vector3();
const desiredLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3(0, 0, -4);

export function GameCamera({ runtimeRef }: GameCameraProps) {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const hasInitialized = useRef(false);

  useFrame((state, rawDelta) => {
    // Khi ở chế độ FREE_ORBIT, nhường quyền điều khiển hoàn toàn cho OrbitControls
    if (cameraMode === "FREE_ORBIT") {
      return;
    }

    const delta = Math.min(rawDelta, 0.05);
    const { playerX, screenShake } = runtimeRef.current;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const isPortrait = aspect < 1;

    // Trên màn hình dọc điện thoại, tự động mở rộng góc nhìn và lùi nhẹ camera để thấy trọn 2 làn
    const perspCam = state.camera as THREE.PerspectiveCamera;
    if (perspCam.isPerspectiveCamera) {
      const targetFov = isPortrait
        ? THREE.MathUtils.clamp(46 + (1 - aspect) * 44, 46, 74)
        : 46;
      if (Math.abs(perspCam.fov - targetFov) > 0.1) {
        perspCam.fov = targetFov;
        perspCam.updateProjectionMatrix();
      }
    }
    const portraitDistScale = isPortrait
      ? THREE.MathUtils.clamp(1 + (1 - aspect) * 0.45, 1, 1.32)
      : 1;

    // Rung nhẹ camera khi quái chạm vạch phòng thủ
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 0.8 : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 0.6 : 0;

    if (cameraMode === "TOP_DOWN") {
      // Nghiêng nhẹ theo con trỏ chuột để tạo chiều sâu 3D ngay cả khi ở góc từ trên xuống
      const pointerTiltX = state.pointer.x * 1.25;
      const pointerTiltY = state.pointer.y * 0.55;
      desiredPos.set(
        pointerTiltX + shakeX,
        (21.5 - pointerTiltY) * portraitDistScale + shakeY,
        20.5 * portraitDistScale
      );
      desiredLookAt.set(pointerTiltX * 0.25, 0, -4.5);
    } else {
      // THIRD_PERSON: Góc nhìn sau lưng nhân vật (kéo xa hơn để thấy rõ nhân vật & 2 làn), bám trục X mượt mà
      desiredPos.set(
        playerX * 0.65 + shakeX,
        8.2 * portraitDistScale + shakeY,
        19.0 * portraitDistScale
      );
      desiredLookAt.set(playerX * 0.45, 1.1, -9.5);
    }

    if (!hasInitialized.current) {
      state.camera.position.copy(desiredPos);
      currentLookAt.copy(desiredLookAt);
      state.camera.lookAt(currentLookAt);
      hasInitialized.current = true;
      return;
    }

    const smoothFactor = 1 - Math.exp(-6.5 * delta);
    state.camera.position.lerp(desiredPos, smoothFactor);
    currentLookAt.lerp(desiredLookAt, smoothFactor);
    state.camera.lookAt(currentLookAt);
  });

  if (cameraMode === "FREE_ORBIT") {
    return (
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={10}
        maxDistance={48}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.25}
        target={[0, 1, -4]}
      />
    );
  }

  return null;
}
