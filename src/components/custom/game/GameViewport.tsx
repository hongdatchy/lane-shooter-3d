"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { GameRuntimeRef } from "@/dto/GameDTO";
import { ARENA_CONFIG } from "@/service/game-constants";
import { GameCamera } from "./GameCamera";
import { ArenaStage } from "./ArenaStage";
import { ArenaWorld } from "./ArenaWorld";

export function GameViewport() {
  const runtimeRef = useRef<GameRuntimeRef>({
    playerX: ARENA_CONFIG.playerStartX,
    playerVelocityX: 0,
    cratePulse: 0,
    screenShake: 0,
  });

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 46, near: 0.1, far: 150, position: [0, 21.5, 20.5] }}
      gl={{ antialias: true }}
      className="h-full w-full"
    >
      <color attach="background" args={["#070b14"]} />
      <fog attach="fog" args={["#070b14", 34, 70]} />

      {/* Hệ thống ánh sáng sân khấu */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#bae6fd", "#1e1b4b", 0.6]} />
      <directionalLight
        position={[10, 24, 12]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
      />

      {/* Phản chiếu studio nội bộ (không cần tải file HDRI ngoài mạng) */}
      <Environment resolution={128}>
        <Lightformer
          intensity={1.8}
          position={[0, 12, -5]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[18, 8, 1]}
          color="#e0f2fe"
        />
        <Lightformer
          intensity={1.2}
          position={[-10, 5, 4]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[12, 4, 1]}
          color="#fda4af"
        />
        <Lightformer
          intensity={1.2}
          position={[10, 5, 4]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[12, 4, 1]}
          color="#7dd3fc"
        />
      </Environment>

      <Suspense fallback={null}>
        <GameCamera runtimeRef={runtimeRef} />
        <ArenaStage />
        <ArenaWorld runtimeRef={runtimeRef} />
      </Suspense>
    </Canvas>
  );
}

export default GameViewport;
