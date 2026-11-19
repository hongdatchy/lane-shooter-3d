"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  BulletEntity,
  EnemyEntity,
  GameRuntimeRef,
  ParticleEntity,
} from "@/dto/GameDTO";
import { useGameStore } from "@/state-manager/game-store";
import { weaponService } from "@/service/weapon-service";
import { ARENA_CONFIG, ICBM_CONFIG, RAGE_CONFIG } from "@/service/game-constants";
import { gameInput } from "@/service/game-input";
import { soundService } from "@/service/sound-service";
import { PlayerUnit } from "./PlayerUnit";
import { WeaponCrate } from "./WeaponCrate";

interface ArenaWorldProps {
  runtimeRef: React.MutableRefObject<GameRuntimeRef>;
}

const MAX_ENEMIES = 72;
const MAX_BULLETS = 600;
const MAX_PARTICLES = 300;

const dummy = new THREE.Object3D();
const tempColor = new THREE.Color();

export function ArenaWorld({ runtimeRef }: ArenaWorldProps) {
  const weaponIndex = useGameStore((s) => s.weaponIndex);
  const sessionId = useGameStore((s) => s.sessionId);
  const icbmAiming = useGameStore((s) => s.icbmAiming);
  const icbmPending = useGameStore((s) => s.icbmPending);

  const activeWeapon = weaponService.getWeaponByIndex(weaponIndex);

  const playerGroupRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef(0);
  const fireCooldownRef = useRef(0);
  const shotCounterRef = useRef(0);
  const spawnTimerRef = useRef(0.5);
  const enemyIdSeqRef = useRef(1);
  const bossSpawnedStageRef = useRef(0);
  const rageBufferRef = useRef(0);
  const rageUiSyncRef = useRef(0);

  const aimMarkerRef = useRef<THREE.Group>(null);
  const aimPosRef = useRef<{ x: number; z: number }>({
    x: ARENA_CONFIG.playerStartX,
    z: -8,
  });
  const icbmElapsedRef = useRef(0);
  const icbmRocketRef = useRef<THREE.Group>(null);
  const icbmLockRingRef = useRef<THREE.Mesh>(null);
  const icbmCountdownElRef = useRef<HTMLSpanElement>(null);
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

  // Pool dữ liệu game chạy ở 60fps (tránh setState liên tục)
  const enemiesPoolRef = useRef<EnemyEntity[]>(
    Array.from({ length: MAX_ENEMIES }, (_, i) => ({
      active: false,
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

  // Refs tới các mesh quái được render sẵn trong pool
  const enemySlotRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyBodyRefs = useRef<(THREE.Mesh | null)[]>([]);
  const enemyCrownRefs = useRef<(THREE.Mesh | null)[]>([]);
  const enemyUpperMouthRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyLowerJawRefs = useRef<(THREE.Group | null)[]>([]);
  const enemyHpFillRefs = useRef<(THREE.Mesh | null)[]>([]);

  const enemyIndices = useMemo(() => Array.from({ length: MAX_ENEMIES }, (_, i) => i), []);

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
    icbmElapsedRef.current = 0;
    bossBiteRef.current = {
      active: false,
      enemyIndex: -1,
      elapsed: 0,
      hasChomped: false,
      startX: 0,
      startZ: 0,
    };

    for (const enemy of enemiesPoolRef.current) {
      enemy.active = false;
    }
    for (const bullet of bulletsPoolRef.current) {
      bullet.active = false;
    }
    for (const particle of particlesPoolRef.current) {
      particle.active = false;
    }
    if (playerGroupRef.current) {
      playerGroupRef.current.position.set(ARENA_CONFIG.playerStartX, 0, ARENA_CONFIG.playerZ);
      playerGroupRef.current.rotation.set(0, 0, 0);
    }
  }, [sessionId, runtimeRef]);

  // Reset bộ đếm bay tên lửa mỗi lần phóng mới
  useEffect(() => {
    if (icbmPending) {
      icbmElapsedRef.current = 0;
    }
  }, [icbmPending]);

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
    color: string
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
      return;
    }
  };

  const spawnEnemy = (stage: number, zOffset = 0) => {
    const pool = enemiesPoolRef.current;
    const stageCfg = weaponService.getStageConfig(stage);

    for (let i = 0; i < pool.length; i++) {
      const e = pool[i];
      if (e.active) continue;

      if (stageCfg.isBossStage) {
        e.active = true;
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
        runtimeRef.current.screenShake = 0.55;
        return;
      }

      const isElite = Math.random() < stageCfg.eliteChance;
      const baseScale = isElite ? stageCfg.eliteScale : stageCfg.normalScale;
      // Quái to ngẫu nhiên hơn nữa (0.9x -> 1.25x): con nào càng to thì máu càng trâu theo lũy thừa kích thước
      const sizeFactor = isElite
        ? 0.95 + Math.random() * 0.3
        : 0.88 + Math.random() * 0.26;
      const finalScale = baseScale * sizeFactor;

      const baseHp = isElite ? stageCfg.eliteHp : stageCfg.normalHp;
      const scaledHp = Math.max(1, Math.round(baseHp * Math.pow(sizeFactor, 1.75)));

      const baseSpeed = isElite ? stageCfg.eliteSpeed : stageCfg.normalSpeed;
      const speedJitter = (0.94 + Math.random() * 0.14) / Math.pow(sizeFactor, 0.35);

      const margin = Math.min(1.6, 0.55 * finalScale);
      const minX = ARENA_CONFIG.leftLaneMinX + margin;
      const maxX = ARENA_CONFIG.leftLaneMaxX - margin;

      e.active = true;
      e.id = enemyIdSeqRef.current++;
      e.kind = isElite ? "ELITE" : "NORMAL";
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
      if (!boss || !boss.active) {
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

      // 2. Xử lý bắn đạn theo thông số vũ khí + trạng thái Nộ (tốc bắn x2, đạn bay x2, số đạn x10 trong 10s)
      const isRaging = store.rageActive;
      const isRageLocked =
        isRaging || store.rageReady || store.icbmAiming || store.icbmPending !== null;
      if (isRageLocked) {
        rageBufferRef.current = 0;
      } else if (RAGE_CONFIG.regenPerSecond > 0) {
        rageBufferRef.current += RAGE_CONFIG.regenPerSecond * RAGE_CONFIG.gainMultiplier * delta;
      }
      if (isRaging) {
        rageUiSyncRef.current += delta;
        if (rageUiSyncRef.current >= 0.08) {
          store.tickRage(rageUiSyncRef.current);
          rageUiSyncRef.current = 0;
        }
      }

      // Cập nhật tâm ngắm & quỹ đạo Tên Lửa Liên Lục Địa (delay 2s -> 100.000 Dame)
      if (store.icbmAiming && aimMarkerRef.current) {
        aimMarkerRef.current.position.set(aimPosRef.current.x, 0.08, aimPosRef.current.z);
        aimMarkerRef.current.rotation.y = state.clock.elapsedTime * 1.4;
      }

      if (store.icbmPending) {
        const strike = store.icbmPending;
        icbmElapsedRef.current += delta;
        const p = Math.min(1, icbmElapsedRef.current / strike.delaySeconds);
        const remaining = Math.max(0, strike.delaySeconds - icbmElapsedRef.current);

        if (icbmCountdownElRef.current) {
          icbmCountdownElRef.current.textContent = `${remaining.toFixed(1)}s`;
        }
        if (icbmLockRingRef.current) {
          icbmLockRingRef.current.scale.setScalar(Math.max(0.06, 1 - p));
        }
        if (icbmRocketRef.current) {
          const mx = THREE.MathUtils.lerp(strike.startX, strike.targetX, p);
          const mz = THREE.MathUtils.lerp(strike.startZ, strike.targetZ, p);
          const my = THREE.MathUtils.lerp(1.5, 0.35, p) + Math.sin(p * Math.PI) * 18;
          icbmRocketRef.current.position.set(mx, my, mz);

          const pNext = Math.min(1, p + 0.015);
          const nx = THREE.MathUtils.lerp(strike.startX, strike.targetX, pNext);
          const nz = THREE.MathUtils.lerp(strike.startZ, strike.targetZ, pNext);
          const ny = THREE.MathUtils.lerp(1.5, 0.35, pNext) + Math.sin(pNext * Math.PI) * 18;
          icbmRocketRef.current.lookAt(nx, ny, nz);

          if (Math.random() < 0.7) {
            spawnParticles(mx, my, mz, "#fb923c", 2, 0.65);
          }
        }

        // Tên lửa chạm mục tiêu sau 2s -> Gây 100.000 sát thương diện rộng
        if (icbmElapsedRef.current >= strike.delaySeconds) {
          const enemies = enemiesPoolRef.current;
          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (!e.active) continue;
            const dx = e.x - strike.targetX;
            const dz = e.z - strike.targetZ;
            const effectiveRadius = ICBM_CONFIG.explosionRadius + e.radius;
            if (dx * dx + dz * dz <= effectiveRadius * effectiveRadius) {
              e.hp -= ICBM_CONFIG.missileDamage;
              e.hitFlash = 0.25;
              if (e.hp <= 0) {
                e.active = false;
                const isBoss = e.kind === "BOSS";
                const deathColor = isBoss ? "#facc15" : e.kind === "ELITE" ? "#c084fc" : "#fb7185";
                spawnParticles(
                  e.x,
                  0.85 * e.scale,
                  e.z,
                  deathColor,
                  isBoss ? 55 : 16,
                  isBoss ? 2.0 : 1.35
                );
                soundService.play(isBoss ? "killBoss" : "killEnemy");
                useGameStore
                  .getState()
                  .registerEnemyKill(isBoss ? 500 : e.kind === "ELITE" ? 30 : 10);
              } else {
                // Đẩy lùi quái/Boss ra xa tâm nổ tên lửa theo hướng xuyên tâm (trái/phải/tiến/lùi tùy điểm bắn)
                const dist = Math.hypot(dx, dz);
                const dirX = dist > 0.001 ? dx / dist : 0;
                const dirZ = dist > 0.001 ? dz / dist : -1;
                const falloff = 1 - Math.min(1, dist / effectiveRadius) * 0.45;
                const pushSpeed = ICBM_CONFIG.knockbackSpeed * falloff;
                e.knockbackVx += dirX * pushSpeed;
                e.knockbackVz += dirZ * pushSpeed;
              }
            }
          }

          spawnParticles(strike.targetX, 1.5, strike.targetZ, "#f97316", 65, 2.4);
          spawnParticles(strike.targetX, 2.0, strike.targetZ, "#fde047", 40, 2.0);
          runtimeRef.current.screenShake = 1.25;
          soundService.play("icbmImpact");
          useGameStore.getState().finishIcbmStrike();
        }
      }

      fireCooldownRef.current -= delta;
      const shouldFire = store.autoFire || gameInput.fire;
      const weapon = weaponService.getWeaponByIndex(store.weaponIndex);
      const baseRate = weaponService.getEffectiveFireRate(weapon, store.overdriveLevel);
      const effectiveRate = isRaging ? baseRate * RAGE_CONFIG.fireRateMultiplier : baseRate;
      const effectiveDamage = weaponService.getEffectiveDamage(weapon, store.overdriveLevel);
      const effectiveBulletSpeed = isRaging
        ? weapon.bulletSpeed * RAGE_CONFIG.bulletSpeedMultiplier
        : weapon.bulletSpeed;
      const shotsPerBurst = isRaging
        ? weapon.bulletCount * RAGE_CONFIG.bulletCountMultiplier
        : weapon.bulletCount;

      if (shouldFire && fireCooldownRef.current <= 0) {
        fireCooldownRef.current = 1 / effectiveRate;
        muzzleFlashRef.current = weapon.id === "cannon" ? 0.14 : 0.06;
        shotCounterRef.current += 1;

        if (weapon.id === "pistol") soundService.play("shootPistol");
        else if (weapon.id === "ak-rifle") soundService.play("shootAk");
        else if (weapon.id === "machine-gun") soundService.play("shootMachineGun");
        else soundService.play("shootCannon");

        if (isRaging) {
          // Mưa đạn Nộ: đọc cấu hình tỏa quạt & nhân tốc từ RAGE_CONFIG
          const fanSpreadRad = THREE.MathUtils.degToRad(RAGE_CONFIG.fanSpreadDeg);
          for (let k = 0; k < shotsPerBurst; k++) {
            const t = shotsPerBurst === 1 ? 0 : k / (shotsPerBurst - 1) - 0.5;
            const jitter = THREE.MathUtils.degToRad(
              (Math.random() - 0.5) * RAGE_CONFIG.fanJitterDeg
            );
            const angle = t * fanSpreadRad + jitter;
            const offsetX = t * RAGE_CONFIG.fanOffsetWidth;
            const vx = Math.sin(angle) * effectiveBulletSpeed;
            const vz = -Math.cos(angle) * effectiveBulletSpeed;
            const bulletColor = k % 2 === 0 ? "#fbbf24" : "#f97316";

            spawnBullet(
              runtimeRef.current.playerX + offsetX,
              ARENA_CONFIG.playerZ - 1.15,
              vx,
              vz,
              effectiveDamage,
              weapon.splashRadius,
              weapon.bulletSize,
              bulletColor
            );
          }
        } else {
          // Bắn thường theo loại súng
          const barrelOffsetX =
            weapon.id === "machine-gun"
              ? ((shotCounterRef.current % 3) - 1) * 0.16
              : 0;

          const jitterRad = THREE.MathUtils.degToRad(
            (Math.random() - 0.5) * weapon.spreadDeg
          );
          const vx = Math.sin(jitterRad) * effectiveBulletSpeed;
          const vz = -Math.cos(jitterRad) * effectiveBulletSpeed;

          spawnBullet(
            runtimeRef.current.playerX + barrelOffsetX,
            ARENA_CONFIG.playerZ - 1.15,
            vx,
            vz,
            effectiveDamage,
            weapon.splashRadius,
            weapon.bulletSize,
            weapon.bulletColor
          );
        }
      }

      // 3. Sinh quái bên làn trái theo cấu hình của Màn hiện tại (1 -> 6)
      const stageCfg = weaponService.getStageConfig(store.wave);
      if (stageCfg.isBossStage) {
        if (bossSpawnedStageRef.current !== store.wave) {
          // Dọn sạch quái nhỏ còn sót lại để bước vào trận đấu 1v1 với Boss Siêu To Khổng Lồ
          for (const enemy of enemiesPoolRef.current) {
            enemy.active = false;
          }
          spawnEnemy(store.wave, 0);
          bossSpawnedStageRef.current = store.wave;
        }
      } else {
        spawnTimerRef.current -= delta;
        if (spawnTimerRef.current <= 0) {
          const batchCount =
            stageCfg.maxBatchSize === 1
              ? 1
              : 1 + Math.floor(Math.random() * stageCfg.maxBatchSize);

          for (let k = 0; k < batchCount; k++) {
            spawnEnemy(store.wave, k * 1.65);
          }
          spawnTimerRef.current =
            stageCfg.spawnMinInterval +
            Math.random() * (stageCfg.spawnMaxInterval - stageCfg.spawnMinInterval);
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
        b.x += b.vx * delta;
        b.z += b.vz * delta;

        if (b.z < ARENA_CONFIG.bulletDespawnZ || Math.abs(b.x) > maxBulletX) {
          b.active = false;
          continue;
        }

        const midX = (prevX + b.x) * 0.5;
        const midZ = (prevZ + b.z) * 0.5;

        // Va chạm với bệ Vũ Khí bên làn phải (chỉ nhận đạn khi vẫn còn súng tiếp theo có thể mở ở màn hiện tại)
        const canUpgradeCrate =
          weaponService.getNextWeapon(store.weaponIndex, store.wave) !== null;
        if (canUpgradeCrate) {
          const hitCrateNow =
            Math.abs(b.x - ARENA_CONFIG.crateX) <= ARENA_CONFIG.crateHalfWidth &&
            Math.abs(b.z - ARENA_CONFIG.crateZ) <= ARENA_CONFIG.crateHalfDepth;
          const hitCrateMid =
            Math.abs(midX - ARENA_CONFIG.crateX) <= ARENA_CONFIG.crateHalfWidth &&
            Math.abs(midZ - ARENA_CONFIG.crateZ) <= ARENA_CONFIG.crateHalfDepth;

          if (hitCrateNow || hitCrateMid) {
            b.active = false;
            runtimeRef.current.cratePulse = 1;
            soundService.play("hitCrate");
            spawnParticles(b.x, 1.0, b.z, b.color, b.splashRadius > 0 ? 10 : 4, 0.9);

            const result = store.registerCrateHit();
            if (result.upgraded) {
              spawnParticles(ARENA_CONFIG.crateX, 1.4, ARENA_CONFIG.crateZ, "#fbbf24", 26, 1.5);
              if (!isRageLocked) {
                rageBufferRef.current +=
                  RAGE_CONFIG.gainPerCrateUpgrade * RAGE_CONFIG.gainMultiplier;
              }
            }
            continue;
          }
        }

        // Va chạm với Quái ở làn trái (tính khoảng cách từ đoạn đường đạn đi tới tâm quái để không xuyên qua khi bay x2)
        const segX = b.x - prevX;
        const segZ = b.z - prevZ;
        const segLenSq = segX * segX + segZ * segZ;

        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active) continue;

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
            b.active = false;
            e.hp -= b.damage;
            e.hitFlash = 0.09;

            if (!isRageLocked) {
              const hitGain =
                b.splashRadius > 0 ? RAGE_CONFIG.gainPerCannonHit : RAGE_CONFIG.gainPerHit;
              rageBufferRef.current += hitGain * RAGE_CONFIG.gainMultiplier;
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
                if (!other.active) continue;
                const sdx = other.x - closestX;
                const sdz = other.z - closestZ;
                if (sdx * sdx + sdz * sdz <= splashSq) {
                  other.hp -= b.damage * 0.55;
                  other.hitFlash = 0.09;
                  if (other.hp <= 0) {
                    other.active = false;
                    soundService.play("killEnemy");
                    spawnParticles(other.x, 0.9, other.z, "#f43f5e", 12, 1.25);
                    if (!isRageLocked) {
                      const splashKillGain =
                        other.kind === "ELITE"
                          ? RAGE_CONFIG.gainPerEliteKill
                          : RAGE_CONFIG.gainPerNormalKill;
                      rageBufferRef.current += splashKillGain * RAGE_CONFIG.gainMultiplier;
                    }
                    useGameStore.getState().registerEnemyKill(other.kind === "ELITE" ? 30 : 10);
                  }
                }
              }
            } else {
              soundService.play("hitEnemy");
              spawnParticles(closestX, 0.75, closestZ, b.color, isRaging ? 2 : 4, 0.75);
            }

            if (e.hp <= 0) {
              e.active = false;
              const isBoss = e.kind === "BOSS";
              soundService.play(isBoss ? "killBoss" : "killEnemy");
              const deathColor = isBoss ? "#facc15" : e.kind === "ELITE" ? "#c084fc" : "#fb7185";
              spawnParticles(
                e.x,
                0.85 * e.scale,
                e.z,
                deathColor,
                isBoss ? 48 : 14,
                isBoss ? 1.85 : 1.3
              );
              if (!isRageLocked && !isBoss) {
                const killGain =
                  e.kind === "ELITE"
                    ? RAGE_CONFIG.gainPerEliteKill
                    : RAGE_CONFIG.gainPerNormalKill;
                rageBufferRef.current += killGain * RAGE_CONFIG.gainMultiplier;
              }
              useGameStore
                .getState()
                .registerEnemyKill(isBoss ? 500 : e.kind === "ELITE" ? 30 : 10);
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

      // 5. Cập nhật quái di chuyển về phía nhân vật + hiệu ứng văng lùi khi trúng Tên Lửa
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active) continue;

        e.z += e.speed * delta;
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
          e.active = false;
          runtimeRef.current.screenShake = 0.45;
          spawnParticles(e.x, 0.8, ARENA_CONFIG.defenseLineZ, "#ef4444", 20, 1.4);
          useGameStore.getState().damagePlayer(1);
        }
      }
    }

    // 6. Cập nhật hạt nổ (vẫn chạy nốt hiệu ứng ngay cả khi vừa Game Over / Victory)
    if (store.gameStatus !== "PAUSED") {
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
      const isElite = e.kind === "ELITE";
      const isBoss = e.kind === "BOSS";
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
      } else {
        const bobSpeed = isBoss ? 4.2 : 7.5;
        const bobY = Math.abs(Math.sin(elapsed * bobSpeed + e.phase)) * (isBoss ? 0.22 : 0.14);
        slot.position.set(e.x, bobY, e.z);
        slot.scale.setScalar(e.scale);
        slot.rotation.set(0, 0, Math.sin(elapsed * bobSpeed + e.phase) * (isBoss ? 0.05 : 0.08));

        const lowerJaw = enemyLowerJawRefs.current[i];
        if (lowerJaw) {
          lowerJaw.visible = isBoss;
          if (isBoss) {
            lowerJaw.rotation.x = 0.08 + Math.max(0, Math.sin(elapsed * 3.5)) * 0.14;
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
  }, []);

  return (
    <group>
      {/* Nhân vật chính (chỉ trượt ngang trục X) */}
      <PlayerUnit
        ref={playerGroupRef}
        weapon={activeWeapon}
        muzzleFlashRef={muzzleFlashRef}
      />

      {/* Hòm Item / Vũ khí cố định bên làn phải (Kiểu B) */}
      <WeaponCrate runtimeRef={runtimeRef} />

      {/* Pool Quái (Làn trái) */}
      {enemyIndices.map((idx) => (
        <group
          key={idx}
          ref={(el) => {
            enemySlotRefs.current[idx] = el;
          }}
          visible={false}
        >
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

          {/* Thanh máu 3D trên đầu quái */}
          <group position={[0, 1.55, 0]}>
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
      ))}

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

      {/* Mặt phẳng bắt tọa độ chuột khi chọn mục tiêu phóng Tên Lửa Liên Lục Địa */}
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
              <ringGeometry
                args={[ICBM_CONFIG.explosionRadius - 0.25, ICBM_CONFIG.explosionRadius, 48]}
              />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[ICBM_CONFIG.explosionRadius, 48]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.14} depthWrite={false} />
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

      {/* Vùng khóa mục tiêu & Tên Lửa Liên Lục Địa đang bay trong 2s */}
      {icbmPending && (
        <>
          <group position={[icbmPending.targetX, 0.08, icbmPending.targetZ]}>
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
            <mesh ref={icbmLockRingRef} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[ICBM_CONFIG.explosionRadius - 0.55, ICBM_CONFIG.explosionRadius - 0.3, 48]}
              />
              <meshBasicMaterial color="#fde047" transparent opacity={0.95} />
            </mesh>
            <Html center position={[0, 1.4, 0]} distanceFactor={18} style={{ pointerEvents: "none" }}>
              <div className="select-none whitespace-nowrap rounded-full border border-rose-400 bg-rose-950/95 px-3 py-1 text-xs font-black text-amber-300 shadow-xl">
                TÊN LỬA RƠI SAU <span ref={icbmCountdownElRef}>{icbmPending.delaySeconds.toFixed(1)}s</span>
              </div>
            </Html>
          </group>

          {/* Quả Tên Lửa Liên Lục Địa bay theo quỹ đạo cầu vồng (+Z là đuôi, +Z/-Z hướng theo lookAt) */}
          <group ref={icbmRocketRef} position={[icbmPending.startX, 1.5, icbmPending.startZ]} scale={1.85}>
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
        </>
      )}
    </group>
  );
}
