"use client";

import React, { Component, ReactNode, Suspense, useEffect, useMemo, useRef } from "react";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { EnemyKind } from "@/dto/GameDTO";
import { withAssetBase } from "@/lib/utils";
import { installModelBrowserCache } from "@/service/model-cache";

installModelBrowserCache();

// Cấu hình 3 model Cửa 1 trong public/models/classic/stage1/ (Quái 1, Quái 2, Boss 1)
export const ENEMY_MODEL_CONFIG: Record<
  EnemyKind,
  { fileName: string; rotationY: number; targetHeight: number }
> = {
  NORMAL: { fileName: "classic/stage1/crawler_walk.glb", rotationY: 0, targetHeight: 1.05 },
  ELITE: { fileName: "classic/stage1/husk_rigged Walking.glb", rotationY: 0, targetHeight: 1.2 },
  BOSS: { fileName: "classic/stage1/enemy-boss.glb", rotationY: 0, targetHeight: 1.2 },
};

const toModelUrl = (fileName: string) => withAssetBase(encodeURI(`models/${fileName}`));

if (typeof window !== "undefined") {
  for (const cfg of Object.values(ENEMY_MODEL_CONFIG)) {
    const url = toModelUrl(cfg.fileName);
    if (cfg.fileName.toLowerCase().endsWith(".fbx")) {
      useFBX.preload(url);
    } else {
      useGLTF.preload(url);
    }
  }
}

interface EnemyErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface EnemyErrorBoundaryState {
  hasError: boolean;
}

class EnemyErrorBoundary extends Component<EnemyErrorBoundaryProps, EnemyErrorBoundaryState> {
  state: EnemyErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): EnemyErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[EnemyModelUnit] Không nạp được model quái 3D:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface NormalizedEnemyRigProps {
  sourceScene: THREE.Object3D;
  animations: THREE.AnimationClip[];
  rotationY: number;
  targetHeight: number;
}

function NormalizedEnemyRig({
  sourceScene,
  animations,
  rotationY,
  targetHeight,
}: NormalizedEnemyRigProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { clonedScene, autoScale, offset } = useMemo(() => {
    const root = cloneSkinned(sourceScene);
    root.rotation.set(0, rotationY, 0);
    root.position.set(0, 0, 0);
    root.scale.setScalar(1);
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const refHeight = size.y > 0.001 ? size.y : Math.max(size.x, size.z, 1);
    const scale = targetHeight / refHeight;

    return {
      clonedScene: root,
      autoScale: scale,
      offset: [
        -center.x * scale,
        -box.min.y * scale,
        -center.z * scale,
      ] as [number, number, number],
    };
  }, [sourceScene, rotationY, targetHeight]);

  const { actions, names } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (names.length === 0) return;
    const walkClip =
      names.find((n) => /walk|run|move|march|idle/i.test(n)) || names[0];
    const action = walkClip ? actions[walkClip] : null;
    action?.reset().fadeIn(0.15).play();
    return () => {
      for (const key of Object.keys(actions)) {
        actions[key]?.stop();
      }
    };
  }, [actions, names]);

  return (
    <group ref={groupRef} position={offset} scale={autoScale}>
      <primitive object={clonedScene} />
    </group>
  );
}

function EnemyFbxModel({
  url,
  rotationY,
  targetHeight,
}: {
  url: string;
  rotationY: number;
  targetHeight: number;
}) {
  const fbx = useFBX(url);
  return (
    <NormalizedEnemyRig
      sourceScene={fbx}
      animations={fbx.animations}
      rotationY={rotationY}
      targetHeight={targetHeight}
    />
  );
}

function EnemyGlbModel({
  url,
  rotationY,
  targetHeight,
}: {
  url: string;
  rotationY: number;
  targetHeight: number;
}) {
  const gltf = useGLTF(url);
  return (
    <NormalizedEnemyRig
      sourceScene={gltf.scene}
      animations={gltf.animations}
      rotationY={rotationY}
      targetHeight={targetHeight}
    />
  );
}

interface EnemyModelUnitProps {
  kind: EnemyKind;
  fallback: ReactNode;
}

export function EnemyModelUnit({ kind, fallback }: EnemyModelUnitProps) {
  const cfg = ENEMY_MODEL_CONFIG[kind];
  const url = toModelUrl(cfg.fileName);
  const isFbx = cfg.fileName.toLowerCase().endsWith(".fbx");

  return (
    <EnemyErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        {isFbx ? (
          <EnemyFbxModel
            url={url}
            rotationY={cfg.rotationY}
            targetHeight={cfg.targetHeight}
          />
        ) : (
          <EnemyGlbModel
            url={url}
            rotationY={cfg.rotationY}
            targetHeight={cfg.targetHeight}
          />
        )}
      </Suspense>
    </EnemyErrorBoundary>
  );
}
