import { useFBX, useGLTF } from "@react-three/drei";
import { isLocalAssetMode, withAssetBase } from "@/lib/utils";
import { isModelCached } from "@/service/model-cache";
import { useGameStore } from "@/state-manager/game-store";

// Thứ tự tải: các model Quái (enemies/), Boss theo màn (bosses/stage1/, bosses/stage2/, bosses/stage3/) và model nhân vật (.glb).
export const PRELOAD_MODEL_FILES = [
  "models/enemies/crawler-walk-death-texture.glb",
  "models/enemies/husk-walk-death-poison-texture.glb",
  "models/enemies/skywing-v2.glb",
  "models/enemies/shell_brute.glb",
  "models/enemies/dasher.glb",
  "models/enemies/bloater.glb",
  "models/bosses/stage1/iron-warden-mechanical.glb",
  "models/bosses/stage2/nano-hydra-base-v4.glb",
  "models/bosses/stage3/chien-binh-thoi-gian-v2.glb",
  "models/linh-cyber-v3.glb",
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
