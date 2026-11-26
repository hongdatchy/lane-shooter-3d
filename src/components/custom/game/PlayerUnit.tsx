"use client";

import React, { Component, ReactNode, Suspense, forwardRef, useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { WorldHtml } from "./WorldHtml";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { WeaponConfigDTO } from "@/dto/GameDTO";
import { ARENA_CONFIG, RAGE_CONFIG } from "@/service/game-constants";
import { getArmoryWeaponById } from "@/service/armory-catalog";
import { gameInput } from "@/service/game-input";
import { useGameStore } from "@/state-manager/game-store";
import { formatText, useTransClientSide } from "@/lang/useTransClientSide";
import { withAssetBase } from "@/lib/utils";
import { installModelBrowserCache } from "@/service/model-cache";
import { WeaponModel3D } from "./WeaponModel3D";

installModelBrowserCache();

const PLAYER_MODEL_CONFIG = {
  // Đổi giữa "fbx" (3 file Mixamo: idle + left + right) hoặc "glb" (1 file .glb)
  format: "glb" as "fbx" | "glb",
  fbxFiles: {
    idle: "player-idle.fbx",
    left: "player-left.fbx",
    right: "player-right.fbx",
  },
  glbFile: "linh-cyber-v3.glb",
  targetHeight: 1.65,
  baseY: 0,
  // Model .glb quay mặt +Z, xoay Math.PI (180 độ) để nhìn về phía quái (-Z).
  rotationY: Math.PI,
  // Căn chỉnh vị trí & góc xoay khẩu súng gắn vào WeaponSocket (nòng -Z gắn theo +Z của socket)
  handAttachment: {
    scale: 0.48,
    position: [0, 0.04, 0] as [number, number, number],
    rotation: [0, Math.PI, 0] as [number, number, number],
  },
};

const toModelUrl = (fileName: string) => withAssetBase(encodeURI(`models/${fileName}`));

const FBX_URLS = {
  idle: toModelUrl(PLAYER_MODEL_CONFIG.fbxFiles.idle),
  left: toModelUrl(PLAYER_MODEL_CONFIG.fbxFiles.left),
  right: toModelUrl(PLAYER_MODEL_CONFIG.fbxFiles.right),
};
const GLB_URL = toModelUrl(PLAYER_MODEL_CONFIG.glbFile);

if (typeof window !== "undefined") {
  if (PLAYER_MODEL_CONFIG.format === "fbx") {
    useFBX.preload(FBX_URLS.idle);
    useFBX.preload(FBX_URLS.left);
    useFBX.preload(FBX_URLS.right);
  } else {
    useGLTF.preload(GLB_URL);
  }
}

function prepareAnimationClip(clip: THREE.AnimationClip, name: string): THREE.AnimationClip {
  const cloned = clip.clone();
  cloned.name = name;
  // Giữ nguyên chuyển động ngã X/Z cho animation Death; chỉ khóa In Place ở các clip đứng/chạy
  if (/death|dead|die/i.test(name)) {
    return cloned;
  }
  for (const track of cloned.tracks) {
    // Khóa dịch chuyển ngang X/Z trên xương gốc phòng trường hợp file Mixamo chưa tick In Place
    if (/hips\.position$|^root\.position$/i.test(track.name) && track.values.length >= 3) {
      const vals = Float32Array.from(track.values);
      const x0 = vals[0];
      const z0 = vals[2];
      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = x0;
        vals[i + 2] = z0;
      }
      track.values = vals;
    }
  }
  return cloned;
}

interface PlayerUnitProps {
  weapon: WeaponConfigDTO;
  muzzleFlashRef: React.MutableRefObject<number>;
}

function FallbackRobotMesh({ activeAccent }: { activeAccent: string }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.92, 0.95, 0.86]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.0, -0.44]}>
        <boxGeometry args={[0.66, 0.24, 0.08]} />
        <meshStandardMaterial
          color={activeAccent}
          emissive={activeAccent}
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  );
}

interface ModelErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ModelErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  state: ModelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Không nạp được model nhân vật, dùng mô hình dự phòng:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface RiggedModelRunnerProps {
  sourceScene: THREE.Object3D;
  clips: THREE.AnimationClip[];
  idleClipName: string | null;
  leftClipName: string | null;
  rightClipName: string | null;
  deathClipName?: string | null;
  weaponNode: ReactNode;
}

function RiggedModelRunner({
  sourceScene,
  clips,
  idleClipName,
  leftClipName,
  rightClipName,
  deathClipName = null,
  weaponNode,
}: RiggedModelRunnerProps) {
  const animRootRef = useRef<THREE.Group>(null);
  const activeAnimRef = useRef<string | null>(null);

  const { clonedScene, autoScale, offset, handBone, handSocketInvScale } = useMemo(() => {
    const root = cloneSkinned(sourceScene);
    root.rotation.set(0, PLAYER_MODEL_CONFIG.rotationY, 0);
    root.position.set(0, 0, 0);
    root.scale.setScalar(1);

    let socketBone: THREE.Object3D | null = null;
    let fallbackRightHand: THREE.Object3D | null = null;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
      }
      if (!socketBone && /weaponsocket/i.test(obj.name)) {
        socketBone = obj;
      } else if (!fallbackRightHand && /righthand|hand_r|r_hand/i.test(obj.name)) {
        fallbackRightHand = obj;
      }
    });
    const chosenBone = (socketBone ?? fallbackRightHand) as THREE.Object3D | null;
    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const refHeight = size.y > 0.001 ? size.y : Math.max(size.x, size.z, 1);
    const scale = PLAYER_MODEL_CONFIG.targetHeight / refHeight;

    const boneWorldScale = new THREE.Vector3(1, 1, 1);
    if (chosenBone) {
      chosenBone.getWorldScale(boneWorldScale);
    }
    const invScale = 1 / Math.max(0.0001, scale * boneWorldScale.y);

    return {
      clonedScene: root,
      autoScale: scale,
      handBone: chosenBone,
      handSocketInvScale: invScale,
      offset: [
        -center.x * scale,
        PLAYER_MODEL_CONFIG.baseY - box.min.y * scale,
        -center.z * scale,
      ] as [number, number, number],
    };
  }, [sourceScene]);

  const { actions } = useAnimations(clips, animRootRef);

  useEffect(() => {
    activeAnimRef.current = null;
    if (idleClipName && actions[idleClipName]) {
      const idleAction = actions[idleClipName];
      if (idleAction) {
        idleAction.setLoop(THREE.LoopRepeat, Infinity);
        idleAction.reset().fadeIn(0.15).play();
        activeAnimRef.current = idleClipName;
      }
    }
    return () => {
      for (const key of Object.keys(actions)) {
        actions[key]?.stop();
      }
    };
  }, [actions, idleClipName]);

  useFrame(() => {
    if (!idleClipName) return;
    const status = useGameStore.getState().gameStatus;

    if (status === "GAME_OVER" && deathClipName && actions[deathClipName]) {
      if (activeAnimRef.current !== deathClipName) {
        const prevAction = activeAnimRef.current ? actions[activeAnimRef.current] : null;
        const deathAction = actions[deathClipName];
        if (deathAction) {
          prevAction?.fadeOut(0.12);
          deathAction.setLoop(THREE.LoopOnce, 1);
          deathAction.clampWhenFinished = true;
          deathAction.timeScale = 1;
          deathAction.reset().fadeIn(0.12).play();
          activeAnimRef.current = deathClipName;
        }
      }
      return;
    }

    const movingLeft = status === "PLAYING" && gameInput.left && !gameInput.right;
    const movingRight = status === "PLAYING" && gameInput.right && !gameInput.left;

    const targetName = movingLeft
      ? leftClipName || idleClipName
      : movingRight
        ? rightClipName || idleClipName
        : idleClipName;

    if (!targetName || activeAnimRef.current === targetName) return;

    const prevAction = activeAnimRef.current ? actions[activeAnimRef.current] : null;
    const nextAction = actions[targetName];
    if (nextAction) {
      prevAction?.fadeOut(0.14);
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
      nextAction.clampWhenFinished = false;
      nextAction.timeScale = targetName === idleClipName ? 1 : 1.45;
      nextAction.reset().fadeIn(0.14).play();
      activeAnimRef.current = targetName;
    }
  });

  return (
    <group ref={animRootRef} position={offset} scale={autoScale}>
      <primitive object={clonedScene} />
      {handBone ? (
        createPortal(
          // Bù scale ngược theo world scale thực của bone/WeaponSocket để súng giữ đúng kích thước chuẩn
          <group scale={handSocketInvScale}>
            <group
              position={PLAYER_MODEL_CONFIG.handAttachment.position}
              rotation={PLAYER_MODEL_CONFIG.handAttachment.rotation}
              scale={PLAYER_MODEL_CONFIG.handAttachment.scale}
            >
              {weaponNode}
            </group>
          </group>,
          handBone
        )
      ) : (
        <group scale={1 / autoScale}>
          <group position={[0.25, 1.15, -0.5]} scale={0.75}>
            {weaponNode}
          </group>
        </group>
      )}
    </group>
  );
}

// Nhánh 1: Nạp 3 file Mixamo .fbx (player-idle.fbx + player-left.fbx + player-right.fbx)
function PlayerMixamoFbxModel({ weaponNode }: { weaponNode: ReactNode }) {
  const idleFbx = useFBX(FBX_URLS.idle);
  const leftFbx = useFBX(FBX_URLS.left);
  const rightFbx = useFBX(FBX_URLS.right);

  const clips = useMemo(() => {
    const list: THREE.AnimationClip[] = [];
    if (idleFbx.animations[0]) {
      list.push(prepareAnimationClip(idleFbx.animations[0], "idle"));
    }
    if (leftFbx.animations[0]) {
      list.push(prepareAnimationClip(leftFbx.animations[0], "left"));
    }
    if (rightFbx.animations[0]) {
      list.push(prepareAnimationClip(rightFbx.animations[0], "right"));
    }
    return list;
  }, [idleFbx.animations, leftFbx.animations, rightFbx.animations]);

  return (
    <RiggedModelRunner
      sourceScene={idleFbx}
      clips={clips}
      idleClipName={idleFbx.animations[0] ? "idle" : null}
      leftClipName={leftFbx.animations[0] ? "left" : null}
      rightClipName={rightFbx.animations[0] ? "right" : null}
      weaponNode={weaponNode}
    />
  );
}

// Nhánh 2: Nạp 1 file .glb / .gltf (chứa sẵn Idle/Shoot_Stand + Strafe_Left/Right + Death bên trong)
function PlayerGlbModel({ weaponNode }: { weaponNode: ReactNode }) {
  const gltf = useGLTF(GLB_URL);

  const { clips, idleName, leftName, rightName, deathName } = useMemo(() => {
    const prepared = gltf.animations.map((clip) => prepareAnimationClip(clip, clip.name));
    const names = prepared.map((c) => c.name);
    const idle = names.find((n) => /idle|stand|breath/i.test(n)) || names[0] || null;
    const left =
      names.find((n) => /left/i.test(n)) ||
      names.find((n) => /strafe|run|walk|move/i.test(n)) ||
      idle;
    const right =
      names.find((n) => /right/i.test(n)) ||
      names.find((n) => /strafe|run|walk|move/i.test(n)) ||
      left;
    const death = names.find((n) => /death|dead|die/i.test(n)) || null;
    return { clips: prepared, idleName: idle, leftName: left, rightName: right, deathName: death };
  }, [gltf.animations]);

  return (
    <RiggedModelRunner
      sourceScene={gltf.scene}
      clips={clips}
      idleClipName={idleName}
      leftClipName={leftName}
      rightClipName={rightName}
      deathClipName={deathName}
      weaponNode={weaponNode}
    />
  );
}

function PlayerModelSwitch({ weaponNode }: { weaponNode: ReactNode }) {
  if (PLAYER_MODEL_CONFIG.format === "fbx") {
    return <PlayerMixamoFbxModel weaponNode={weaponNode} />;
  }
  return <PlayerGlbModel weaponNode={weaponNode} />;
}

export const PlayerUnit = forwardRef<THREE.Group, PlayerUnitProps>(
  function PlayerUnit({ weapon, muzzleFlashRef }, ref) {
    const gameStatus = useGameStore((s) => s.gameStatus);
    const rage = useGameStore((s) => s.rage);
    const rageReady = useGameStore((s) => s.rageReady);
    const rageActive = useGameStore((s) => s.rageActive);
    const rageTimeLeft = useGameStore((s) => s.rageTimeLeft);
    const activeRageWeaponId = useGameStore((s) => s.activeRageWeaponId);
    const icbmAiming = useGameStore((s) => s.icbmAiming);
    const icbmPending = useGameStore((s) => s.icbmPending);
    const clones = useGameStore((s) => s.activeBuffs.clones);
    const shieldCharges = useGameStore((s) => s.activeBuffs.shieldCharges);
    const trans = useTransClientSide();
    const readySkillName = getArmoryWeaponById(weapon.id)?.rageSkillName ?? weapon.name;
    const ragingSkillName =
      getArmoryWeaponById(activeRageWeaponId ?? weapon.id)?.rageSkillName ?? readySkillName;

    const flashMeshRef = useRef<THREE.Mesh>(null);
    const rageRingRef = useRef<THREE.Mesh>(null);
    const rageReadyGlowRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
      if (muzzleFlashRef.current > 0) {
        muzzleFlashRef.current = Math.max(0, muzzleFlashRef.current - delta);
      }
      if (flashMeshRef.current) {
        const isHeavyWeapon = weapon.modelKind === "cannon" || weapon.modelKind === "icbm";
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

    const weaponNode = (
      <>
        <WeaponModel3D weapon={weapon} spinBarrels={rageActive || weapon.modelKind === "machine-gun"} />
        <mesh ref={flashMeshRef} position={[0, 0.06, -1.15]} visible={false}>
          <sphereGeometry args={[0.28, 10, 10]} />
          <meshBasicMaterial color={activeAccent} transparent opacity={0.9} />
        </mesh>
      </>
    );

    const fallbackWithWeapon = (
      <>
        <FallbackRobotMesh activeAccent={activeAccent} />
        <group position={[0.45, 0.78, -0.58]} scale={0.75}>
          {weaponNode}
        </group>
      </>
    );

    return (
      <group ref={ref} position={[ARENA_CONFIG.playerStartX, 0, ARENA_CONFIG.playerZ]}>
        {/* Vòng sáng dưới chân nhân vật */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 0.98, 24]} />
          <meshBasicMaterial color={activeAccent} transparent opacity={0.85} />
        </mesh>

        {/* Vòng hào quang khi Nộ đầy hoặc đang xả Mưa Đạn */}
        <mesh
          ref={rageRingRef}
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[1.08, 1.38, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} />
        </mesh>

        {/* Khiên bảo vệ [SHIELD] hấp thụ đòn đánh */}
        {shieldCharges > 0 && (
          <group position={[0, 0.9, 0]}>
            <mesh>
              <sphereGeometry args={[1.18, 20, 14]} />
              <meshBasicMaterial
                color="#7dd3fc"
                transparent
                opacity={0.14}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.18, 0.035, 8, 32]} />
              <meshBasicMaterial color="#bae6fd" transparent opacity={0.8} />
            </mesh>
          </group>
        )}

        {/* Bản sao [x2 CLONE] dùng đúng model nhân vật 3D thật cầm súng đang trang bị */}
        {[-1.25, 1.25].slice(0, clones).map((offsetX) => {
          const cloneWeaponNode = (
            <WeaponModel3D
              weapon={weapon}
              spinBarrels={rageActive || weapon.modelKind === "machine-gun"}
            />
          );
          const cloneFallback = (
            <>
              <FallbackRobotMesh activeAccent={activeAccent} />
              <group position={[0.45, 0.78, -0.58]} scale={0.75}>
                {cloneWeaponNode}
              </group>
            </>
          );
          return (
            <group key={offsetX} position={[offsetX, 0, 0.25]} scale={0.84}>
              <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.58, 0.82, 24]} />
                <meshBasicMaterial color="#06b6d4" transparent opacity={0.78} />
              </mesh>
              <ModelErrorBoundary fallback={cloneFallback}>
                <Suspense fallback={cloneFallback}>
                  <PlayerModelSwitch weaponNode={cloneWeaponNode} />
                </Suspense>
              </ModelErrorBoundary>
            </group>
          );
        })}

        {/* Mô hình nhân vật 3D từ /public/models/ (súng gắn trực tiếp vào xương bàn tay phải) */}
        <ModelErrorBoundary fallback={fallbackWithWeapon}>
          <Suspense fallback={fallbackWithWeapon}>
            <PlayerModelSwitch weaponNode={weaponNode} />
          </Suspense>
        </ModelErrorBoundary>

        {/* Thanh Nộ 3D đặt ngay trên đầu nhân vật */}
        <group position={[0, 1.95, 0]}>
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

        {/* Nhãn trạng thái Nộ trên đầu nhân vật (chỉ hiện khi đang chơi, luôn nằm dưới HUD) */}
        {gameStatus === "PLAYING" && (
          <WorldHtml
            center
            position={[0, 2.38, 0]}
            distanceFactor={16}
            zIndexRange={[1, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div className="select-none whitespace-nowrap text-center">
              {icbmAiming ? (
                <span className="animate-pulse rounded-full border border-rose-300 bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white shadow-lg">
                  {trans.hud.rageAimingFull}
                </span>
              ) : icbmPending ? (
                <span className="rounded-full border border-amber-300 bg-orange-950/90 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow">
                  {trans.hud.rageMissileFlyingUpper}
                </span>
              ) : rageActive ? (
                <span className="rounded-full border border-amber-300/80 bg-amber-950/90 px-2 py-0.5 text-[10px] font-black text-amber-300 shadow">
                  {formatText(trans.hud.rageSkillActiveUpper, {
                    skill: ragingSkillName,
                    time: rageTimeLeft.toFixed(1),
                  })}
                </span>
              ) : rageReady ? (
                <span className="animate-pulse rounded-full border border-yellow-300 bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-lg">
                  {weapon.id === "icbm"
                    ? trans.hud.rageReadyIcbm
                    : formatText(trans.hud.rageSkillButton, { skill: readySkillName })}
                </span>
              ) : (
                <span className="rounded bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                  {formatText(trans.hud.ragePercentUpper, { pct: ragePercent })}
                </span>
              )}
            </div>
          </WorldHtml>
        )}
      </group>
    );
  }
);

if (PLAYER_MODEL_CONFIG.format === "fbx") {
  useFBX.preload(FBX_URLS.idle);
  useFBX.preload(FBX_URLS.left);
  useFBX.preload(FBX_URLS.right);
} else {
  useGLTF.preload(GLB_URL);
}
