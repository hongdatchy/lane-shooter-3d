"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BulletEntity,
  EnemyEntity,
  EnemyKind,
  EnemyProjectileEntity,
  EnemyVisualKind,
  GameRuntimeRef,
  OrbitalStrikePendingDTO,
  ParticleEntity,
} from "@/dto/GameDTO";
import { useGameStore } from "@/state-manager/game-store";
import { weaponService } from "@/service/weapon-service";
import { ARENA_CONFIG, ICBM_CONFIG, RAGE_CONFIG } from "@/service/game-constants";
import { getRageSkillSpec } from "@/service/rage-catalog";
import { gameInput } from "@/service/game-input";
import { soundService } from "@/service/sound-service";
import { PlayerUnit } from "./PlayerUnit";
import { WeaponCrate } from "./WeaponCrate";
import { EnemyModelUnit, EnemyModelUnitHandle } from "./EnemyModelUnit";
import { WorldHtml } from "./WorldHtml";
import { useTransClientSide } from "@/lang/useTransClientSide";

interface ArenaWorldProps {
  runtimeRef: React.MutableRefObject<GameRuntimeRef>;
}

const MAX_ENEMIES = 50;
const BOSS_POOL_START = 48;
const BOSS_POOL_END = MAX_ENEMIES;
const MAX_ACTIVE_ON_SCREEN = 10;

interface ChapterPoolSlots {
  getSlotKind: (idx: number) => EnemyKind;
  getVisualKind: (idx: number) => EnemyVisualKind;
  getRange: (kind: EnemyKind) => readonly [number, number];
}

function getChapterPoolSlots(chapterId: number): ChapterPoolSlots {
  if (chapterId === 3) {
    return {
      getSlotKind(idx: number): EnemyKind {
        if (idx >= BOSS_POOL_START) return "BOSS";
        if (idx >= 32) return "BLOATER";
        if (idx >= 16) return "DASHER";
        return "SHELL_BRUTE";
      },
      getVisualKind(idx: number): EnemyVisualKind {
        if (idx >= BOSS_POOL_START) return "BOSS_STAGE3";
        if (idx >= 32) return "BLOATER";
        if (idx >= 16) return "DASHER";
        return "SHELL_BRUTE";
      },
      getRange(kind: EnemyKind): readonly [number, number] {
        switch (kind) {
          case "BOSS":
            return [BOSS_POOL_START, BOSS_POOL_END];
          case "BLOATER":
            return [32, 48];
          case "DASHER":
            return [16, 32];
          default:
            return [0, 16];
        }
      },
    };
  }

  if (chapterId === 2) {
    return {
      getSlotKind(idx: number): EnemyKind {
        if (idx >= BOSS_POOL_START) return "BOSS";
        if (idx >= 36) return "SHELL_BRUTE";
        if (idx >= 24) return "SKYWING";
        if (idx >= 12) return "ELITE";
        return "NORMAL";
      },
      getVisualKind(idx: number): EnemyVisualKind {
        if (idx >= BOSS_POOL_START) return "BOSS_STAGE2";
        if (idx >= 36) return "SHELL_BRUTE";
        if (idx >= 24) return "SKYWING";
        if (idx >= 12) return "HUSK";
        return "CRAWLER";
      },
      getRange(kind: EnemyKind): readonly [number, number] {
        switch (kind) {
          case "BOSS":
            return [BOSS_POOL_START, BOSS_POOL_END];
          case "SHELL_BRUTE":
            return [36, 48];
          case "SKYWING":
            return [24, 36];
          case "ELITE":
            return [12, 24];
          default:
            return [0, 12];
        }
      },
    };
  }

  return {
    getSlotKind(idx: number): EnemyKind {
      if (idx >= BOSS_POOL_START) return "BOSS";
      if (idx >= 24) return "ELITE";
      return "NORMAL";
    },
    getVisualKind(idx: number): EnemyVisualKind {
      if (idx >= BOSS_POOL_START) return "BOSS_STAGE1";
      if (idx >= 24) return "HUSK";
      return "CRAWLER";
    },
    getRange(kind: EnemyKind): readonly [number, number] {
      switch (kind) {
        case "BOSS":
          return [BOSS_POOL_START, BOSS_POOL_END];
        case "ELITE":
          return [24, 48];
        default:
          return [0, 24];
      }
    },
  };
}
const MAX_BULLETS = 600;
const MAX_PARTICLES = 300;
const MAX_ENEMY_PROJECTILES = 48;
const MAX_PROXIMITY_MINES = 20;
const MAX_ACTIVE_STRIKES = 3;
const MAX_FALLOUT_ZONES = 3;
const STRIKE_INDICES = [0, 1, 2];
const FALLOUT_INDICES = [0, 1, 2];
const POISON_CAST_DURATION = 0.9;
const BOSS1_SHOOT_DURATION = 1.8;
const BOSS3_SHOOT_DURATION = 3.2;
const POISON_INTERVAL_MIN = 2.8;
const POISON_INTERVAL_MAX = 3.6;
const POISON_PROJECTILE_SPEED = 11.5;

const ENEMY_DEATH_DURATION: Record<EnemyKind, number> = {
  NORMAL: 1.4,
  ELITE: 1.4,
  SKYWING: 1.5,
  SHELL_BRUTE: 1.5,
  DASHER: 1.75,
  BLOATER: 1.5,
  BOSS: 2.5,
};

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

export function ArenaWorld({ runtimeRef }: ArenaWorldProps) {
  const combatLoadoutIds = useGameStore((s) => s.combatLoadoutIds);
  const activeLoadoutSlot = useGameStore((s) => s.activeLoadoutSlot);
  const weaponLevels = useGameStore((s) => s.saveData.weaponLevels);
  const activeChapter = useGameStore((s) => s.activeChapter);
  const sessionId = useGameStore((s) => s.sessionId);
  const icbmAiming = useGameStore((s) => s.icbmAiming);
  const aimingWeaponId = useGameStore((s) => s.aimingWeaponId);
  const activeRageWeaponId = useGameStore((s) =>
    s.rageActive ? s.activeRageWeaponId : null
  );
  const turretActive = useGameStore((s) => s.activeBuffs.turretTimeLeft > 0);
  const freezeActive = useGameStore((s) => s.activeBuffs.freezeTimeLeft > 0);
  const trans = useTransClientSide();

  const activeWeaponId =
    combatLoadoutIds[activeLoadoutSlot] ?? combatLoadoutIds[0] ?? "pistol";
  const activeWeapon = weaponService.resolveCombatWeapon(
    activeWeaponId,
    weaponLevels[activeWeaponId] ?? 1
  );

  const playerGroupRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef(0);
  const fireCooldownRef = useRef(0);
  const shotCounterRef = useRef(0);
  const spawnTimerRef = useRef(0.5);
  const enemyIdSeqRef = useRef(1);
  const bossSpawnedStageRef = useRef(0);
  const rageBufferRef = useRef(0);
  const rageUiSyncRef = useRef(0);
  const buffUiSyncRef = useRef(0);
  const turretCooldownRef = useRef(0);
  const turretHeadRef = useRef<THREE.Group>(null);

  const aimMarkerRef = useRef<THREE.Group>(null);
  const aimPosRef = useRef<{ x: number; z: number }>({
    x: ARENA_CONFIG.playerStartX,
    z: -8,
  });
  const bossBiteRef = useRef<{
    active: boolean;
    enemyIndex: number;
    elapsed: number;
    hasChomped: boolean;
    startX: number;
    startZ: number;
  }>({
    active: false,
    enemyIndex: -1,
    elapsed: 0,
    hasChomped: false,
    startX: 0,
    startZ: 0,
  });

  const bulletInstancedRef = useRef<THREE.InstancedMesh>(null);
  const particleInstancedRef = useRef<THREE.InstancedMesh>(null);
  const enemyProjectileInstancedRef = useRef<THREE.InstancedMesh>(null);
  const mineInstancedRef = useRef<THREE.InstancedMesh>(null);
  const laserBeamGroupRef = useRef<THREE.Group>(null);
  const vortexMeshRef = useRef<THREE.Group>(null);
  const falloutMeshRefs = useRef<(THREE.Group | null)[]>([]);
  const strikeGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const strikeTargetRefs = useRef<(THREE.Group | null)[]>([]);
  const strikeRocketRefs = useRef<(THREE.Group | null)[]>([]);
  const strikeLockRingRefs = useRef<(THREE.Mesh | null)[]>([]);
  const strikeCountdownRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const lastRageTriggerSeqRef = useRef(0);
  const lastStrikeBatchSeqRef = useRef(-1);
  const activeRageWeaponStartedRef = useRef<string | null>(null);
  const rocketSwarmRef = useRef({ remaining: 0, timer: 0, damage: 120 });
  const laserTickRef = useRef(0);
  const vortexTickRef = useRef(0);
  const activeStrikesRef = useRef<
    Array<OrbitalStrikePendingDTO & { elapsed: number; impacted: boolean }>
  >([]);
  const proximityMinesPoolRef = useRef<
    Array<{ active: boolean; x: number; z: number; damage: number; radius: number }>
  >(
    Array.from({ length: MAX_PROXIMITY_MINES }, () => ({
      active: false,
      x: 0,
      z: 0,
      damage: 80,
      radius: 3.2,
    }))
  );
  const falloutZonesRef = useRef<
    Array<{
      active: boolean;
      x: number;
      z: number;
      radius: number;
      timeLeft: number;
      tickTimer: number;
      damage: number;
    }>
  >(
    Array.from({ length: MAX_FALLOUT_ZONES }, () => ({
      active: false,
      x: 0,
      z: 0,
      radius: 12,
      timeLeft: 0,
      tickTimer: 0,
      damage: 45,
    }))
  );

  // Pool dữ liệu game chạy ở 60fps (tránh setState liên tục)
  const enemiesPoolRef = useRef<EnemyEntity[]>(
    Array.from({ length: MAX_ENEMIES }, (_, i) => ({
      active: false,
      dying: false,
      deathTimer: 0,
      deathDuration: 0,
      stunTimer: 0,
      acidTimer: 0,
      armorBroken: false,
      shellArmorHp: 0,
      enraged: false,
      attackCooldown: 3.0,
      castTimer: 0,
      castFired: false,
      id: i,
      kind: "NORMAL",
      x: 0,
      z: 0,
      speed: 3.4,
      hp: 2,
      maxHp: 2,
      scale: 0.85,
      radius: 0.5,
      hitFlash: 0,
      phase: 0,
      knockbackVx: 0,
      knockbackVz: 0,
    }))
  );

  const bulletsPoolRef = useRef<BulletEntity[]>(
    Array.from({ length: MAX_BULLETS }, () => ({
      active: false,
      x: 0,
      y: 0.74,
      z: 0,
      vx: 0,
      vz: 0,
      damage: 1,
      splashRadius: 0,
      size: [0.16, 0.16, 0.65],
      color: "#38bdf8",
      pierceRemaining: 0,
      ricochetRemaining: 0,
      lastHitEnemyId: -1,
      secondLastHitEnemyId: -1,
      fromRage: false,
      homing: false,
    }))
  );

  const particlesPoolRef = useRef<ParticleEntity[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.4,
      size: 0.15,
      color: "#ffffff",
    }))
  );

  const enemyProjectilesPoolRef = useRef<EnemyProjectileEntity[]>(
    Array.from({ length: MAX_ENEMY_PROJECTILES }, () => ({
      active: false,
      x: 0,
      y: 1.0,
      z: 0,
      vx: 0,
      vz: 0,
      radius: 0.34,
      damage: 1,
      color: "#84cc16",
    }))
  );

  // Refs tới các mesh quái được render sẵn trong pool
  const enemySlotRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyUnitRefs = useRef<(EnemyModelUnitHandle | null)[]>([]);
  const enemyHpGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyBodyRefs = useRef<(THREE.Mesh | null)[]>([]);
  const enemyCrownRefs = useRef<(THREE.Mesh | null)[]>([]);
  const enemyUpperMouthRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyLowerJawRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyHpFillRefs = useRef<(THREE.Mesh | null)[]>([]);

  const enemyIndices = useMemo(() => Array.from({ length: MAX_ENEMIES }, (_, i) => i), []);
  const chapterSlots = useMemo(() => getChapterPoolSlots(activeChapter), [activeChapter]);

  // Reset toàn bộ pool khi bắt đầu ván mới
  useEffect(() => {
    runtimeRef.current.playerX = ARENA_CONFIG.playerStartX;
    runtimeRef.current.playerVelocityX = 0;
    runtimeRef.current.cratePulse = 0;
    runtimeRef.current.screenShake = 0;

    fireCooldownRef.current = 0;
    shotCounterRef.current = 0;
    spawnTimerRef.current = 0.45;
    bossSpawnedStageRef.current = 0;
    rageBufferRef.current = 0;
    rageUiSyncRef.current = 0;
    buffUiSyncRef.current = 0;
    turretCooldownRef.current = 0;
    lastRageTriggerSeqRef.current = 0;
    lastStrikeBatchSeqRef.current = -1;
    activeRageWeaponStartedRef.current = null;
    rocketSwarmRef.current = { remaining: 0, timer: 0, damage: 120 };
    laserTickRef.current = 0;
    vortexTickRef.current = 0;
    activeStrikesRef.current = [];
    for (const grp of strikeGroupRefs.current) {
      if (grp) grp.visible = false;
    }
    for (const m of proximityMinesPoolRef.current) {
      m.active = false;
    }
    for (const f of falloutZonesRef.current) {
      f.active = false;
      f.timeLeft = 0;
    }
    bossBiteRef.current = {
      active: false,
      enemyIndex: -1,
      elapsed: 0,
      hasChomped: false,
      startX: 0,
      startZ: 0,
    };

    enemiesPoolRef.current.forEach((enemy, idx) => {
      enemy.active = false;
      enemy.dying = false;
      enemy.deathTimer = 0;
      enemy.deathDuration = 0;
      enemy.stunTimer = 0;
      enemy.acidTimer = 0;
      enemy.armorBroken = false;
      enemy.shellArmorHp = 0;
      enemy.enraged = false;
      enemy.castTimer = 0;
      enemy.castFired = false;
      enemyUnitRefs.current[idx]?.setMode("IDLE");
    });
    for (const bullet of bulletsPoolRef.current) {
      bullet.active = false;
    }
    for (const particle of particlesPoolRef.current) {
      particle.active = false;
    }
    for (const proj of enemyProjectilesPoolRef.current) {
      proj.active = false;
    }
    if (playerGroupRef.current) {
      playerGroupRef.current.position.set(ARENA_CONFIG.playerStartX, 0, ARENA_CONFIG.playerZ);
      playerGroupRef.current.rotation.set(0, 0, 0);
    }
  }, [sessionId, activeChapter, runtimeRef]);

  // Đổi súng trong trận kiểu Alien Shooter: súng mới sẵn sàng nhả đạn ngay lập tức
  useEffect(() => {
    fireCooldownRef.current = Math.min(fireCooldownRef.current, 0.03);
  }, [activeLoadoutSlot]);

  const spawnParticles = (
    x: number,
    y: number,
    z: number,
    color: string,
    count: number,
    speedMultiplier = 1
  ) => {
    const pool = particlesPoolRef.current;
    let spawned = 0;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      const p = pool[i];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.2 + Math.random() * 4.5) * speedMultiplier;
      p.vx = Math.cos(angle) * speed;
      p.vy = (2.5 + Math.random() * 4.5) * speedMultiplier;
      p.vz = Math.sin(angle) * speed;
      p.maxLife = 0.28 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.size = 0.14 + Math.random() * 0.16;
      p.color = color;
      spawned++;
    }
  };

  const spawnBullet = (
    x: number,
    z: number,
    vx: number,
    vz: number,
    damage: number,
    splashRadius: number,
    size: [number, number, number],
    color: string,
    modifiers?: {
      pierceRemaining?: number;
      ricochetRemaining?: number;
      fromRage?: boolean;
      homing?: boolean;
    }
  ) => {
    const pool = bulletsPoolRef.current;
    for (let i = 0; i < pool.length; i++) {
      const b = pool[i];
      if (b.active) continue;
      b.active = true;
      b.x = x;
      b.y = 0.74;
      b.z = z;
      b.vx = vx;
      b.vz = vz;
      b.damage = damage;
      b.splashRadius = splashRadius;
      b.size = size;
      b.color = color;
      b.pierceRemaining = modifiers?.pierceRemaining ?? 0;
      b.ricochetRemaining = modifiers?.ricochetRemaining ?? 0;
      b.lastHitEnemyId = -1;
      b.secondLastHitEnemyId = -1;
      b.fromRage = Boolean(modifiers?.fromRage);
      b.homing = Boolean(modifiers?.homing);
      return;
    }
  };

  const spawnEnemyProjectile = (
    x: number,
    y: number,
    z: number,
    targetX: number,
    targetZ: number,
    speed: number,
    color = "#84cc16"
  ) => {
    const pool = enemyProjectilesPoolRef.current;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (p.active) continue;
      const dx = targetX - x;
      const dz = targetZ - z;
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = (dx / dist) * speed;
      p.vz = (dz / dist) * speed;
      p.radius = 0.34;
      p.damage = 1;
      p.color = color;
      return;
    }
  };

  const killEnemy = (
    poolIndex: number,
    enemy: EnemyEntity,
    options: { grantRage: boolean; particleCount?: number }
  ): void => {
    if (enemy.dying) return;
    const isBoss = enemy.kind === "BOSS";
    const isBloater = enemy.kind === "BLOATER";
    const duration = ENEMY_DEATH_DURATION[enemy.kind];
    enemy.hp = 0;
    enemy.dying = true;
    enemy.castTimer = 0;
    enemy.deathTimer = 0;
    enemy.deathDuration = duration;
    enemy.hitFlash = 0.14;

    enemyUnitRefs.current[poolIndex]?.setMode("DEATH", duration);

    const deathColor = isBoss
      ? "#facc15"
      : enemy.kind === "ELITE"
        ? "#c084fc"
        : enemy.kind === "SKYWING" || enemy.kind === "DASHER"
          ? "#38bdf8"
          : enemy.kind === "SHELL_BRUTE"
            ? "#fb923c"
            : isBloater
              ? "#f97316"
              : "#fb7185";
    const defaultParticles = isBoss
      ? 48
      : isBloater
        ? 28
        : enemy.kind === "ELITE" || enemy.kind === "SHELL_BRUTE"
          ? 16
          : 14;
    spawnParticles(
      enemy.x,
      enemy.kind === "SKYWING" ? 1.2 : 0.85 * enemy.scale,
      enemy.z,
      deathColor,
      options.particleCount ?? defaultParticles,
      isBoss ? 2.0 : isBloater ? 1.65 : 1.3
    );
    soundService.play(isBoss ? "killBoss" : isBloater ? "cannonExplosion" : "killEnemy");

    if (options.grantRage && !isBoss) {
      const isHeavyKind =
        enemy.kind === "ELITE" || enemy.kind === "SHELL_BRUTE" || isBloater;
      const killGain = isHeavyKind
        ? RAGE_CONFIG.gainPerEliteKill
        : RAGE_CONFIG.gainPerNormalKill;
      rageBufferRef.current += killGain * RAGE_CONFIG.gainMultiplier;
    }

    const activeCh = useGameStore.getState().activeChapter;
    const scorePts = isBoss
      ? activeCh === 3
        ? 1400
        : activeCh === 2
          ? 900
          : 500
      : enemy.kind === "ELITE" || enemy.kind === "SHELL_BRUTE"
        ? 30
        : isBloater
          ? 20
          : enemy.kind === "SKYWING" || enemy.kind === "DASHER"
            ? 15
            : 10;
    useGameStore.getState().registerEnemyKill(scorePts);

    // Quái #6 (Bloater): Khi chết phát nổ bán kính 2m gây sát thương xung quanh & người chơi nếu đứng sát
    if (isBloater) {
      const blastRadius = 2.0;
      const blastSq = blastRadius * blastRadius;
      runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.25);
      const enemies = enemiesPoolRef.current;
      for (let m = 0; m < enemies.length; m++) {
        if (m === poolIndex) continue;
        const other = enemies[m];
        if (!other.active || other.dying) continue;
        const dx = other.x - enemy.x;
        const dz = other.z - enemy.z;
        if (dx * dx + dz * dz <= blastSq) {
          applyEnemyDamage(m, other, 10, false, 8);
        }
      }
      const pdx = runtimeRef.current.playerX - enemy.x;
      const pdz = ARENA_CONFIG.playerZ - enemy.z;
      if (pdx * pdx + pdz * pdz <= blastSq) {
        useGameStore.getState().damagePlayer(1);
      }
    }
  };

  // Gây sát thương có tính mai giáp (Shell Brute giảm 60% trước khi vỡ mai) & giảm giáp EMP Tesla
  const applyEnemyDamage = (
    enemyIdx: number,
    enemy: EnemyEntity,
    rawDamage: number,
    grantRage: boolean,
    particleCount?: number
  ): void => {
    if (!enemy.active || enemy.dying) return;
    if (enemy.kind === "SHELL_BRUTE" && enemy.shellArmorHp > 0 && !enemy.armorBroken) {
      enemy.hp -= rawDamage * 0.4;
      enemy.shellArmorHp -= rawDamage;
      enemy.hitFlash = Math.max(enemy.hitFlash, 0.1);
      spawnParticles(enemy.x, 0.85 * enemy.scale, enemy.z + 0.35, "#94a3b8", 2, 0.6);
      if (enemy.shellArmorHp <= 0) {
        enemy.shellArmorHp = 0;
        enemy.armorBroken = true;
        enemy.stunTimer = Math.max(enemy.stunTimer, 0.7);
        enemyUnitRefs.current[enemyIdx]?.setMode("ARMOR_BREAK", 1.1);
        spawnParticles(enemy.x, 1.0 * enemy.scale, enemy.z + 0.3, "#fbbf24", 16, 1.4);
        soundService.play("hitCrate");
      }
    } else {
      const mult = enemy.armorBroken ? 1.5 : 1;
      enemy.hp -= rawDamage * mult;
      enemy.hitFlash = Math.max(enemy.hitFlash, 0.12);
    }
    if (enemy.hp <= 0) {
      killEnemy(enemyIdx, enemy, { grantRage, particleCount });
    }
  };

  const spawnEnemy = (stage: number, zOffset = 0) => {
    const pool = enemiesPoolRef.current;
    const store = useGameStore.getState();
    const stageCfg = weaponService.getStageConfig(stage, store.activeChapter);
    const slots = getChapterPoolSlots(store.activeChapter);

    if (stageCfg.isBossStage) {
      for (let i = BOSS_POOL_START; i < BOSS_POOL_END; i++) {
        const e = pool[i];
        if (e.active) continue;
        e.active = true;
        e.dying = false;
        e.deathTimer = 0;
        e.deathDuration = 0;
        e.stunTimer = 0;
        e.acidTimer = 0;
        e.armorBroken = false;
        e.shellArmorHp = 0;
        e.enraged = false;
        e.attackCooldown =
          store.activeChapter === 3 ? 1.6 : store.activeChapter === 2 ? 2.6 : 0.65;
        e.castTimer = 0;
        e.castFired = false;
        e.id = enemyIdSeqRef.current++;
        e.kind = "BOSS";
        e.x = (ARENA_CONFIG.leftLaneMinX + ARENA_CONFIG.leftLaneMaxX) / 2;
        e.z = ARENA_CONFIG.spawnZ;
        e.speed = stageCfg.eliteSpeed;
        e.maxHp = stageCfg.eliteHp;
        e.hp = e.maxHp;
        e.scale = stageCfg.eliteScale;
        e.radius = 0.52 * e.scale;
        e.hitFlash = 0;
        e.phase = 0;
        e.knockbackVx = 0;
        e.knockbackVz = 0;
        enemyUnitRefs.current[i]?.setMode("WALK");
        runtimeRef.current.screenShake = 0.55;
        return;
      }
      return;
    }

    let chosenKind: EnemyKind = Math.random() < stageCfg.eliteChance ? "ELITE" : "NORMAL";
    let customHp: number | undefined;
    let customSpeed: number | undefined;
    let customScale: number | undefined;

    if (stageCfg.spawnPool && stageCfg.spawnPool.length > 0) {
      const totalWeight = stageCfg.spawnPool.reduce((acc, item) => acc + item.weight, 0);
      let roll = Math.random() * Math.max(0.001, totalWeight);
      let picked = stageCfg.spawnPool[0];
      for (const item of stageCfg.spawnPool) {
        roll -= item.weight;
        if (roll <= 0) {
          picked = item;
          break;
        }
      }
      chosenKind = picked.kind;
      customHp = picked.hp;
      customSpeed = picked.speed;
      customScale = picked.scale;
    }

    const [rangeStart, rangeEnd] = slots.getRange(chosenKind);
    const isEliteLike = chosenKind === "ELITE" || chosenKind === "SHELL_BRUTE";

    for (let i = rangeStart; i < rangeEnd; i++) {
      const e = pool[i];
      if (e.active) continue;

      const baseScale =
        customScale ?? (isEliteLike ? stageCfg.eliteScale : stageCfg.normalScale);
      // Quái to ngẫu nhiên hơn nữa (0.88x -> 1.25x): con nào càng to thì máu càng trâu
      const sizeFactor = isEliteLike
        ? 0.95 + Math.random() * 0.28
        : 0.88 + Math.random() * 0.24;
      const finalScale = baseScale * sizeFactor;

      const baseHp = customHp ?? (isEliteLike ? stageCfg.eliteHp : stageCfg.normalHp);
      const scaledHp = Math.max(1, Math.round(baseHp * Math.pow(sizeFactor, 1.75)));

      const baseSpeed =
        customSpeed ?? (isEliteLike ? stageCfg.eliteSpeed : stageCfg.normalSpeed);
      const speedJitter = (0.94 + Math.random() * 0.14) / Math.pow(sizeFactor, 0.35);

      const margin = Math.min(1.6, 0.55 * finalScale);
      const minX = ARENA_CONFIG.leftLaneMinX + margin;
      const maxX = ARENA_CONFIG.leftLaneMaxX - margin;

      e.active = true;
      e.dying = false;
      e.deathTimer = 0;
      e.deathDuration = 0;
      e.stunTimer = 0;
      e.acidTimer = 0;
      e.armorBroken = false;
      e.shellArmorHp =
        chosenKind === "SHELL_BRUTE" ? Math.min(20, Math.round(scaledHp * 0.55)) : 0;
      e.enraged = false;
      e.attackCooldown = chosenKind === "ELITE" ? 1.5 + Math.random() * 1.4 : 999;
      e.castTimer = 0;
      e.castFired = false;
      e.id = enemyIdSeqRef.current++;
      e.kind = chosenKind;
      e.x = minX + Math.random() * Math.max(0.5, maxX - minX);
      e.z = ARENA_CONFIG.spawnZ - zOffset;
      e.speed = baseSpeed * speedJitter;
      e.maxHp = scaledHp;
      e.hp = e.maxHp;
      e.scale = finalScale;
      e.radius = 0.52 * finalScale;
      e.hitFlash = 0;
      e.phase = Math.random() * Math.PI * 2;
      e.knockbackVx = 0;
      e.knockbackVz = 0;
      enemyUnitRefs.current[i]?.setMode("WALK");
      return;
    }
  };

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useGameStore.getState();

    // Giảm rung camera dần theo thời gian
    if (runtimeRef.current.screenShake > 0) {
      runtimeRef.current.screenShake = Math.max(0, runtimeRef.current.screenShake - delta * 2.5);
    }

    // 1. Điều khiển di chuyển ngang (chỉ khi đang PLAYING)
    if (store.gameStatus === "PLAYING" && bossBiteRef.current.active) {
      // Boss chạm người chơi: lao tới há hàm cắn 1 phát rồi mới chuyển sang Thất bại
      const bite = bossBiteRef.current;
      const boss = enemiesPoolRef.current[bite.enemyIndex];
      if (!boss || !boss.active || boss.dying) {
        bite.active = false;
        store.damagePlayer(store.hp);
      } else {
        bite.elapsed += delta;
        const totalDuration = 0.95;
        const chompTime = 0.42;
        const targetX = runtimeRef.current.playerX;
        const targetZ = ARENA_CONFIG.playerZ - 0.48 * boss.scale;
        const lungeT = Math.min(1, bite.elapsed / 0.34);
        boss.x = THREE.MathUtils.lerp(bite.startX, targetX, lungeT);
        boss.z = THREE.MathUtils.lerp(bite.startZ, targetZ, lungeT);

        if (bite.elapsed >= chompTime && !bite.hasChomped) {
          bite.hasChomped = true;
          soundService.play("bossBite");
          runtimeRef.current.screenShake = 1.25;
          spawnParticles(runtimeRef.current.playerX, 0.95, ARENA_CONFIG.playerZ, "#ef4444", 38, 1.85);
          spawnParticles(runtimeRef.current.playerX, 1.05, ARENA_CONFIG.playerZ, "#fde047", 16, 1.4);
          if (playerGroupRef.current) {
            playerGroupRef.current.position.y = -0.18;
            playerGroupRef.current.rotation.x = -0.38;
          }
        }

        if (bite.elapsed >= totalDuration) {
          bite.active = false;
          useGameStore.getState().damagePlayer(useGameStore.getState().hp);
        }
      }
    } else if (store.gameStatus === "PLAYING") {
      const moveDir = (gameInput.right ? 1 : 0) - (gameInput.left ? 1 : 0);
      const targetVx = moveDir * ARENA_CONFIG.playerSpeed;
      runtimeRef.current.playerVelocityX = THREE.MathUtils.lerp(
        runtimeRef.current.playerVelocityX,
        targetVx,
        1 - Math.exp(-16 * delta)
      );
      runtimeRef.current.playerX = THREE.MathUtils.clamp(
        runtimeRef.current.playerX + runtimeRef.current.playerVelocityX * delta,
        ARENA_CONFIG.playerMinX,
        ARENA_CONFIG.playerMaxX
      );

      if (playerGroupRef.current) {
        playerGroupRef.current.position.x = runtimeRef.current.playerX;
        // Nghiêng nhẹ thân nhân vật khi trượt ngang
        playerGroupRef.current.rotation.z = THREE.MathUtils.lerp(
          playerGroupRef.current.rotation.z,
          -moveDir * 0.14,
          1 - Math.exp(-12 * delta)
        );
      }

      // 2. Xử lý bắn đạn theo thông số vũ khí + Buff Làn Phải + trạng thái Nộ
      const buffs = store.activeBuffs;
      const magnetRageMult = buffs.magnetTimeLeft > 0 ? 1.5 : 1;
      const isRaging = store.rageActive;
      const rageWeaponId = isRaging ? store.activeRageWeaponId : null;
      const rageSpec = rageWeaponId ? getRageSkillSpec(rageWeaponId) : null;
      const isRageLocked =
        isRaging ||
        store.rageReady ||
        store.icbmAiming ||
        store.icbmPending !== null ||
        store.rageStrikesPending.length > 0;
      if (isRageLocked) {
        rageBufferRef.current = 0;
      } else if (RAGE_CONFIG.regenPerSecond > 0) {
        rageBufferRef.current +=
          RAGE_CONFIG.regenPerSecond * RAGE_CONFIG.gainMultiplier * magnetRageMult * delta;
      }
      if (isRaging) {
        rageUiSyncRef.current += delta;
        if (rageUiSyncRef.current >= 0.08) {
          store.tickRage(rageUiSyncRef.current);
          rageUiSyncRef.current = 0;
        }
      }
      if (buffs.magnetTimeLeft > 0 || buffs.freezeTimeLeft > 0 || buffs.turretTimeLeft > 0) {
        buffUiSyncRef.current += delta;
        if (buffUiSyncRef.current >= 0.1) {
          store.tickBuffTimers(buffUiSyncRef.current);
          buffUiSyncRef.current = 0;
        }
      }

      const combatId =
        store.combatLoadoutIds[store.activeLoadoutSlot] ??
        store.combatLoadoutIds[0] ??
        "pistol";
      const weapon = weaponService.resolveCombatWeapon(
        combatId,
        store.saveData.weaponLevels[combatId] ?? 1
      );
      const baseRate = weaponService.getEffectiveFireRate(weapon, store.overdriveLevel);
      const baseDamage = weaponService.getEffectiveDamage(weapon, store.overdriveLevel);

      // Phát hiện khi vừa kích hoạt Ultimate mới (đặt lại cooldown bắn + khởi tạo Swarm nếu là rocket_launcher)
      if (activeRageWeaponStartedRef.current !== rageWeaponId) {
        activeRageWeaponStartedRef.current = rageWeaponId;
        if (rageWeaponId) {
          fireCooldownRef.current = Math.min(fireCooldownRef.current, 0.02);
          laserTickRef.current = 0;
          vortexTickRef.current = 0;
          if (rageWeaponId === "rocket_launcher") {
            rocketSwarmRef.current = {
              remaining: rageSpec?.swarmTotalCount ?? 12,
              timer: 0,
              damage: Math.max(95, Math.round(baseDamage * 1.45)),
            };
          }
        }
      }

      // 2a. Kích hoạt Instant AoE Rage Skills (Shotgun / Tesla / Grenade Mines / Plasma / Photon)
      if (
        store.pendingRageTrigger &&
        store.pendingRageTrigger.seq !== lastRageTriggerSeqRef.current
      ) {
        lastRageTriggerSeqRef.current = store.pendingRageTrigger.seq;
        const trigWeaponId = store.pendingRageTrigger.weaponId;
        const trigWeapon = weaponService.resolveCombatWeapon(
          trigWeaponId,
          store.saveData.weaponLevels[trigWeaponId] ?? 1
        );
        const trigDmg = weaponService.getEffectiveDamage(trigWeapon, store.overdriveLevel);
        const enemies = enemiesPoolRef.current;
        const px = runtimeRef.current.playerX;
        const pz = ARENA_CONFIG.playerZ;

        if (trigWeaponId === "shotgun") {
          // Nova Blast: Sóng nổ xung kích 360° đẩy lùi cực mạnh quanh người chơi
          const radius = 9.0;
          const radiusSq = radius * radius;
          const blastDmg = Math.max(45, Math.round(trigDmg * 4.5));
          spawnParticles(px, 1.0, pz, "#fbbf24", 44, 2.2);
          spawnParticles(px, 1.0, pz, "#fb923c", 28, 1.8);
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.active || e.dying) continue;
            const dx = e.x - px;
            const dz = e.z - pz;
            const dSq = dx * dx + dz * dz;
            if (dSq <= radiusSq) {
              const dist = Math.max(0.1, Math.sqrt(dSq));
              const push = e.kind === "BOSS" ? 8 : 20;
              e.knockbackVx += (dx / dist) * push * 0.45;
              e.knockbackVz -= Math.abs(dz / dist) * push + 8;
              applyEnemyDamage(k, e, blastDmg, false, 10);
            }
          }
          runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.75);
          soundService.play("cannonExplosion");
        } else if (trigWeaponId === "tesla_gun") {
          // Electromagnetic Pulse (EMP): Stun 3s toàn sân + Phá 50% giáp (+50% sát thương nhận vào)
          const shockDmg = Math.max(65, Math.round(trigDmg * 3.5));
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.active || e.dying) continue;
            e.stunTimer = Math.max(e.stunTimer, e.kind === "BOSS" ? 1.5 : 3.0);
            e.armorBroken = true;
            spawnParticles(e.x, 1.0 * e.scale, e.z, "#38bdf8", 12, 1.3);
            applyEnemyDamage(k, e, shockDmg, false, 12);
          }
          runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.7);
          soundService.play("cannonExplosion");
        } else if (trigWeaponId === "grenade_launcher") {
          // Minefield: Rải 20 quả mìn cảm biến khắp làn trái
          const mineDmg = Math.max(90, Math.round(trigDmg * 3.2));
          const mines = proximityMinesPoolRef.current;
          for (let m = 0; m < MAX_PROXIMITY_MINES; m++) {
            const mx = THREE.MathUtils.lerp(
              ARENA_CONFIG.leftLaneMinX + 0.9,
              ARENA_CONFIG.dividerX - 0.9,
              Math.random()
            );
            const mz = THREE.MathUtils.lerp(-28, 3.2, Math.random());
            mines[m].active = true;
            mines[m].x = mx;
            mines[m].z = mz;
            mines[m].damage = mineDmg;
            mines[m].radius = 3.2;
            spawnParticles(mx, 0.5, mz, "#fb923c", 5, 0.8);
          }
          soundService.play("icbmLaunch");
        } else if (trigWeaponId === "plasma_rifle") {
          // Plasma Nova: Sóng plasma 8m đẩy lùi toàn bộ quái từ người chơi
          const radius = 8.0;
          const radiusSq = radius * radius;
          const novaDmg = Math.max(110, Math.round(trigDmg * 5));
          spawnParticles(px, 1.0, pz, "#22d3ee", 48, 2.3);
          spawnParticles(px, 1.1, pz, "#a855f7", 36, 1.9);
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.active || e.dying) continue;
            const dx = e.x - px;
            const dz = e.z - pz;
            const dSq = dx * dx + dz * dz;
            if (dSq <= radiusSq) {
              const dist = Math.max(0.1, Math.sqrt(dSq));
              const push = e.kind === "BOSS" ? 10 : 24;
              e.knockbackVx += (dx / dist) * push * 0.45;
              e.knockbackVz -= Math.abs(dz / dist) * push + 9;
              applyEnemyDamage(k, e, novaDmg, false, 14);
            }
          }
          runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.8);
          soundService.play("cannonExplosion");
        } else if (trigWeaponId === "photon_burst") {
          // Supernova: Vụ nổ ánh sáng 15m quét sạch toàn sân
          const centerX = (ARENA_CONFIG.leftLaneMinX + ARENA_CONFIG.dividerX) * 0.5;
          const centerZ = -10;
          const radius = 15.0;
          const radiusSq = radius * radius;
          const normDmg = Math.max(800, Math.round(trigDmg * 12));
          const bossDmg = Math.max(260, Math.round(trigDmg * 5.5));
          spawnParticles(centerX, 2.0, centerZ, "#fef08a", 90, 2.8);
          spawnParticles(centerX, 1.6, centerZ, "#ffffff", 50, 2.5);
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.active || e.dying) continue;
            const dx = e.x - centerX;
            const dz = e.z - centerZ;
            if (dx * dx + dz * dz <= radiusSq) {
              const dmg = e.kind !== "BOSS" ? normDmg : bossDmg;
              applyEnemyDamage(k, e, dmg, false, 16);
            }
          }
          runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 1.15);
          soundService.play("icbmImpact");
        }
      }

      // 2b. Cập nhật tâm ngắm & Mục tiêu bay cho AIM_TARGET (Cannon Orbital / Nuke / ICBM Armageddon)
      if (store.icbmAiming && aimMarkerRef.current) {
        aimMarkerRef.current.position.set(aimPosRef.current.x, 0.08, aimPosRef.current.z);
        aimMarkerRef.current.rotation.y = state.clock.elapsedTime * 1.4;
      }

      if (
        store.rageStrikesPending.length > 0 &&
        store.rageStrikeBatchSeq !== lastStrikeBatchSeqRef.current
      ) {
        lastStrikeBatchSeqRef.current = store.rageStrikeBatchSeq;
        activeStrikesRef.current = store.rageStrikesPending.map((s) => ({
          ...s,
          elapsed: 0,
          impacted: false,
        }));
      }

      if (activeStrikesRef.current.length > 0) {
        const strikes = activeStrikesRef.current;
        const enemies = enemiesPoolRef.current;
        let allImpacted = true;

        for (let idx = 0; idx < strikes.length; idx++) {
          const strike = strikes[idx];
          if (strike.impacted) continue;
          allImpacted = false;
          strike.elapsed += delta;
          const p = Math.min(1, strike.elapsed / Math.max(0.05, strike.delaySeconds));

          if (strike.elapsed >= strike.delaySeconds) {
            strike.impacted = true;
            const effectiveRadius = strike.radius;
            for (let j = 0; j < enemies.length; j++) {
              const e = enemies[j];
              if (!e.active || e.dying) continue;
              const dx = e.x - strike.targetX;
              const dz = e.z - strike.targetZ;
              const hitDist = effectiveRadius + e.radius;
              if (dx * dx + dz * dz <= hitDist * hitDist) {
                const dist = Math.hypot(dx, dz);
                const dirX = dist > 0.001 ? dx / dist : 0;
                const dirZ = dist > 0.001 ? dz / dist : -1;
                const falloff = 1 - Math.min(1, dist / hitDist) * 0.45;
                const pushSpeed = ICBM_CONFIG.knockbackSpeed * falloff;
                e.knockbackVx += dirX * (e.hp - strike.damage <= 0 ? pushSpeed * 0.35 : pushSpeed);
                e.knockbackVz += dirZ * (e.hp - strike.damage <= 0 ? pushSpeed * 0.35 : pushSpeed);
                applyEnemyDamage(
                  j,
                  e,
                  strike.damage,
                  false,
                  e.kind === "BOSS" ? 50 : 16
                );
              }
            }

            if (strike.kind === "nuke") {
              // Nuclear Winter: Kích hoạt vùng phóng xạ 10s
              const fZones = falloutZonesRef.current;
              const slot = fZones.find((f) => !f.active) ?? fZones[0];
              slot.active = true;
              slot.x = strike.targetX;
              slot.z = strike.targetZ;
              slot.radius = strike.radius;
              slot.timeLeft = strike.falloutSeconds ?? 10;
              slot.tickTimer = 0;
              slot.damage = Math.max(30, Math.round(baseDamage * 1.4));
              spawnParticles(strike.targetX, 1.8, strike.targetZ, "#84cc16", 75, 2.6);
              spawnParticles(strike.targetX, 2.2, strike.targetZ, "#fde047", 45, 2.2);
              soundService.play("icbmImpact");
              runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 1.25);
            } else if (strike.kind === "cannon") {
              spawnParticles(strike.targetX, 1.3, strike.targetZ, "#38bdf8", 40, 1.9);
              spawnParticles(strike.targetX, 1.6, strike.targetZ, "#fbbf24", 28, 1.6);
              soundService.play("cannonExplosion");
              runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.85);
            } else {
              spawnParticles(strike.targetX, 1.5, strike.targetZ, "#f97316", 60, 2.4);
              spawnParticles(strike.targetX, 2.0, strike.targetZ, "#fde047", 36, 2.0);
              soundService.play("icbmImpact");
              runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 1.25);
            }
          } else {
            const grp = strikeGroupRefs.current[idx];
            const tgt = strikeTargetRefs.current[idx];
            const rocket = strikeRocketRefs.current[idx];
            const ring = strikeLockRingRefs.current[idx];
            const cdEl = strikeCountdownRefs.current[idx];
            if (grp) grp.visible = true;
            if (tgt) {
              tgt.position.set(strike.targetX, 0.08, strike.targetZ);
              const scaleFactor = strike.radius / ICBM_CONFIG.explosionRadius;
              tgt.scale.set(scaleFactor, 1, scaleFactor);
            }
            if (ring) {
              ring.scale.setScalar(Math.max(0.06, 1 - p));
            }
            if (cdEl) {
              const rem = Math.max(0, strike.delaySeconds - strike.elapsed);
              cdEl.textContent = `${rem.toFixed(1)}s`;
            }
            if (rocket) {
              if (strike.kind === "cannon") {
                const startY = 26;
                const my = THREE.MathUtils.lerp(startY, 0.5, p);
                rocket.position.set(strike.targetX, my, strike.targetZ);
                rocket.lookAt(strike.targetX, 0, strike.targetZ);
              } else {
                const mx = THREE.MathUtils.lerp(strike.startX, strike.targetX, p);
                const mz = THREE.MathUtils.lerp(strike.startZ, strike.targetZ, p);
                const my = THREE.MathUtils.lerp(1.5, 0.35, p) + Math.sin(p * Math.PI) * 18;
                rocket.position.set(mx, my, mz);
                const pNext = Math.min(1, p + 0.015);
                const nx = THREE.MathUtils.lerp(strike.startX, strike.targetX, pNext);
                const nz = THREE.MathUtils.lerp(strike.startZ, strike.targetZ, pNext);
                const ny =
                  THREE.MathUtils.lerp(1.5, 0.35, pNext) + Math.sin(pNext * Math.PI) * 18;
                rocket.lookAt(nx, ny, nz);
                if (Math.random() < 0.65) {
                  spawnParticles(
                    mx,
                    my,
                    mz,
                    strike.kind === "nuke" ? "#84cc16" : "#fb923c",
                    2,
                    0.65
                  );
                }
              }
            }
          }
        }

        if (allImpacted || strikes.every((s) => s.impacted)) {
          activeStrikesRef.current = [];
          for (let idx = 0; idx < MAX_ACTIVE_STRIKES; idx++) {
            const grp = strikeGroupRefs.current[idx];
            if (grp) grp.visible = false;
          }
          useGameStore.getState().finishIcbmStrike();
        }
      } else {
        for (let idx = 0; idx < MAX_ACTIVE_STRIKES; idx++) {
          const grp = strikeGroupRefs.current[idx];
          if (grp && grp.visible) grp.visible = false;
        }
      }

      // 2c. Hiệu ứng DURATION_FIELD & DURATION_SWARM đang kích hoạt
      if (isRaging && rageWeaponId === "rocket_launcher" && rocketSwarmRef.current.remaining > 0) {
        rocketSwarmRef.current.timer -= delta;
        if (rocketSwarmRef.current.timer <= 0) {
          rocketSwarmRef.current.timer = 0.45;
          rocketSwarmRef.current.remaining -= 1;
          const offsetX = (Math.random() - 0.5) * 1.4;
          spawnBullet(
            THREE.MathUtils.clamp(
              runtimeRef.current.playerX + offsetX,
              ARENA_CONFIG.playerMinX,
              ARENA_CONFIG.playerMaxX
            ),
            ARENA_CONFIG.playerZ - 1.0,
            (Math.random() - 0.5) * 8,
            -26,
            rocketSwarmRef.current.damage,
            2.4,
            [0.24, 0.24, 0.92],
            "#f43f5e",
            { fromRage: true, homing: true }
          );
          soundService.play("shootCannon");
        }
      }

      if (isRaging && rageWeaponId === "cryo_gun") {
        // Blizzard: Mưa tuyết đóng băng toàn làn trái 70% slow
        if (Math.random() < 0.6) {
          const fx = THREE.MathUtils.lerp(
            ARENA_CONFIG.leftLaneMinX,
            ARENA_CONFIG.dividerX,
            Math.random()
          );
          const fz = THREE.MathUtils.lerp(-28, 6, Math.random());
          spawnParticles(fx, 1.8, fz, "#bae6fd", 2, 0.45);
        }
      }

      if (isRaging && rageWeaponId === "acid_sprayer") {
        // Meltdown: Phủ axit toàn làn trái 5s, nhiễm độc quái thường tan chảy sau 3s
        const enemies = enemiesPoolRef.current;
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active || e.dying) continue;
          if (e.acidTimer <= 0) {
            e.acidTimer = rageSpec?.acidMeltSeconds ?? 3.0;
          }
        }
        if (Math.random() < 0.55) {
          const ax = THREE.MathUtils.lerp(
            ARENA_CONFIG.leftLaneMinX + 0.4,
            ARENA_CONFIG.dividerX - 0.4,
            Math.random()
          );
          const az = THREE.MathUtils.lerp(-26, 5, Math.random());
          spawnParticles(ax, 0.35, az, "#84cc16", 2, 0.5);
        }
      }

      if (isRaging && rageWeaponId === "laser_cannon") {
        // Superbeam (8s): Quét chùm tia laser khổng lồ dọc làn trái
        const sweepAngle = Math.sin(state.clock.elapsedTime * 2.2) * 0.28;
        const originX = runtimeRef.current.playerX;
        const originZ = ARENA_CONFIG.playerZ - 1.1;
        if (laserBeamGroupRef.current) {
          laserBeamGroupRef.current.position.set(originX, 0.92, originZ);
          laserBeamGroupRef.current.rotation.y = -sweepAngle;
        }
        laserTickRef.current -= delta;
        if (laserTickRef.current <= 0) {
          laserTickRef.current = 0.12;
          const dirX = Math.sin(sweepAngle);
          const dirZ = -Math.cos(sweepAngle);
          const beamDmg = Math.max(35, Math.round(baseDamage * 0.85));
          const enemies = enemiesPoolRef.current;
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.active || e.dying) continue;
            const tProj = (e.x - originX) * dirX + (e.z - originZ) * dirZ;
            if (tProj < 0 || tProj > 46) continue;
            const perpSq =
              (e.x - (originX + dirX * tProj)) ** 2 +
              (e.z - (originZ + dirZ * tProj)) ** 2;
            const beamWidth = 1.45 + e.radius;
            if (perpSq <= beamWidth * beamWidth) {
              spawnParticles(e.x, 0.9 * e.scale, e.z, "#fb7185", 4, 0.9);
              applyEnemyDamage(k, e, beamDmg, false, 10);
            }
          }
        }
      }

      if (isRaging && rageWeaponId === "vortex_gun") {
        // Singularity (6s): Hố đen tâm làn trái hút và nghiền nát quái
        const vxCenter = (ARENA_CONFIG.leftLaneMinX + ARENA_CONFIG.dividerX) * 0.5;
        const vzCenter = -12.5;
        if (vortexMeshRef.current) {
          vortexMeshRef.current.position.set(vxCenter, 0.55, vzCenter);
          vortexMeshRef.current.rotation.y = state.clock.elapsedTime * 4.5;
        }
        if (Math.random() < 0.7) {
          spawnParticles(vxCenter, 0.9, vzCenter, "#a855f7", 2, 0.9);
        }
        const enemies = enemiesPoolRef.current;
        for (let k = 0; k < enemies.length; k++) {
          const e = enemies[k];
          if (!e.active || e.dying) continue;
          const dx = vxCenter - e.x;
          const dz = vzCenter - e.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.25 && dist < 24) {
            const pullSpeed = e.kind === "BOSS" ? 2.4 : 8.5;
            e.x += (dx / dist) * pullSpeed * delta;
            e.z += (dz / dist) * pullSpeed * delta;
          }
        }
        vortexTickRef.current -= delta;
        if (vortexTickRef.current <= 0) {
          vortexTickRef.current = 0.25;
          const crushDmg = Math.max(24, Math.round(baseDamage * 0.7));
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.active || e.dying) continue;
            const dx = vxCenter - e.x;
            const dz = vzCenter - e.z;
            if (dx * dx + dz * dz <= 9.0 * 9.0) {
              applyEnemyDamage(k, e, crushDmg, false, 10);
            }
          }
        }
      }

      // 2d. Xử lý mìn cảm biến còn trên sân (Grenade Launcher) & vùng phóng xạ (Nuclear Winter)
      {
        const mines = proximityMinesPoolRef.current;
        const enemies = enemiesPoolRef.current;
        for (let m = 0; m < mines.length; m++) {
          const mine = mines[m];
          if (!mine.active) continue;
          let triggered = false;
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.active || e.dying) continue;
            const dx = e.x - mine.x;
            const dz = e.z - mine.z;
            const triggerR = 1.1 + e.radius;
            if (dx * dx + dz * dz <= triggerR * triggerR) {
              triggered = true;
              break;
            }
          }
          if (triggered) {
            mine.active = false;
            spawnParticles(mine.x, 0.9, mine.z, "#f97316", 18, 1.5);
            spawnParticles(mine.x, 1.1, mine.z, "#fde047", 10, 1.2);
            soundService.play("cannonExplosion");
            runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.35);
            const rSq = mine.radius * mine.radius;
            for (let k = 0; k < enemies.length; k++) {
              const e = enemies[k];
              if (!e.active || e.dying) continue;
              const sdx = e.x - mine.x;
              const sdz = e.z - mine.z;
              if (sdx * sdx + sdz * sdz <= rSq) {
                applyEnemyDamage(k, e, mine.damage, false, 12);
              }
            }
          }
        }

        const fZones = falloutZonesRef.current;
        for (let f = 0; f < fZones.length; f++) {
          const fz = fZones[f];
          if (!fz.active) continue;
          fz.timeLeft -= delta;
          if (fz.timeLeft <= 0) {
            fz.active = false;
            continue;
          }
          if (Math.random() < 0.4) {
            const ang = Math.random() * Math.PI * 2;
            const r = Math.random() * fz.radius * 0.8;
            spawnParticles(
              fz.x + Math.cos(ang) * r,
              0.4,
              fz.z + Math.sin(ang) * r,
              "#a3e635",
              1,
              0.4
            );
          }
          fz.tickTimer -= delta;
          if (fz.tickTimer <= 0) {
            fz.tickTimer = 0.4;
            const rSq = fz.radius * fz.radius;
            for (let k = 0; k < enemies.length; k++) {
              const e = enemies[k];
              if (!e.active || e.dying) continue;
              const fdx = e.x - fz.x;
              const fdz = e.z - fz.z;
              if (fdx * fdx + fdz * fdz <= rSq) {
                applyEnemyDamage(k, e, fz.damage, false, 10);
              }
            }
          }
        }
      }

      fireCooldownRef.current -= delta;
      const shouldFire = store.autoFire || gameInput.fire;
      const effectiveRate = rageSpec?.overrideRps
        ? rageSpec.overrideRps
        : baseRate * (rageSpec?.fireRateMultiplier ?? 1);
      const effectiveDamage = Number(
        (baseDamage * (rageSpec?.damageMultiplier ?? 1)).toFixed(1)
      );
      const effectiveBulletSpeed =
        weapon.bulletSpeed * (rageSpec?.bulletSpeedMultiplier ?? 1);
      const bulletScale = rageSpec?.bulletScaleMultiplier ?? 1;
      const effectiveBulletSize: [number, number, number] =
        bulletScale !== 1
          ? [
              weapon.bulletSize[0] * bulletScale,
              weapon.bulletSize[1] * bulletScale,
              weapon.bulletSize[2] * Math.min(2, bulletScale),
            ]
          : weapon.bulletSize;
      const effectiveSplash = buffs.explosive
        ? Math.max(weapon.splashRadius, 1.8)
        : weapon.splashRadius;
      const bulletModifiers = {
        pierceRemaining: Math.max(buffs.piercing ? 2 : 0, rageSpec?.pierceCount ?? 0),
        ricochetRemaining: buffs.ricochet ? 1 : 0,
        fromRage: isRaging,
      };

      if (shouldFire && fireCooldownRef.current <= 0) {
        fireCooldownRef.current = 1 / effectiveRate;
        muzzleFlashRef.current =
          weapon.modelKind === "cannon" || weapon.modelKind === "icbm" ? 0.14 : 0.06;
        shotCounterRef.current += 1;

        if (weapon.modelKind === "pistol") soundService.play("shootPistol");
        else if (weapon.modelKind === "ak-rifle") soundService.play("shootAk");
        else if (weapon.modelKind === "machine-gun") soundService.play("shootMachineGun");
        else soundService.play("shootCannon");

        const streams = rageSpec?.parallelStreams ?? 1;
        const barrelOffsetX =
          weapon.modelKind === "machine-gun"
            ? ((shotCounterRef.current % 3) - 1) * 0.16
            : 0;
        const basePellets = rageSpec?.pelletsPerShot ?? weapon.bulletCount;
        const pellets = Math.max(1, basePellets + (buffs.multishot ? 2 : 0));
        const baseSpread = rageSpec?.spreadDeg ?? weapon.spreadDeg;
        const spreadDeg = buffs.multishot ? Math.max(baseSpread, 15) : baseSpread;
        const coneRad = THREE.MathUtils.degToRad(spreadDeg);

        for (let sIdx = 0; sIdx < streams; sIdx++) {
          const streamOffsetX =
            streams > 1
              ? (sIdx / (streams - 1) - 0.5) * (streams === 3 ? 1.15 : 2.8)
              : barrelOffsetX;
          const bulletColor =
            rageWeaponId === "flamethrower"
              ? sIdx % 2 === 0
                ? "#f97316"
                : "#fde047"
              : rageWeaponId === "ak47"
                ? sIdx % 2 === 0
                  ? "#fbbf24"
                  : "#f97316"
                : weapon.bulletColor;

          for (let p = 0; p < pellets; p++) {
            const baseAngle =
              pellets === 1
                ? THREE.MathUtils.degToRad((Math.random() - 0.5) * spreadDeg)
                : (p / (pellets - 1) - 0.5) * coneRad +
                  THREE.MathUtils.degToRad((Math.random() - 0.5) * 1.4);
            const vx = Math.sin(baseAngle) * effectiveBulletSpeed;
            const vz = -Math.cos(baseAngle) * effectiveBulletSpeed;

            spawnBullet(
              runtimeRef.current.playerX + streamOffsetX,
              ARENA_CONFIG.playerZ - 1.15,
              vx,
              vz,
              effectiveDamage,
              effectiveSplash,
              effectiveBulletSize,
              bulletColor,
              bulletModifiers
            );
          }
        }

        // Bắn đạn hỗ trợ từ các Bản sao [x2 CLONE] (tối đa +2 clone)
        if (buffs.clones > 0) {
          const cloneOffsets = [-1.25, 1.25].slice(0, buffs.clones);
          const cloneDmg = Math.max(0.5, Number((effectiveDamage * 0.7).toFixed(1)));
          for (const offsetX of cloneOffsets) {
            const cx = THREE.MathUtils.clamp(
              runtimeRef.current.playerX + offsetX,
              ARENA_CONFIG.playerMinX,
              ARENA_CONFIG.playerMaxX
            );
            spawnBullet(
              cx,
              ARENA_CONFIG.playerZ - 0.85,
              0,
              -effectiveBulletSpeed,
              cloneDmg,
              effectiveSplash,
              [0.14, 0.14, 0.58],
              "#22d3ee",
              bulletModifiers
            );
          }
        }
      }

      // [TURRET DROP] Súng turret tự động bắn hỗ trợ trong 10s
      if (buffs.turretTimeLeft > 0) {
        turretCooldownRef.current -= delta;
        let nearestEnemy: EnemyEntity | null = null;
        let highestZ = -Infinity;
        for (const candidate of enemiesPoolRef.current) {
          if (!candidate.active || candidate.dying) continue;
          if (candidate.z > highestZ) {
            highestZ = candidate.z;
            nearestEnemy = candidate;
          }
        }
        const turretX = 4.35;
        const turretZ = 4.9;
        if (nearestEnemy) {
          const dx = nearestEnemy.x - turretX;
          const dz = nearestEnemy.z - turretZ;
          if (turretHeadRef.current) {
            turretHeadRef.current.rotation.y = Math.atan2(-dx, -dz);
          }
          if (turretCooldownRef.current <= 0) {
            turretCooldownRef.current = 0.22;
            const dist = Math.max(0.01, Math.hypot(dx, dz));
            const speed = 44;
            const turretDmg = Math.max(2, Number((effectiveDamage * 1.1).toFixed(1)));
            spawnBullet(
              turretX,
              turretZ - 0.4,
              (dx / dist) * speed,
              (dz / dist) * speed,
              turretDmg,
              effectiveSplash,
              [0.16, 0.16, 0.75],
              "#f59e0b",
              { ...bulletModifiers, fromRage: isRaging }
            );
          }
        }
      }

      // 3. Sinh quái bên làn trái theo cấu hình của Chương & Wave hiện tại
      const stageCfg = weaponService.getStageConfig(store.wave, store.activeChapter);
      if (stageCfg.isBossStage) {
        if (bossSpawnedStageRef.current !== store.wave) {
          // Dọn quái nhỏ còn sống để bước vào trận đấu Boss (giữ lại xác đang chạy hiệu ứng chết)
          enemiesPoolRef.current.forEach((enemy, idx) => {
            if (!enemy.dying) {
              enemy.active = false;
              enemy.castTimer = 0;
              enemyUnitRefs.current[idx]?.setMode("IDLE");
            }
          });
          for (const proj of enemyProjectilesPoolRef.current) {
            proj.active = false;
          }
          spawnEnemy(store.wave, 0);
          bossSpawnedStageRef.current = store.wave;
        }
      } else {
        // Giới hạn tối đa MAX_ACTIVE_ON_SCREEN (10) quái sống đồng thời; chết mới sinh thêm
        let aliveOnScreen = 0;
        for (let k = 0; k < MAX_ENEMIES; k++) {
          const cand = enemiesPoolRef.current[k];
          if (cand.active && !cand.dying) {
            aliveOnScreen++;
          }
        }
        const roomOnScreen = Math.max(0, MAX_ACTIVE_ON_SCREEN - aliveOnScreen);
        if (roomOnScreen <= 0) {
          spawnTimerRef.current = Math.min(spawnTimerRef.current, 0.25);
        } else {
          spawnTimerRef.current -= delta;
          if (spawnTimerRef.current <= 0) {
            const batchCount =
              stageCfg.maxBatchSize === 1
                ? 1
                : 1 + Math.floor(Math.random() * stageCfg.maxBatchSize);
            const spawnCount = Math.min(batchCount, roomOnScreen);

            for (let k = 0; k < spawnCount; k++) {
              spawnEnemy(store.wave, k * 1.65);
            }
            spawnTimerRef.current =
              stageCfg.spawnMinInterval +
              Math.random() * (stageCfg.spawnMaxInterval - stageCfg.spawnMinInterval);
          }
        }
      }

      // 4. Cập nhật đạn & kiểm tra va chạm (Quái bên trái + Hòm đồ bên phải)
      const bullets = bulletsPoolRef.current;
      const enemies = enemiesPoolRef.current;
      const maxBulletX = ARENA_CONFIG.width / 2 + 1.5;

      for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        if (!b.active) continue;

        const prevX = b.x;
        const prevZ = b.z;
        if (b.homing) {
          let bestEnemy: EnemyEntity | null = null;
          let bestDistSq = Infinity;
          for (let k = 0; k < enemies.length; k++) {
            const cand = enemies[k];
            if (!cand.active || cand.dying) continue;
            const dSq = (cand.x - b.x) ** 2 + (cand.z - b.z) ** 2;
            if (dSq < bestDistSq) {
              bestDistSq = dSq;
              bestEnemy = cand;
            }
          }
          if (bestEnemy) {
            const speed = Math.max(14, Math.hypot(b.vx, b.vz));
            const dx = bestEnemy.x - b.x;
            const dz = bestEnemy.z - b.z;
            const dist = Math.max(0.01, Math.hypot(dx, dz));
            const desiredVx = (dx / dist) * speed;
            const desiredVz = (dz / dist) * speed;
            const steer = Math.min(1, 9 * delta);
            b.vx = THREE.MathUtils.lerp(b.vx, desiredVx, steer);
            b.vz = THREE.MathUtils.lerp(b.vz, desiredVz, steer);
          }
          if (Math.random() < 0.45) {
            spawnParticles(b.x, b.y, b.z, "#f43f5e", 1, 0.4);
          }
        }
        b.x += b.vx * delta;
        b.z += b.vz * delta;

        if (b.z < ARENA_CONFIG.bulletDespawnZ || Math.abs(b.x) > maxBulletX) {
          b.active = false;
          continue;
        }

        const midX = (prevX + b.x) * 0.5;
        const midZ = (prevZ + b.z) * 0.5;

        // Va chạm với 2 Cổng Buff trên làn phải (tối đa 2 item/wave, hết wave mới ra tiếp)
        let hitRightGate = false;
        for (const gate of useGameStore.getState().rightLaneGates) {
          if (gate.claimed) continue;
          const hitNow =
            Math.abs(b.x - gate.x) <= ARENA_CONFIG.gateHalfWidth &&
            Math.abs(b.z - gate.z) <= ARENA_CONFIG.gateHalfDepth;
          const hitMid =
            Math.abs(midX - gate.x) <= ARENA_CONFIG.gateHalfWidth &&
            Math.abs(midZ - gate.z) <= ARENA_CONFIG.gateHalfDepth;

          if (!hitNow && !hitMid) continue;

          hitRightGate = true;
          b.active = false;
          soundService.play("hitCrate");
          spawnParticles(b.x, 1.1, b.z, b.color, b.splashRadius > 0 ? 10 : 4, 0.9);

          const res = store.registerGateHit(gate.slotIndex);
          if (res.claimed && res.buff) {
            spawnParticles(gate.x, 1.4, gate.z, res.buff.color, 26, 1.5);
            if (!isRageLocked && !b.fromRage) {
              rageBufferRef.current +=
                RAGE_CONFIG.gainPerCrateUpgrade * RAGE_CONFIG.gainMultiplier * magnetRageMult;
            }

            if (res.buff.id === "lightning") {
              // [LIGHTNING] Giật sét toàn bộ quái làn trái, stun 2s
              const shockDmg = Math.max(8, Math.round(effectiveDamage * 2.5));
              for (let k = 0; k < enemies.length; k++) {
                const target = enemies[k];
                if (!target.active || target.dying) continue;
                target.stunTimer = Math.max(target.stunTimer, target.kind === "BOSS" ? 1.0 : 2.0);
                target.hp -= shockDmg;
                target.hitFlash = 0.25;
                spawnParticles(target.x, 0.95 * target.scale, target.z, "#f8fafc", 10, 1.25);
                if (target.hp <= 0) {
                  killEnemy(k, target, { grantRage: !isRageLocked && !b.fromRage });
                }
              }
              runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.55);
              soundService.play("cannonExplosion");
            } else if (res.buff.id === "cluster_bomb") {
              // [CLUSTER BOMB] Rải 6 quả lựu đạn dọc làn trái
              const bombDmg = Math.max(12, Math.round(effectiveDamage * 4));
              const bombRadiusSq = 2.6 * 2.6;
              for (let c = 0; c < 6; c++) {
                const bx = THREE.MathUtils.lerp(
                  ARENA_CONFIG.leftLaneMinX + 1.2,
                  ARENA_CONFIG.leftLaneMaxX - 1.2,
                  (c % 3) / 2
                );
                const bz = THREE.MathUtils.lerp(-24, -2, c / 5);
                spawnParticles(bx, 0.9, bz, "#22c55e", 16, 1.55);
                spawnParticles(bx, 1.1, bz, "#f97316", 10, 1.3);
                for (let k = 0; k < enemies.length; k++) {
                  const target = enemies[k];
                  if (!target.active || target.dying) continue;
                  const bdx = target.x - bx;
                  const bdz = target.z - bz;
                  if (bdx * bdx + bdz * bdz <= bombRadiusSq) {
                    target.hp -= bombDmg;
                    target.hitFlash = 0.2;
                    if (target.hp <= 0) {
                      killEnemy(k, target, { grantRage: !isRageLocked && !b.fromRage });
                    }
                  }
                }
              }
              runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.7);
              soundService.play("cannonExplosion");
            } else if (res.buff.id === "heal_hp") {
              spawnParticles(runtimeRef.current.playerX, 1.2, ARENA_CONFIG.playerZ, "#ec4899", 18, 1.3);
            }
          }
          break;
        }
        if (hitRightGate) continue;

        // Va chạm với Quái ở làn trái (tính khoảng cách từ đoạn đường đạn đi tới tâm quái để không xuyên qua khi bay x2)
        const segX = b.x - prevX;
        const segZ = b.z - prevZ;
        const segLenSq = segX * segX + segZ * segZ;

        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active || e.dying) continue;
          if (e.id === b.lastHitEnemyId || e.id === b.secondLastHitEnemyId) continue;

          const tProj =
            segLenSq > 0
              ? THREE.MathUtils.clamp(((e.x - prevX) * segX + (e.z - prevZ) * segZ) / segLenSq, 0, 1)
              : 0;
          const closestX = prevX + segX * tProj;
          const closestZ = prevZ + segZ * tProj;
          const dx = closestX - e.x;
          const dz = closestZ - e.z;
          const bulletRadius = b.size[0] * 0.65;
          const hitRadius = e.radius + bulletRadius;

          if (dx * dx + dz * dz <= hitRadius * hitRadius) {
            b.secondLastHitEnemyId = b.lastHitEnemyId;
            b.lastHitEnemyId = e.id;

            const canGrantRage = !isRageLocked && !b.fromRage;
            if (canGrantRage) {
              const hitGain =
                b.splashRadius > 0 ? RAGE_CONFIG.gainPerCannonHit : RAGE_CONFIG.gainPerHit;
              rageBufferRef.current +=
                hitGain * RAGE_CONFIG.gainMultiplier * magnetRageMult;
            }

            if (b.splashRadius > 0) {
              // Hiệu ứng nổ đại bác + sát thương nổ lan cho quái xung quanh
              soundService.play("cannonExplosion");
              runtimeRef.current.screenShake = Math.min(
                0.55,
                Math.max(runtimeRef.current.screenShake, 0.2)
              );
              spawnParticles(closestX, 0.9, closestZ, "#fb7185", isRaging ? 10 : 22, 1.45);
              const splashSq = b.splashRadius * b.splashRadius;
              for (let m = 0; m < enemies.length; m++) {
                if (m === j) continue;
                const other = enemies[m];
                if (!other.active || other.dying) continue;
                const sdx = other.x - closestX;
                const sdz = other.z - closestZ;
                if (sdx * sdx + sdz * sdz <= splashSq) {
                  applyEnemyDamage(m, other, b.damage * 0.55, canGrantRage, 12);
                }
              }
            } else {
              soundService.play("hitEnemy");
              spawnParticles(closestX, 0.75, closestZ, b.color, isRaging ? 2 : 4, 0.75);
            }

            applyEnemyDamage(j, e, b.damage, canGrantRage);

            // [PIERCING] Xuyên tối đa 3 quái / [RICOCHET] Nảy sang quái gần nhất (2.5m)
            if (b.pierceRemaining > 0) {
              b.pierceRemaining -= 1;
            } else if (b.ricochetRemaining > 0) {
              let bounceTarget: EnemyEntity | null = null;
              let bestDistSq = 2.5 * 2.5;
              for (let m = 0; m < enemies.length; m++) {
                const candidate = enemies[m];
                if (
                  !candidate.active ||
                  candidate.dying ||
                  candidate.id === e.id ||
                  candidate.id === b.secondLastHitEnemyId
                ) {
                  continue;
                }
                const rdx = candidate.x - closestX;
                const rdz = candidate.z - closestZ;
                const dSq = rdx * rdx + rdz * rdz;
                if (dSq <= bestDistSq) {
                  bestDistSq = dSq;
                  bounceTarget = candidate;
                }
              }
              if (bounceTarget) {
                b.ricochetRemaining -= 1;
                b.x = closestX;
                b.z = closestZ;
                const rdx = bounceTarget.x - closestX;
                const rdz = bounceTarget.z - closestZ;
                const rDist = Math.max(0.01, Math.hypot(rdx, rdz));
                const speed = Math.max(10, Math.hypot(b.vx, b.vz));
                b.vx = (rdx / rDist) * speed;
                b.vz = (rdz / rDist) * speed;
              } else {
                b.active = false;
              }
            } else {
              b.active = false;
            }
            break;
          }
        }
      }

      // Đẩy điểm Nộ tích được vào Store
      if (!isRageLocked && rageBufferRef.current >= 1) {
        const gain = Math.floor(rageBufferRef.current);
        rageBufferRef.current -= gain;
        useGameStore.getState().addRage(gain);
      }

      // 5. Cập nhật quái di chuyển + Quái 2 bắn độc mỗi ~3s + Stun/Freeze (70% Blizzard)/Acid Meltdown + văng lùi
      const buffFreezeFactor =
        useGameStore.getState().activeBuffs.freezeTimeLeft > 0 ? 0.5 : 1;
      const rageFreezeFactor = rageWeaponId === "cryo_gun" ? 0.3 : 1;
      const freezeFactor = Math.min(buffFreezeFactor, rageFreezeFactor);
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active || e.dying) continue;

        // Acid Sprayer Meltdown: Đếm ngược 3s khiến quái thường tan chảy
        if (e.acidTimer > 0) {
          e.acidTimer -= delta;
          if (Math.random() < 0.2) {
            spawnParticles(e.x, 0.7 * e.scale, e.z, "#84cc16", 1, 0.4);
          }
          if (e.acidTimer <= 0) {
            e.acidTimer = 0;
            if (e.kind !== "BOSS") {
              spawnParticles(e.x, 0.9 * e.scale, e.z, "#a3e635", 16, 1.3);
              e.hp = 0;
              killEnemy(i, e, { grantRage: false, particleCount: 16 });
              continue;
            } else {
              spawnParticles(e.x, 1.2 * e.scale, e.z, "#a3e635", 24, 1.5);
              applyEnemyDamage(i, e, Math.max(80, e.maxHp * 0.25), false, 24);
              if (e.dying || !e.active) continue;
            }
          }
        }

        if (e.stunTimer > 0) {
          e.stunTimer = Math.max(0, e.stunTimer - delta);
          if (e.castTimer > 0) {
            e.castTimer = 0;
            enemyUnitRefs.current[i]?.setMode("WALK");
          }
        } else if (e.kind === "ELITE" && e.castTimer > 0) {
          e.castTimer = Math.max(0, e.castTimer - delta);
          // Bắn viên đạn độc đúng nhịp tay vươn thẳng về phía trước (~40% clip)
          if (!e.castFired && e.castTimer <= POISON_CAST_DURATION * 0.6) {
            e.castFired = true;
            const sx = e.x;
            const sy = 1.0 * e.scale;
            const sz = e.z + 0.55 * e.scale;
            spawnParticles(sx, sy, sz, "#84cc16", 10, 0.9);
            spawnEnemyProjectile(
              sx,
              sy,
              sz,
              runtimeRef.current.playerX,
              ARENA_CONFIG.playerZ,
              POISON_PROJECTILE_SPEED * freezeFactor,
              "#84cc16"
            );
          }
          if (e.castTimer <= 0) {
            enemyUnitRefs.current[i]?.setMode("WALK");
            e.attackCooldown =
              POISON_INTERVAL_MIN +
              Math.random() * (POISON_INTERVAL_MAX - POISON_INTERVAL_MIN);
          }
        } else {
          if (e.kind === "DASHER" && !e.enraged && e.hp <= e.maxHp * 0.2) {
            e.enraged = true;
            e.speed *= 2.0;
            enemyUnitRefs.current[i]?.setMode("RUN");
            spawnParticles(e.x, 0.9 * e.scale, e.z, "#38bdf8", 10, 1.2);
          }

          e.z += e.speed * freezeFactor * delta;

          if (e.kind === "SKYWING" || e.kind === "DASHER") {
            const weaveFreq = e.kind === "DASHER" ? 4.2 : 3.1;
            const weaveAmp =
              e.kind === "DASHER" ? (e.enraged ? 4.2 : 3.1) : 2.4;
            const weaveVx =
              Math.sin(state.clock.elapsedTime * weaveFreq + e.phase) * weaveAmp * freezeFactor;
            e.x = THREE.MathUtils.clamp(
              e.x + weaveVx * delta,
              ARENA_CONFIG.leftLaneMinX + 0.65,
              ARENA_CONFIG.dividerX - 0.65
            );
          }

          if (
            e.kind === "ELITE" &&
            e.z > ARENA_CONFIG.spawnZ + 3 &&
            e.z < ARENA_CONFIG.defenseLineZ - 3.5
          ) {
            e.attackCooldown -= delta * freezeFactor;
            if (e.attackCooldown <= 0) {
              e.castTimer = POISON_CAST_DURATION;
              e.castFired = false;
              enemyUnitRefs.current[i]?.setMode("ATTACK", POISON_CAST_DURATION);
              spawnParticles(e.x, 1.05 * e.scale, e.z + 0.35, "#4ade80", 6, 0.6);
            }
          } else if (e.kind === "BOSS" && store.activeChapter === 1) {
            // Boss 1 (Iron Warden): vừa bước tiến vừa giơ súng bắn laser (clip WalkShoot 1.8s)
            if (e.castTimer > 0) {
              e.castTimer = Math.max(0, e.castTimer - delta * freezeFactor);
              if (!e.castFired && e.castTimer <= BOSS1_SHOOT_DURATION * 0.72) {
                e.castFired = true;
                const muzzleX = e.x - 1.35;
                const muzzleY = 2.0;
                const muzzleZ = e.z + 1.1;
                spawnParticles(muzzleX, muzzleY, muzzleZ, "#ef4444", 16, 1.2);
                soundService.play("shootCannon");
                for (const offsetX of [-0.55, 0.55]) {
                  spawnEnemyProjectile(
                    muzzleX,
                    muzzleY,
                    muzzleZ,
                    THREE.MathUtils.clamp(
                      runtimeRef.current.playerX + offsetX,
                      ARENA_CONFIG.playerMinX,
                      ARENA_CONFIG.playerMaxX
                    ),
                    ARENA_CONFIG.playerZ,
                    POISON_PROJECTILE_SPEED * 1.1 * freezeFactor,
                    "#ef4444"
                  );
                }
              }
              if (e.castTimer <= 0) {
                enemyUnitRefs.current[i]?.setMode("WALK");
                e.attackCooldown = 1.8 + Math.random() * 0.6;
              }
            } else if (
              e.z > ARENA_CONFIG.spawnZ + 0.4 &&
              e.z < ARENA_CONFIG.defenseLineZ - 4.0
            ) {
              e.attackCooldown -= delta * freezeFactor;
              if (e.attackCooldown <= 0) {
                e.castTimer = BOSS1_SHOOT_DURATION;
                e.castFired = false;
                enemyUnitRefs.current[i]?.setMode("ATTACK", BOSS1_SHOOT_DURATION);
                spawnParticles(e.x - 1.35, 2.0, e.z + 1.0, "#f97316", 8, 0.7);
              }
            }
          } else if (
            e.kind === "BOSS" &&
            store.activeChapter === 2 &&
            e.z > ARENA_CONFIG.spawnZ + 2 &&
            e.z < ARENA_CONFIG.defenseLineZ - 4.0
          ) {
            e.attackCooldown -= delta * freezeFactor;
            if (e.attackCooldown <= 0) {
              e.attackCooldown = 3.4 + Math.random() * 0.8;
              const muzzleZ = e.z + 1.1;
              spawnParticles(e.x, 2.2, muzzleZ, "#10b981", 16, 1.1);
              for (const offset of [-1.05, 0, 1.05]) {
                spawnEnemyProjectile(
                  e.x + offset,
                  2.1,
                  muzzleZ,
                  THREE.MathUtils.clamp(
                    runtimeRef.current.playerX + offset * 1.1,
                    ARENA_CONFIG.playerMinX,
                    ARENA_CONFIG.playerMaxX
                  ),
                  ARENA_CONFIG.playerZ,
                  POISON_PROJECTILE_SPEED * 0.9 * freezeFactor,
                  "#10b981"
                );
              }
            }
          } else if (e.kind === "BOSS" && store.activeChapter === 3) {
            // Boss 3 (Chrono Warrior): vung Lưỡi Hái Chrono & phóng 3 cầu năng lượng thời gian (clip Boss_03_Attack)
            if (e.castTimer > 0) {
              e.castTimer = Math.max(0, e.castTimer - delta * freezeFactor);
              if (!e.castFired && e.castTimer <= BOSS3_SHOOT_DURATION * 0.36) {
                e.castFired = true;
                const muzzleX = e.x - 0.55;
                const muzzleY = 2.05;
                const muzzleZ = e.z + 1.15;
                spawnParticles(muzzleX, muzzleY, muzzleZ, "#a855f7", 18, 1.25);
                soundService.play("shootCannon");
                for (const offsetX of [-0.95, 0, 0.95]) {
                  spawnEnemyProjectile(
                    muzzleX + offsetX * 0.4,
                    muzzleY,
                    muzzleZ,
                    THREE.MathUtils.clamp(
                      runtimeRef.current.playerX + offsetX,
                      ARENA_CONFIG.playerMinX,
                      ARENA_CONFIG.playerMaxX
                    ),
                    ARENA_CONFIG.playerZ,
                    POISON_PROJECTILE_SPEED * 1.05 * freezeFactor,
                    "#a855f7"
                  );
                }
              }
              if (e.castTimer <= 0) {
                enemyUnitRefs.current[i]?.setMode("WALK");
                e.attackCooldown = 2.0 + Math.random() * 0.7;
              }
            } else if (
              e.z > ARENA_CONFIG.spawnZ + 0.8 &&
              e.z < ARENA_CONFIG.defenseLineZ - 4.0
            ) {
              e.attackCooldown -= delta * freezeFactor;
              if (e.attackCooldown <= 0) {
                e.castTimer = BOSS3_SHOOT_DURATION;
                e.castFired = false;
                enemyUnitRefs.current[i]?.setMode("ATTACK", BOSS3_SHOOT_DURATION);
                spawnParticles(e.x - 0.55, 2.05, e.z + 1.0, "#38bdf8", 10, 0.8);
              }
            }
          }
        }
        if (Math.abs(e.knockbackVx) > 0.01 || Math.abs(e.knockbackVz) > 0.01) {
          e.x += e.knockbackVx * delta;
          e.z += e.knockbackVz * delta;
          const damp = Math.exp(-ICBM_CONFIG.knockbackDamping * delta);
          e.knockbackVx *= damp;
          e.knockbackVz *= damp;

          // Giữ quái không bị hất văng ra khỏi làn quái hoặc lùi quá cổng spawn
          const margin = Math.min(2.8, e.radius);
          e.x = THREE.MathUtils.clamp(
            e.x,
            ARENA_CONFIG.leftLaneMinX + margin * 0.4,
            ARENA_CONFIG.dividerX - margin * 0.6
          );
          e.z = Math.max(ARENA_CONFIG.spawnZ, e.z);
        }

        if (e.hitFlash > 0) {
          e.hitFlash = Math.max(0, e.hitFlash - delta);
        }

        if (e.kind === "BOSS") {
          const bossFrontZ = e.z + 0.46 * e.scale;
          const dxPlayer = e.x - runtimeRef.current.playerX;
          const dzPlayer = e.z - ARENA_CONFIG.playerZ;
          const touchPlayerDirect =
            dxPlayer * dxPlayer + dzPlayer * dzPlayer <= (e.radius + 0.72) * (e.radius + 0.72);
          const reachedDefenseLine = bossFrontZ >= ARENA_CONFIG.playerZ - 0.55;

          if (touchPlayerDirect || reachedDefenseLine) {
            if (useGameStore.getState().activeBuffs.shieldCharges > 0) {
              useGameStore.getState().damagePlayer(1);
              e.z = Math.max(ARENA_CONFIG.spawnZ, e.z - 6.5);
              e.stunTimer = 1.1;
              spawnParticles(runtimeRef.current.playerX, 1.1, ARENA_CONFIG.playerZ, "#bae6fd", 24, 1.6);
              runtimeRef.current.screenShake = 0.5;
              break;
            }
            bossBiteRef.current = {
              active: true,
              enemyIndex: i,
              elapsed: 0,
              hasChomped: false,
              startX: e.x,
              startZ: e.z,
            };
            soundService.play("bossWarning");
            runtimeRef.current.screenShake = 0.35;
            break;
          }
        } else if (e.z >= ARENA_CONFIG.defenseLineZ) {
          const isBloaterHit = e.kind === "BLOATER";
          e.active = false;
          e.dying = false;
          e.castTimer = 0;
          enemyUnitRefs.current[i]?.setMode("IDLE");
          runtimeRef.current.screenShake = isBloaterHit ? 0.6 : 0.45;
          spawnParticles(
            e.x,
            0.8,
            ARENA_CONFIG.defenseLineZ,
            isBloaterHit ? "#f97316" : "#ef4444",
            isBloaterHit ? 30 : 20,
            isBloaterHit ? 1.7 : 1.4
          );
          if (isBloaterHit) {
            soundService.play("cannonExplosion");
          }
          useGameStore.getState().damagePlayer(1);
        }
      }

      // Cập nhật đạn của Quái / Boss bay về phía người chơi (né bằng A/D sang làn khác)
      const projectiles = enemyProjectilesPoolRef.current;
      for (let i = 0; i < projectiles.length; i++) {
        const proj = projectiles[i];
        if (!proj.active) continue;

        proj.x += proj.vx * delta;
        proj.z += proj.vz * delta;

        if (Math.random() < 0.25) {
          spawnParticles(proj.x, proj.y, proj.z, proj.color, 1, 0.42);
        }

        const pdx = proj.x - runtimeRef.current.playerX;
        const pdz = proj.z - ARENA_CONFIG.playerZ;
        const hitDist = 0.65 + proj.radius;
        if (pdx * pdx + pdz * pdz <= hitDist * hitDist) {
          proj.active = false;
          spawnParticles(proj.x, 1.0, proj.z, proj.color, 16, 1.3);
          runtimeRef.current.screenShake = Math.max(runtimeRef.current.screenShake, 0.35);
          useGameStore.getState().damagePlayer(proj.damage);
          continue;
        }

        if (
          proj.z > ARENA_CONFIG.playerZ + 4 ||
          Math.abs(proj.x) > ARENA_CONFIG.width / 2 + 2
        ) {
          proj.active = false;
        }
      }
    }

    // 6. Cập nhật hiệu ứng quái chết & hạt nổ (vẫn chạy nốt hiệu ứng ngay cả khi vừa Game Over / Victory)
    if (store.gameStatus !== "PAUSED") {
      const enemies = enemiesPoolRef.current;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active || !e.dying) continue;

        e.deathTimer += delta;
        if (e.hitFlash > 0) {
          e.hitFlash = Math.max(0, e.hitFlash - delta);
        }
        if (Math.abs(e.knockbackVx) > 0.01 || Math.abs(e.knockbackVz) > 0.01) {
          const margin = Math.min(2.8, e.radius);
          e.x = THREE.MathUtils.clamp(
            e.x + e.knockbackVx * delta,
            ARENA_CONFIG.leftLaneMinX + margin * 0.4,
            ARENA_CONFIG.dividerX - margin * 0.6
          );
          e.z = Math.max(ARENA_CONFIG.spawnZ, e.z + e.knockbackVz * delta);
          const damp = Math.exp(-ICBM_CONFIG.knockbackDamping * delta);
          e.knockbackVx *= damp;
          e.knockbackVz *= damp;
        }

        if (e.deathTimer >= e.deathDuration) {
          e.active = false;
          e.dying = false;
          e.deathTimer = 0;
          enemyUnitRefs.current[i]?.setMode("IDLE");
        }
      }

      const particles = particlesPoolRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.life -= delta;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.vy -= 16 * delta;
        p.x += p.vx * delta;
        p.y = Math.max(0.05, p.y + p.vy * delta);
        p.z += p.vz * delta;
      }
    }

    // 7. Đồng bộ dữ liệu từ Pool ra Mesh 3D (0 React re-render)
    const elapsed = state.clock.elapsedTime;
    const enemies = enemiesPoolRef.current;
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const e = enemies[i];
      const slot = enemySlotRefs.current[i];
      if (!slot) continue;

      if (!e.active) {
        slot.visible = false;
        continue;
      }

      slot.visible = true;
      const isElite = e.kind === "ELITE" || e.kind === "SHELL_BRUTE";
      const isBoss = e.kind === "BOSS";
      const isSkywing = e.kind === "SKYWING";
      const hpGroup = enemyHpGroupRefs.current[i];
      if (hpGroup) {
        hpGroup.visible = !e.dying;
      }

      if (e.dying) {
        const sinkWindow = Math.min(0.3, e.deathDuration * 0.24);
        const sinkStart = Math.max(0, e.deathDuration - sinkWindow);
        const sinkT =
          sinkWindow > 0.001 && e.deathTimer > sinkStart
            ? Math.min(1, (e.deathTimer - sinkStart) / sinkWindow)
            : 0;
        const flyDropY = isSkywing
          ? 1.15 * Math.max(0, 1 - e.deathTimer / 0.38)
          : 0;
        slot.position.set(e.x, flyDropY - 0.35 * e.scale * sinkT, e.z);
        slot.scale.setScalar(e.scale * Math.max(0.05, 1 - 0.85 * sinkT));
        slot.rotation.set(0, 0, 0);
      } else {
        const isBitingThisBoss =
          isBoss && bossBiteRef.current.active && bossBiteRef.current.enemyIndex === i;

        if (isBitingThisBoss) {
          const t = bossBiteRef.current.elapsed;
          const openPhase = Math.min(1, t / 0.28);
          const snapPhase = t < 0.28 ? 0 : Math.min(1, (t - 0.28) / 0.14);
          const jawAngle = openPhase * 0.88 * (1 - snapPhase);
          const pitch = THREE.MathUtils.lerp(-0.18 * openPhase, 0.22, snapPhase);
          const liftY = Math.sin(openPhase * Math.PI * 0.5) * 0.38 * (1 - snapPhase);
          const yaw = Math.atan2(
            runtimeRef.current.playerX - e.x,
            Math.max(0.5, ARENA_CONFIG.playerZ - e.z)
          );

          slot.position.set(e.x, liftY, e.z);
          slot.scale.setScalar(e.scale);
          slot.rotation.set(pitch, yaw * 0.6, 0);

          const lowerJaw = enemyLowerJawRefs.current[i];
          if (lowerJaw) {
            lowerJaw.visible = true;
            lowerJaw.rotation.x = jawAngle;
          }
        } else if (isSkywing) {
          // Quái 3 (Skywing) bay lơ lửng & nghiêng cánh khi lạng zigzag
          const hoverY = 1.15 + Math.sin(elapsed * 4.8 + e.phase) * 0.14;
          const bankZ = Math.sin(elapsed * 3.1 + e.phase) * -0.16;
          slot.position.set(e.x, hoverY, e.z);
          slot.scale.setScalar(e.scale);
          slot.rotation.set(0, 0, bankZ);
        } else if (isBoss && store.activeChapter === 2) {
          // Boss 2 (Nano Hydra mesh tĩnh): lượn nhẹ tạo chuyển động 3 đầu sống động
          slot.position.set(e.x, 0.08 + Math.sin(elapsed * 2.6) * 0.12, e.z);
          slot.scale.setScalar(e.scale);
          slot.rotation.set(0, Math.sin(elapsed * 1.7) * 0.12, 0);
        } else {
          // Quái đi bộ bám sát mặt sàn, giữ nguyên animation bước chân từ file GLB
          slot.position.set(e.x, 0, e.z);
          slot.scale.setScalar(e.scale);
          slot.rotation.set(0, 0, 0);

          const lowerJaw = enemyLowerJawRefs.current[i];
          if (lowerJaw) {
            lowerJaw.visible = isBoss;
            if (isBoss) {
              lowerJaw.rotation.x = 0.08 + Math.max(0, Math.sin(elapsed * 3.5)) * 0.14;
            }
          }
        }
      }

      const upperMouth = enemyUpperMouthRefs.current[i];
      if (upperMouth) {
        upperMouth.visible = isBoss;
      }

      const bodyMesh = enemyBodyRefs.current[i];
      if (bodyMesh) {
        const mat = bodyMesh.material as THREE.MeshStandardMaterial;
        if (e.hitFlash > 0) {
          mat.color.set("#ffffff");
          mat.emissive.set("#ffffff");
          mat.emissiveIntensity = 0.9;
        } else if (isBoss) {
          mat.color.set("#991b1b");
          mat.emissive.set("#dc2626");
          mat.emissiveIntensity = 0.6;
        } else if (isElite) {
          mat.color.set("#7e22ce");
          mat.emissive.set("#581c87");
          mat.emissiveIntensity = 0.35;
        } else {
          mat.color.set("#e11d48");
          mat.emissive.set("#881337");
          mat.emissiveIntensity = 0.25;
        }
      }

      const crownMesh = enemyCrownRefs.current[i];
      if (crownMesh) {
        crownMesh.visible = isElite || isBoss;
      }

      const hpFill = enemyHpFillRefs.current[i];
      if (hpFill) {
        const ratio = Math.max(0.01, e.hp / e.maxHp);
        hpFill.scale.x = ratio;
        hpFill.position.x = -(1 - ratio) * 0.55;
      }
    }

    // Đồng bộ InstancedMesh Đạn (kích thước viên đạn thay đổi theo từng loại súng)
    const bulletMesh = bulletInstancedRef.current;
    if (bulletMesh) {
      const bullets = bulletsPoolRef.current;
      for (let i = 0; i < MAX_BULLETS; i++) {
        const b = bullets[i];
        if (!b.active) {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          bulletMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(0, Math.atan2(-b.vx, -b.vz), 0);
        dummy.scale.set(b.size[0], b.size[1], b.size[2]);
        dummy.updateMatrix();
        bulletMesh.setMatrixAt(i, dummy.matrix);
        tempColor.set(b.color);
        bulletMesh.setColorAt(i, tempColor);
      }
      bulletMesh.instanceMatrix.needsUpdate = true;
      if (bulletMesh.instanceColor) bulletMesh.instanceColor.needsUpdate = true;
    }

    // Đồng bộ InstancedMesh Hạt nổ
    const particleMesh = particleInstancedRef.current;
    if (particleMesh) {
      const particles = particlesPoolRef.current;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          particleMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const scale = p.size * (p.life / p.maxLife);
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(p.life * 8, p.life * 6, 0);
        dummy.scale.setScalar(Math.max(0.001, scale));
        dummy.updateMatrix();
        particleMesh.setMatrixAt(i, dummy.matrix);
        tempColor.set(p.color);
        particleMesh.setColorAt(i, tempColor);
      }
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
    }

    // Đồng bộ InstancedMesh Đạn Độc của Quái 2
    const projMesh = enemyProjectileInstancedRef.current;
    if (projMesh) {
      const projectiles = enemyProjectilesPoolRef.current;
      for (let i = 0; i < MAX_ENEMY_PROJECTILES; i++) {
        const p = projectiles[i];
        if (!p.active) {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          projMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const pulse = 1 + Math.sin(elapsed * 18 + i) * 0.14;
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(elapsed * 6, elapsed * 8, 0);
        dummy.scale.setScalar(p.radius * pulse);
        dummy.updateMatrix();
        projMesh.setMatrixAt(i, dummy.matrix);
        tempColor.set(p.color);
        projMesh.setColorAt(i, tempColor);
      }
      projMesh.instanceMatrix.needsUpdate = true;
      if (projMesh.instanceColor) projMesh.instanceColor.needsUpdate = true;
    }

    // Đồng bộ InstancedMesh Mìn cảm biến (Grenade Launcher Minefield)
    const mineMesh = mineInstancedRef.current;
    if (mineMesh) {
      const mines = proximityMinesPoolRef.current;
      for (let i = 0; i < MAX_PROXIMITY_MINES; i++) {
        const m = mines[i];
        if (!m.active) {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mineMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const blink = 1 + Math.sin(elapsed * 10 + i * 1.3) * 0.16;
        dummy.position.set(m.x, 0.2, m.z);
        dummy.rotation.set(0, elapsed * 2, 0);
        dummy.scale.set(0.38 * blink, 0.2, 0.38 * blink);
        dummy.updateMatrix();
        mineMesh.setMatrixAt(i, dummy.matrix);
        tempColor.set(Math.sin(elapsed * 10 + i) > 0 ? "#ef4444" : "#fb923c");
        mineMesh.setColorAt(i, tempColor);
      }
      mineMesh.instanceMatrix.needsUpdate = true;
      if (mineMesh.instanceColor) mineMesh.instanceColor.needsUpdate = true;
    }

    // Đồng bộ Vùng Phóng Xạ (Nuke Launcher Nuclear Winter 10s)
    const fZones = falloutZonesRef.current;
    for (let i = 0; i < MAX_FALLOUT_ZONES; i++) {
      const grp = falloutMeshRefs.current[i];
      if (!grp) continue;
      const fz = fZones[i];
      if (!fz.active) {
        grp.visible = false;
        continue;
      }
      grp.visible = true;
      grp.position.set(fz.x, 0.05, fz.z);
      const scaleR = fz.radius * Math.min(1, 0.35 + fz.timeLeft * 0.25);
      grp.scale.set(scaleR, 1, scaleR);
      grp.rotation.y = elapsed * 0.55;
    }
  });

  // Giữ màu thanh máu và đạn chuẩn ngay từ frame đầu
  useEffect(() => {
    if (bulletInstancedRef.current) {
      for (let i = 0; i < MAX_BULLETS; i++) {
        bulletInstancedRef.current.setColorAt(i, tempColor.set("#38bdf8"));
      }
      if (bulletInstancedRef.current.instanceColor) {
        bulletInstancedRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (particleInstancedRef.current) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        particleInstancedRef.current.setColorAt(i, tempColor.set("#ffffff"));
      }
      if (particleInstancedRef.current.instanceColor) {
        particleInstancedRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (enemyProjectileInstancedRef.current) {
      for (let i = 0; i < MAX_ENEMY_PROJECTILES; i++) {
        enemyProjectileInstancedRef.current.setColorAt(i, tempColor.set("#84cc16"));
      }
      if (enemyProjectileInstancedRef.current.instanceColor) {
        enemyProjectileInstancedRef.current.instanceColor.needsUpdate = true;
      }
    }
    if (mineInstancedRef.current) {
      for (let i = 0; i < MAX_PROXIMITY_MINES; i++) {
        mineInstancedRef.current.setColorAt(i, tempColor.set("#f97316"));
      }
      if (mineInstancedRef.current.instanceColor) {
        mineInstancedRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, []);

  const aimSpec = getRageSkillSpec(aimingWeaponId ?? activeWeaponId);
  const aimRadius = aimSpec.aoeRadius ?? ICBM_CONFIG.explosionRadius;
  const aimColor =
    aimingWeaponId === "nuke_launcher"
      ? "#4ade80"
      : aimingWeaponId === "cannon"
        ? "#38bdf8"
        : "#fbbf24";

  return (
    <group>
      {/* Nhân vật chính (chỉ trượt ngang trục X) */}
      <PlayerUnit
        ref={playerGroupRef}
        weapon={activeWeapon}
        muzzleFlashRef={muzzleFlashRef}
      />

      {/* Khu vực Cổng Buff Làn Phải (tối đa 2 item / wave) */}
      <WeaponCrate />

      {/* [TURRET DROP] Tháp súng tự động hỗ trợ bắn 10s */}
      {turretActive && (
        <group position={[4.35, 0, 4.9]}>
          <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.62, 0.78, 0.4, 16]} />
            <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.72, 0.9, 24]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
          </mesh>
          <group ref={turretHeadRef} position={[0, 0.68, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.58, 0.44, 0.62]} />
              <meshStandardMaterial color="#d97706" metalness={0.65} roughness={0.28} />
            </mesh>
            <mesh position={[0, 0.04, -0.58]} castShadow>
              <boxGeometry args={[0.16, 0.16, 0.85]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.65} />
            </mesh>
          </group>
        </group>
      )}

      {/* [FREEZE FIELD] Hào quang băng phủ làn trái khi kích hoạt */}
      {freezeActive && (
        <mesh position={[-2.5, 0.03, ARENA_CONFIG.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14.5, ARENA_CONFIG.length - 1.5]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.14} depthWrite={false} />
        </mesh>
      )}

      {/* Pool Quái (Làn trái: phân bổ tự động theo Chương 1 / Chương 2) */}
      {enemyIndices.map((idx) => {
        const visualKind = chapterSlots.getVisualKind(idx);

        const fallbackMesh = (
          <>
            {/* Thân quái */}
            <mesh
              ref={(el) => {
                enemyBodyRefs.current[idx] = el;
              }}
              position={[0, 0.58, 0]}
              castShadow
            >
              <boxGeometry args={[0.92, 1.05, 0.92]} />
              <meshStandardMaterial color="#e11d48" roughness={0.45} metalness={0.25} />
            </mesh>

            {/* Đôi mắt phát sáng hướng về phía người chơi (+Z) */}
            <mesh position={[-0.2, 0.72, 0.47]}>
              <boxGeometry args={[0.16, 0.14, 0.04]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh position={[0.2, 0.72, 0.47]}>
              <boxGeometry args={[0.16, 0.14, 0.04]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>

            {/* Miệng & hàm răng sắc nhọn dành riêng cho Boss */}
            <group
              ref={(el) => {
                enemyUpperMouthRefs.current[idx] = el;
              }}
              position={[0, 0.42, 0.47]}
              visible={false}
            >
              <mesh position={[0, -0.07, -0.01]}>
                <boxGeometry args={[0.56, 0.24, 0.04]} />
                <meshBasicMaterial color="#1c0608" />
              </mesh>
              {[-0.18, 0, 0.18].map((fx) => (
                <mesh key={fx} position={[fx, -0.02, 0.03]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.065, 0.16, 6]} />
                  <meshStandardMaterial color="#fef2f2" roughness={0.25} />
                </mesh>
              ))}
            </group>

            <group
              ref={(el) => {
                enemyLowerJawRefs.current[idx] = el;
              }}
              position={[0, 0.2, 0.34]}
              visible={false}
            >
              <mesh position={[0, -0.04, 0.14]}>
                <boxGeometry args={[0.58, 0.1, 0.16]} />
                <meshStandardMaterial color="#7f1d1d" roughness={0.45} metalness={0.2} />
              </mesh>
              {[-0.14, 0, 0.14].map((fx) => (
                <mesh key={fx} position={[fx, 0.06, 0.18]}>
                  <coneGeometry args={[0.055, 0.14, 6]} />
                  <meshStandardMaterial color="#fef2f2" roughness={0.25} />
                </mesh>
              ))}
            </group>

            {/* Sừng dành cho quái Elite */}
            <mesh
              ref={(el) => {
                enemyCrownRefs.current[idx] = el;
              }}
              position={[0, 1.25, 0]}
              visible={false}
            >
              <octahedronGeometry args={[0.26, 0]} />
              <meshStandardMaterial
                color="#facc15"
                emissive="#eab308"
                emissiveIntensity={1.2}
              />
            </mesh>
          </>
        );

        return (
          <group
            key={idx}
            ref={(el) => {
              enemySlotRefs.current[idx] = el;
            }}
            visible={false}
          >
            <EnemyModelUnit
              key={`${activeChapter}-${idx}`}
              ref={(el) => {
                enemyUnitRefs.current[idx] = el;
              }}
              kind={visualKind}
              fallback={fallbackMesh}
            />

            {/* Thanh máu 3D trên đầu quái */}
            <group
              ref={(el) => {
                enemyHpGroupRefs.current[idx] = el;
              }}
              position={[0, 1.55, 0]}
            >
              <mesh>
                <boxGeometry args={[1.14, 0.14, 0.04]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
              <mesh
                ref={(el) => {
                  enemyHpFillRefs.current[idx] = el;
                }}
                position={[0, 0, 0.03]}
              >
                <boxGeometry args={[1.1, 0.09, 0.03]} />
                <meshBasicMaterial color="#4ade80" />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* InstancedMesh cho toàn bộ Đạn (1 draw call) */}
      <instancedMesh
        ref={bulletInstancedRef}
        args={[undefined, undefined, MAX_BULLETS]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* InstancedMesh cho Hạt nổ (1 draw call) */}
      <instancedMesh
        ref={particleInstancedRef}
        args={[undefined, undefined, MAX_PARTICLES]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* InstancedMesh cho Đạn Độc của Quái 2 (1 draw call) */}
      <instancedMesh
        ref={enemyProjectileInstancedRef}
        args={[undefined, undefined, MAX_ENEMY_PROJECTILES]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* InstancedMesh cho 20 Mìn Cảm Biến (Grenade Launcher Minefield) */}
      <instancedMesh
        ref={mineInstancedRef}
        args={[undefined, undefined, MAX_PROXIMITY_MINES]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 1.2, 1, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Vùng Phóng Xạ 10s của Nuke Launcher (Nuclear Winter) */}
      {FALLOUT_INDICES.map((idx) => (
        <group
          key={`fallout-${idx}`}
          ref={(el) => {
            falloutMeshRefs.current[idx] = el;
          }}
          visible={false}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1, 40]} />
            <meshBasicMaterial color="#65a30d" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.92, 1, 40]} />
            <meshBasicMaterial color="#a3e635" transparent opacity={0.75} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* [CRYO GUN] Blizzard đóng băng toàn làn trái 6s */}
      {activeRageWeaponId === "cryo_gun" && (
        <mesh
          position={[
            (ARENA_CONFIG.leftLaneMinX + ARENA_CONFIG.dividerX) * 0.5,
            0.045,
            ARENA_CONFIG.centerZ,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry
            args={[
              ARENA_CONFIG.dividerX - ARENA_CONFIG.leftLaneMinX,
              ARENA_CONFIG.length,
            ]}
          />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}

      {/* [ACID SPRAYER] Meltdown phủ axit toàn làn trái 5s */}
      {activeRageWeaponId === "acid_sprayer" && (
        <mesh
          position={[
            (ARENA_CONFIG.leftLaneMinX + ARENA_CONFIG.dividerX) * 0.5,
            0.048,
            ARENA_CONFIG.centerZ,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry
            args={[
              ARENA_CONFIG.dividerX - ARENA_CONFIG.leftLaneMinX,
              ARENA_CONFIG.length,
            ]}
          />
          <meshBasicMaterial color="#84cc16" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}

      {/* [LASER CANNON] Superbeam tia laser khổng lồ quét sân 8s */}
      {activeRageWeaponId === "laser_cannon" && (
        <group
          ref={laserBeamGroupRef}
          position={[runtimeRef.current.playerX, 0.92, ARENA_CONFIG.playerZ - 1.1]}
        >
          <mesh position={[0, 0, -23]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.38, 0.52, 46, 12]} />
            <meshBasicMaterial color="#f8fafc" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, -23]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.05, 1.35, 46, 16]} />
            <meshBasicMaterial
              color="#f43f5e"
              transparent
              opacity={0.42}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* [VORTEX GUN] Singularity Hố Đen hút và nghiền nát quái 6s */}
      {activeRageWeaponId === "vortex_gun" && (
        <group
          ref={vortexMeshRef}
          position={[
            (ARENA_CONFIG.leftLaneMinX + ARENA_CONFIG.dividerX) * 0.5,
            0.55,
            -12.5,
          ]}
        >
          <mesh>
            <sphereGeometry args={[1.25, 24, 24]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 4.2, 48]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[2.6, 0.12, 10, 48]} />
            <meshBasicMaterial color="#e879f9" toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* Mặt phẳng bắt tọa độ chuột khi chọn mục tiêu AIM_TARGET (Cannon Orbital / Nuke / ICBM) */}
      {icbmAiming && (
        <>
          <mesh
            position={[0, 0.06, ARENA_CONFIG.centerZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={(e) => {
              aimPosRef.current.x = THREE.MathUtils.clamp(
                e.point.x,
                -ARENA_CONFIG.width / 2,
                ARENA_CONFIG.width / 2
              );
              aimPosRef.current.z = THREE.MathUtils.clamp(e.point.z, -34, 9);
            }}
            onClick={(e) => {
              if (e.delta > 6) return;
              e.stopPropagation();
              const tx = THREE.MathUtils.clamp(
                e.point.x,
                -ARENA_CONFIG.width / 2,
                ARENA_CONFIG.width / 2
              );
              const tz = THREE.MathUtils.clamp(e.point.z, -34, 9);
              useGameStore.getState().launchIcbm(tx, tz, runtimeRef.current.playerX);
            }}
          >
            <planeGeometry args={[ARENA_CONFIG.width + 8, ARENA_CONFIG.length + 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {/* Tâm ngắm laser theo con trỏ chuột */}
          <group ref={aimMarkerRef} position={[aimPosRef.current.x, 0.08, aimPosRef.current.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[Math.max(0.5, aimRadius - 0.25), aimRadius, 48]} />
              <meshBasicMaterial color={aimColor} transparent opacity={0.9} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[aimRadius, 48]} />
              <meshBasicMaterial color={aimColor} transparent opacity={0.14} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[2.2, 0.04, 0.14]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.14, 0.04, 2.2]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        </>
      )}

      {/* Vùng khóa mục tiêu & Đầu đạn / Pháo quỹ đạo (tối đa 3 điểm nổ) */}
      {STRIKE_INDICES.map((idx) => (
        <group
          key={`strike-${idx}`}
          ref={(el) => {
            strikeGroupRefs.current[idx] = el;
          }}
          visible={false}
        >
          <group
            ref={(el) => {
              strikeTargetRefs.current[idx] = el;
            }}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[ICBM_CONFIG.explosionRadius - 0.3, ICBM_CONFIG.explosionRadius, 48]}
              />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.95} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[ICBM_CONFIG.explosionRadius, 48]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.2} depthWrite={false} />
            </mesh>
            <mesh
              ref={(el) => {
                strikeLockRingRefs.current[idx] = el;
              }}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry
                args={[ICBM_CONFIG.explosionRadius - 0.55, ICBM_CONFIG.explosionRadius - 0.3, 48]}
              />
              <meshBasicMaterial color="#fde047" transparent opacity={0.95} />
            </mesh>
            <WorldHtml
              center
              position={[0, 1.4, 0]}
              distanceFactor={18}
              zIndexRange={[1, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div className="select-none whitespace-nowrap rounded-full border border-rose-400 bg-rose-950/95 px-3 py-1 text-xs font-black text-amber-300 shadow-xl">
                {trans.crate.icbmFalling}{" "}
                <span
                  ref={(el) => {
                    strikeCountdownRefs.current[idx] = el;
                  }}
                >
                  1.5s
                </span>
              </div>
            </WorldHtml>
          </group>

          {/* Tên lửa / Đầu đạn bay theo quỹ đạo */}
          <group
            ref={(el) => {
              strikeRocketRefs.current[idx] = el;
            }}
            scale={1.85}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.26, 0.3, 1.5, 16]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.65} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <coneGeometry args={[0.28, 0.62, 16]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={0.8}
              />
            </mesh>
            <mesh position={[0, 0, -0.65]}>
              <boxGeometry args={[0.9, 0.06, 0.32]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
            <mesh position={[0, 0, -0.65]}>
              <boxGeometry args={[0.06, 0.9, 0.32]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
            <mesh position={[0, 0, -0.92]}>
              <sphereGeometry args={[0.26, 10, 10]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
