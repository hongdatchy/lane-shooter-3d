import { useFBX, useGLTF } from "@react-three/drei";
import { isLocalAssetMode, withAssetBase } from "@/lib/utils";
import { isModelCached } from "@/service/model-cache";
import { useGameStore } from "@/state-manager/game-store";

// Thứ tự tải: 3 model Cửa 1 (.glb: Quái 1, Quái 2, Boss 1) và 3 model Mixamo nhân vật (.fbx).
export const PRELOAD_MODEL_FILES = [
  "models/classic/stage1/crawler_walk.glb",
  "models/classic/stage1/husk_rigged Walking.glb",
  "models/classic/stage1/enemy-boss.glb",
  "models/player-idle.fbx",
  "models/player-left.fbx",
  "models/player-right.fbx",
];

let isPreloading = false;
let isPreloadDone = false;

export function isAssetsFullyLoaded(): boolean {
  return isPreloadDone || useGameStore.getState().assetsReady;
}

/**
 * Tải ngầm toàn bộ model 3D ngay khi vào trang web:
 * - Lưu trực tiếp vào CacheStorage của trình duyệt.
 * - Cập nhật tiến độ % (theo số file hoàn thành) vào useGameStore.
 * - Khi hoàn thành, gọi useFBX.preload / useGLTF.preload để parse sẵn vào RAM.
 */
export async function startBackgroundPreload(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (isPreloadDone) {
    useGameStore.getState().setAssetsReady(true);
    return true;
  }

  if (isPreloading) {
    return false;
  }

  isPreloading = true;
  const store = useGameStore.getState();
  const total = PRELOAD_MODEL_FILES.length;

  store.setAssetsError(null);
  store.setAssetProgress(0, total);

  let loadedCount = 0;
  let firstErrorMessage: string | null = null;

  for (const filePath of PRELOAD_MODEL_FILES) {
    const url = withAssetBase(encodeURI(filePath));
    const isFbx = filePath.toLowerCase().endsWith(".fbx");

    try {
      // 1. Kiểm tra xem file đã được lưu trong CacheStorage từ các lần chơi trước chưa
      const alreadyCached = await isModelCached(url);

      if (!alreadyCached) {
        // Tải từ `public/models/` ở local dev hoặc từ R2 CDN ở production (không fallback ngầm)
        const res = await window.fetch(url);
        if (!res.ok) {
          throw new Error(
            `HTTP ${res.status} tải ${url} (${isLocalAssetMode() ? "local" : "R2"})`
          );
        }
        await res.arrayBuffer();
      }

      // 2. Parse sẵn vào bộ nhớ RAM của Three.js
      if (isFbx) {
        useFBX.preload(url);
      } else {
        useGLTF.preload(url);
      }

      loadedCount++;
      useGameStore.getState().setAssetProgress(loadedCount, total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[AssetPreloader] Lỗi khi tải tài nguyên ${filePath}:`, err);
      if (!firstErrorMessage) {
        firstErrorMessage = `${filePath}: ${msg}`;
      }
    }
  }

  isPreloading = false;

  if (loadedCount >= total) {
    isPreloadDone = true;
    useGameStore.getState().setAssetsReady(true);
    return true;
  }

  if (firstErrorMessage) {
    useGameStore.getState().setAssetsError(firstErrorMessage);
  }

  return false;
}

// Tự động khởi chạy tải ngầm ngay khi script được nạp vào client
if (typeof window !== "undefined") {
  setTimeout(() => {
    startBackgroundPreload();
  }, 100);
}
