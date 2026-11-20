import { useFBX, useGLTF } from "@react-three/drei";
import { withAssetBase } from "@/lib/utils";
import { isModelCached } from "@/service/model-cache";
import { useGameStore } from "@/state-manager/game-store";

// Thứ tự tải: 3 model quái (.glb dung lượng rất nhẹ ~1MB) trước để % tăng nhanh ngay lập tức,
// sau đó đến 3 model Mixamo của nhân vật (.fbx).
export const PRELOAD_MODEL_FILES = [
  "models/enemy-normal.glb",
  "models/enemy-elite.glb",
  "models/enemy-boss.glb",
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
  let hasFailed = false;

  for (const filePath of PRELOAD_MODEL_FILES) {
    const url = withAssetBase(filePath);
    const isFbx = filePath.toLowerCase().endsWith(".fbx");

    try {
      // 1. Kiểm tra xem file đã được lưu trong CacheStorage từ các lần chơi trước chưa
      const alreadyCached = await isModelCached(url);

      if (!alreadyCached) {
        // Tải file về (model-cache sẽ tự động lưu vào CacheStorage và có sẵn cơ chế fallback)
        const res = await window.fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} tải ${url}`);
        }
        await res.arrayBuffer();
      }

      // 2. Parse sẵn vào bộ nhớ RAM của Three.js
      try {
        if (isFbx) {
          useFBX.preload(url);
        } else {
          useGLTF.preload(url);
        }
      } catch {
        // Nếu môi trường chưa mount Canvas R3F thì bỏ qua bước parse trước
      }

      loadedCount++;
      useGameStore.getState().setAssetProgress(loadedCount, total);
    } catch (err) {
      console.warn(`[AssetPreloader] Lỗi khi tải tài nguyên ${filePath}:`, err);
      hasFailed = true;
    }
  }

  isPreloading = false;

  if (loadedCount >= total) {
    isPreloadDone = true;
    useGameStore.getState().setAssetsReady(true);
    return true;
  }

  if (hasFailed) {
    useGameStore
      .getState()
      .setAssetsError("Không thể tải đủ tất cả model 3D (vui lòng kiểm tra CORS trên R2 hoặc mạng).");
  }

  return false;
}

// Tự động khởi chạy tải ngầm ngay khi script được nạp vào client
if (typeof window !== "undefined") {
  setTimeout(() => {
    startBackgroundPreload();
  }, 100);
}
