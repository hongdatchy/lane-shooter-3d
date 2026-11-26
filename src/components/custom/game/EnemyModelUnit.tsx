"use client";

import React, {
  Component,
  ReactNode,
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useFrame } from "@react-three/fiber";
import { useFBX, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { EnemyVisualKind } from "@/dto/GameDTO";
import { withAssetBase } from "@/lib/utils";
import { installModelBrowserCache } from "@/service/model-cache";
import { useGameStore } from "@/state-manager/game-store";

installModelBrowserCache();

export type EnemyModelMode = "IDLE" | "WALK" | "ATTACK" | "ARMOR_BREAK" | "DEATH";

export interface EnemyModelUnitHandle {
  setMode: (mode: EnemyModelMode, duration?: number) => void;
}

export interface EnemyModelSpec {
  walkFile: string;
  deathFile?: string;
  rotationY: number;
  targetHeight: number;
}

// Cấu hình model quái (dùng chung trong enemies/) và Boss (chia thư mục theo stage trong bosses/)
export const ENEMY_MODEL_CONFIG: Record<EnemyVisualKind, EnemyModelSpec> = {
  CRAWLER: {
    walkFile: "enemies/crawler-walk-death-texture.glb",
    rotationY: 0,
    targetHeight: 1.05,
  },
  HUSK: {
    walkFile: "enemies/husk-walk-death-poison-texture.glb",
    rotationY: 0,
    targetHeight: 1.2,
  },
  SKYWING: {
    walkFile: "enemies/skywing-v2.glb",
    rotationY: 0,
    targetHeight: 0.58,
  },
  SHELL_BRUTE: {
    walkFile: "enemies/shell_brute.glb",
    rotationY: 0,
    targetHeight: 1.05,
  },
  BOSS_STAGE1: {
    walkFile: "bosses/stage1/iron-warden-mechanical.glb",
    rotationY: 0,
    targetHeight: 1.2,
  },
  BOSS_STAGE2: {
    walkFile: "bosses/stage2/nano-hydra-base-v3.glb",
    rotationY: 0,
    targetHeight: 1.25,
  },
};

const toModelUrl = (fileName: string) => withAssetBase(encodeURI(`models/${fileName}`));

if (typeof window !== "undefined") {
  for (const cfg of Object.values(ENEMY_MODEL_CONFIG)) {
    for (const fileName of [cfg.walkFile, cfg.deathFile]) {
      if (!fileName) continue;
      const url = toModelUrl(fileName);
      if (fileName.toLowerCase().endsWith(".fbx")) {
        useFBX.preload(url);
      } else {
        useGLTF.preload(url);
      }
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

interface NormalizedModelData {
  clonedScene: THREE.Object3D;
  autoScale: number;
  maxDim: number;
  offset: [number, number, number];
}

function prepareNormalizedScene(
  sourceScene: THREE.Object3D,
  rotationY: number,
  targetHeight: number,
  walkReference?: { scale: number; maxDim: number }
): NormalizedModelData {
  const root = cloneSkinned(sourceScene);
  root.rotation.set(0, rotationY, 0);
  root.position.set(0, 0, 0);
  root.scale.setScalar(1);
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      // Giữ skinned mesh không bị ẩn nhầm khi animation ngã lệch khỏi bind box
      obj.frustumCulled = false;
    }
  });
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const refHeight = size.y > 0.001 ? size.y : maxDim;

  // Model chết giữ đúng tỷ lệ hình thể theo model sống để xác nằm không bị phóng to bất thường
  const scale = walkReference
    ? walkReference.scale * (walkReference.maxDim / maxDim)
    : targetHeight / refHeight;

  return {
    clonedScene: root,
    autoScale: scale,
    maxDim,
    offset: [-center.x * scale, -box.min.y * scale, -center.z * scale],
  };
}

function pickAnimationClip(
  animations: THREE.AnimationClip[],
  pattern: RegExp,
  fallbackFirst: boolean
): THREE.AnimationClip | null {
  if (animations.length === 0) return null;
  const matched = animations.find((clip) => pattern.test(clip.name));
  if (matched) return matched;
  return fallbackFirst ? animations[0] : null;
}

interface DesiredRigState {
  mode: EnemyModelMode;
  deathDuration: number;
}

interface NormalizedDualRigProps {
  walkScene: THREE.Object3D;
  walkAnimations: THREE.AnimationClip[];
  deathScene: THREE.Object3D | null;
  deathAnimations: THREE.AnimationClip[];
  rotationY: number;
  targetHeight: number;
  desiredStateRef: React.MutableRefObject<DesiredRigState>;
  applyHandlerRef: React.MutableRefObject<
    ((mode: EnemyModelMode, deathDuration?: number) => void) | null
  >;
}

function NormalizedDualRig({
  walkScene,
  walkAnimations,
  deathScene,
  deathAnimations,
  rotationY,
  targetHeight,
  desiredStateRef,
  applyHandlerRef,
}: NormalizedDualRigProps) {
  const walkHolderRef = useRef<THREE.Group>(null);
  const deathHolderRef = useRef<THREE.Group>(null);
  const modeRef = useRef<EnemyModelMode>("IDLE");
  const deathElapsedRef = useRef(0);
  const deathDurationRef = useRef(1.2);
  const armorBreakElapsedRef = useRef(0);
  const armorBreakDurationRef = useRef(1.1);

  const hasSeparateDeath = deathScene !== null;

  const { walkData, deathData } = useMemo(() => {
    const walk = prepareNormalizedScene(walkScene, rotationY, targetHeight);
    const death = deathScene
      ? prepareNormalizedScene(deathScene, rotationY, targetHeight, {
          scale: walk.autoScale,
          maxDim: walk.maxDim,
        })
      : null;
    return { walkData: walk, deathData: death };
  }, [walkScene, deathScene, rotationY, targetHeight]);

  const animBundle = useMemo(() => {
    const walkMixer = new THREE.AnimationMixer(walkData.clonedScene);
    const walkClip = pickAnimationClip(walkAnimations, /walk|run|fly|move|march|idle|spawn|intro/i, true);
    const walkAction = walkClip ? walkMixer.clipAction(walkClip) : null;

    const attackClip = pickAnimationClip(
      walkAnimations,
      /cast|mage|attack|shoot|poison|spell|laser|sweep|ultimate/i,
      false
    );
    const attackAction = attackClip ? walkMixer.clipAction(attackClip) : null;

    const armorBreakClip = pickAnimationClip(
      walkAnimations,
      /armor_break|armor-break|break|stagger/i,
      false
    );
    const armorBreakAction = armorBreakClip ? walkMixer.clipAction(armorBreakClip) : null;

    const deathMixer = deathData
      ? new THREE.AnimationMixer(deathData.clonedScene)
      : walkMixer;
    const deathClip = deathData
      ? pickAnimationClip(deathAnimations, /dead|death|defeat|die|fall/i, true)
      : pickAnimationClip(walkAnimations, /dead|death|defeat|die/i, false);
    const deathAction = deathClip ? deathMixer.clipAction(deathClip) : null;

    return {
      walkMixer,
      walkAction,
      attackAction,
      armorBreakAction,
      deathMixer,
      deathAction,
    };
  }, [walkData, deathData, walkAnimations, deathAnimations]);

  useEffect(() => {
    return () => {
      animBundle.walkMixer.stopAllAction();
      animBundle.walkMixer.uncacheRoot(walkData.clonedScene);
      if (deathData) {
        animBundle.deathMixer.stopAllAction();
        animBundle.deathMixer.uncacheRoot(deathData.clonedScene);
      }
    };
  }, [animBundle, walkData.clonedScene, deathData]);

  useEffect(() => {
    const applyMode = (mode: EnemyModelMode, duration = 1.2) => {
      const prevMode = modeRef.current;
      modeRef.current = mode;
      deathElapsedRef.current = 0;
      deathDurationRef.current = Math.max(0.25, duration);
      armorBreakElapsedRef.current = 0;
      armorBreakDurationRef.current = Math.max(0.35, duration);

      const walkHolder = walkHolderRef.current;
      const deathHolder = deathHolderRef.current;
      if (walkHolder) {
        walkHolder.position.set(0, 0, 0);
        walkHolder.rotation.set(0, 0, 0);
      }
      if (deathHolder) {
        deathHolder.position.set(0, 0, 0);
        deathHolder.rotation.set(0, 0, 0);
      }

      if (mode === "IDLE") {
        if (walkHolder) walkHolder.visible = false;
        if (deathHolder) deathHolder.visible = false;
        animBundle.walkAction?.stop();
        animBundle.attackAction?.stop();
        animBundle.armorBreakAction?.stop();
        animBundle.deathAction?.stop();
        return;
      }

      if (mode === "WALK") {
        if (walkHolder) walkHolder.visible = true;
        if (deathHolder) deathHolder.visible = false;
        animBundle.deathAction?.stop();
        animBundle.attackAction?.stop();
        animBundle.armorBreakAction?.stop();
        if (animBundle.walkAction) {
          const clipDur = animBundle.walkAction.getClip().duration || 1;
          animBundle.walkAction.reset();
          animBundle.walkAction.setLoop(THREE.LoopRepeat, Infinity);
          animBundle.walkAction.timeScale = 1;
          animBundle.walkAction.play();
          animBundle.walkAction.time = prevMode === "IDLE" ? Math.random() * clipDur : 0;
          animBundle.walkMixer.update(0);
        }
        return;
      }

      if (mode === "ATTACK") {
        if (walkHolder) walkHolder.visible = true;
        if (deathHolder) deathHolder.visible = false;
        animBundle.walkAction?.stop();
        animBundle.armorBreakAction?.stop();
        animBundle.deathAction?.stop();
        if (animBundle.attackAction) {
          const clipDur = animBundle.attackAction.getClip().duration || 1;
          animBundle.attackAction.reset();
          animBundle.attackAction.setLoop(THREE.LoopOnce, 1);
          animBundle.attackAction.clampWhenFinished = true;
          animBundle.attackAction.timeScale = Math.max(1, clipDur / deathDurationRef.current);
          animBundle.attackAction.play();
          animBundle.walkMixer.update(0);
        }
        return;
      }

      if (mode === "ARMOR_BREAK") {
        if (walkHolder) walkHolder.visible = true;
        if (deathHolder) deathHolder.visible = false;
        animBundle.walkAction?.stop();
        animBundle.attackAction?.stop();
        animBundle.deathAction?.stop();
        if (animBundle.armorBreakAction) {
          const clipDur = animBundle.armorBreakAction.getClip().duration || 1.1;
          armorBreakDurationRef.current = clipDur;
          animBundle.armorBreakAction.reset();
          animBundle.armorBreakAction.setLoop(THREE.LoopOnce, 1);
          animBundle.armorBreakAction.clampWhenFinished = false;
          animBundle.armorBreakAction.timeScale = 1;
          animBundle.armorBreakAction.play();
          animBundle.walkMixer.update(0);
        }
        return;
      }

      // mode === "DEATH"
      if (walkHolder) walkHolder.visible = !hasSeparateDeath;
      if (deathHolder) deathHolder.visible = hasSeparateDeath;
      animBundle.walkAction?.stop();
      animBundle.attackAction?.stop();
      animBundle.armorBreakAction?.stop();

      if (animBundle.deathAction) {
        const clipDur = animBundle.deathAction.getClip().duration || 1;
        const activeWindow = Math.max(0.25, deathDurationRef.current * 0.78);
        animBundle.deathAction.reset();
        animBundle.deathAction.setLoop(THREE.LoopOnce, 1);
        animBundle.deathAction.clampWhenFinished = true;
        animBundle.deathAction.timeScale = Math.max(1, clipDur / activeWindow);
        animBundle.deathAction.play();
        animBundle.deathMixer.update(0);
      }
    };

    applyHandlerRef.current = applyMode;
    // Đồng bộ trạng thái hiện tại nếu Suspense hoàn thành tải sau lúc quái đã spawn
    applyMode(desiredStateRef.current.mode, desiredStateRef.current.deathDuration);

    return () => {
      if (applyHandlerRef.current === applyMode) {
        applyHandlerRef.current = null;
      }
    };
  }, [animBundle, hasSeparateDeath, desiredStateRef, applyHandlerRef]);

  useFrame((_, rawDelta) => {
    if (modeRef.current === "IDLE") return;
    if (useGameStore.getState().gameStatus === "PAUSED") return;

    const delta = Math.min(rawDelta, 0.05);

    if (modeRef.current === "WALK") {
      if (animBundle.walkAction) {
        animBundle.walkMixer.update(delta);
      }
      return;
    }

    if (modeRef.current === "ATTACK") {
      if (animBundle.attackAction) {
        animBundle.walkMixer.update(delta);
      }
      return;
    }

    if (modeRef.current === "ARMOR_BREAK") {
      armorBreakElapsedRef.current += delta;
      if (animBundle.armorBreakAction) {
        animBundle.walkMixer.update(delta);
      }
      if (armorBreakElapsedRef.current >= armorBreakDurationRef.current) {
        applyHandlerRef.current?.("WALK");
      }
      return;
    }

    deathElapsedRef.current += delta;
    if (animBundle.deathAction) {
      animBundle.deathMixer.update(delta);
      return;
    }

    // Fallback mượt cho model chưa gắn clip chết (ngã ngửa nếu dùng chung mesh sống, hoặc dập nhẹ nếu là mesh nằm sẵn)
    if (!hasSeparateDeath && walkHolderRef.current) {
      const fallWindow = Math.min(0.65, deathDurationRef.current * 0.55);
      const t = Math.min(1, deathElapsedRef.current / Math.max(0.15, fallWindow));
      const eased = 1 - Math.pow(1 - t, 3);
      walkHolderRef.current.rotation.x = -Math.PI * 0.45 * eased;
      walkHolderRef.current.position.y = -0.15 * eased;
    } else if (hasSeparateDeath && deathHolderRef.current) {
      const dropT = Math.min(1, deathElapsedRef.current / 0.14);
      deathHolderRef.current.position.y = -0.05 * Math.sin(dropT * Math.PI);
    }
  });

  return (
    <group>
      <group ref={walkHolderRef} visible={false}>
        <group position={walkData.offset} scale={walkData.autoScale}>
          <primitive object={walkData.clonedScene} />
        </group>
      </group>
      {deathData && (
        <group ref={deathHolderRef} visible={false}>
          <group position={deathData.offset} scale={deathData.autoScale}>
            <primitive object={deathData.clonedScene} />
          </group>
        </group>
      )}
    </group>
  );
}

interface DualRigUrlProps {
  walkUrl: string;
  deathUrl?: string;
  rotationY: number;
  targetHeight: number;
  desiredStateRef: React.MutableRefObject<DesiredRigState>;
  applyHandlerRef: React.MutableRefObject<
    ((mode: EnemyModelMode, deathDuration?: number) => void) | null
  >;
}

function EnemyFbxDualModel({
  walkUrl,
  deathUrl,
  rotationY,
  targetHeight,
  desiredStateRef,
  applyHandlerRef,
}: DualRigUrlProps) {
  const walkFbx = useFBX(walkUrl);
  const deathFbx = useFBX(deathUrl || walkUrl);
  const hasSeparateDeath = Boolean(deathUrl);

  return (
    <NormalizedDualRig
      walkScene={walkFbx}
      walkAnimations={walkFbx.animations}
      deathScene={hasSeparateDeath ? deathFbx : null}
      deathAnimations={hasSeparateDeath ? deathFbx.animations : []}
      rotationY={rotationY}
      targetHeight={targetHeight}
      desiredStateRef={desiredStateRef}
      applyHandlerRef={applyHandlerRef}
    />
  );
}

function EnemyGlbDualModel({
  walkUrl,
  deathUrl,
  rotationY,
  targetHeight,
  desiredStateRef,
  applyHandlerRef,
}: DualRigUrlProps) {
  const walkGltf = useGLTF(walkUrl);
  const deathGltf = useGLTF(deathUrl || walkUrl);
  const hasSeparateDeath = Boolean(deathUrl);

  return (
    <NormalizedDualRig
      walkScene={walkGltf.scene}
      walkAnimations={walkGltf.animations}
      deathScene={hasSeparateDeath ? deathGltf.scene : null}
      deathAnimations={hasSeparateDeath ? deathGltf.animations : []}
      rotationY={rotationY}
      targetHeight={targetHeight}
      desiredStateRef={desiredStateRef}
      applyHandlerRef={applyHandlerRef}
    />
  );
}

interface EnemyModelUnitProps {
  kind: EnemyVisualKind;
  fallback: ReactNode;
}

export const EnemyModelUnit = forwardRef<EnemyModelUnitHandle, EnemyModelUnitProps>(
  function EnemyModelUnit({ kind, fallback }, ref) {
    const cfg = ENEMY_MODEL_CONFIG[kind];
    const walkUrl = toModelUrl(cfg.walkFile);
    const deathUrl = cfg.deathFile ? toModelUrl(cfg.deathFile) : undefined;
    const isFbx = cfg.walkFile.toLowerCase().endsWith(".fbx");

    const desiredStateRef = useRef<DesiredRigState>({
      mode: "IDLE",
      deathDuration: 1.2,
    });
    const applyHandlerRef = useRef<
      ((mode: EnemyModelMode, deathDuration?: number) => void) | null
    >(null);

    useImperativeHandle(
      ref,
      () => ({
        setMode(mode, deathDuration = 1.2) {
          desiredStateRef.current = { mode, deathDuration };
          applyHandlerRef.current?.(mode, deathDuration);
        },
      }),
      []
    );

    return (
      <EnemyErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          {isFbx ? (
            <EnemyFbxDualModel
              walkUrl={walkUrl}
              deathUrl={deathUrl}
              rotationY={cfg.rotationY}
              targetHeight={cfg.targetHeight}
              desiredStateRef={desiredStateRef}
              applyHandlerRef={applyHandlerRef}
            />
          ) : (
            <EnemyGlbDualModel
              walkUrl={walkUrl}
              deathUrl={deathUrl}
              rotationY={cfg.rotationY}
              targetHeight={cfg.targetHeight}
              desiredStateRef={desiredStateRef}
              applyHandlerRef={applyHandlerRef}
            />
          )}
        </Suspense>
      </EnemyErrorBoundary>
    );
  }
);
