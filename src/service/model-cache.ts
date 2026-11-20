import * as THREE from "three";
import { DEFAULT_R2_ASSET_URL } from "@/lib/utils";

const MODEL_CACHE_STORAGE_NAME = "lane-shooter-3d-models-v1";

// Bật bộ nhớ đệm RAM nội bộ của Three.js trong suốt phiên chơi
THREE.Cache.enabled = true;

let isFetchPatched = false;

interface CachedBufferPayload {
  buffer: ArrayBuffer;
  contentType: string;
}

const inFlightDownloads = new Map<string, Promise<CachedBufferPayload>>();

function isModelAssetUrl(url: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (
    cleanUrl.endsWith(".glb") ||
    cleanUrl.endsWith(".gltf") ||
    cleanUrl.endsWith(".fbx") ||
    cleanUrl.endsWith(".bin")
  ) {
    return true;
  }
  const r2Base = (
    process.env.NEXT_PUBLIC_R2_ASSET_URL ?? DEFAULT_R2_ASSET_URL
  )
    .trim()
    .toLowerCase();
  return Boolean(r2Base && cleanUrl.startsWith(r2Base));
}

function buildResponseFromBuffer(payload: CachedBufferPayload): Response {
  return new Response(payload.buffer.slice(0), {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": payload.contentType || "application/octet-stream",
      "Content-Length": String(payload.buffer.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

/**
 * Kích hoạt bộ nhớ đệm 2 tầng cho toàn bộ file 3D (.glb, .fbx) từ Cloudflare R2:
 * 1. THREE.Cache (RAM): dùng lại ngay trong phiên chơi mà không parse/tải lại.
 * 2. Browser CacheStorage (Ổ cứng trình duyệt): lưu bền vững qua các lần F5 / đóng mở lại trình duyệt.
 */
export function installModelBrowserCache(): void {
  if (typeof window === "undefined" || isFetchPatched) {
    return;
  }
  isFetchPatched = true;
  THREE.Cache.enabled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const method = (
      init?.method ||
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (method !== "GET" || !isModelAssetUrl(url)) {
      return nativeFetch(input, init);
    }

    const canUseCacheStorage = "caches" in window;

    // 1. Kiểm tra trong ổ cứng trình duyệt (CacheStorage) trước
    if (canUseCacheStorage) {
      try {
        const cache = await window.caches.open(MODEL_CACHE_STORAGE_NAME);
        const cachedRes = await cache.match(url);
        if (cachedRes && cachedRes.ok) {
          return cachedRes;
        }
      } catch {
        // Nếu trình duyệt chặn CacheStorage (ví dụ chế độ ẩn danh nghiêm ngặt) -> bỏ qua xuống bước tải mạng
      }
    }

    // 2. Gom các request trùng URL đang tải cùng lúc thành 1 lượt tải duy nhất
    let pending = inFlightDownloads.get(url);
    if (!pending) {
      pending = (async (): Promise<CachedBufferPayload> => {
        const netRes = await nativeFetch(url, {
          ...init,
          method: "GET",
          mode: "cors",
          credentials: "omit",
        });

        if (!netRes.ok) {
          throw new Error(`Không tải được model từ R2 (${netRes.status}): ${url}`);
        }

        const contentType =
          netRes.headers.get("Content-Type") || "application/octet-stream";
        const buffer = await netRes.arrayBuffer();

        // Lưu bền vững vào CacheStorage của trình duyệt để các lần mở game sau không cần tải lại
        if (canUseCacheStorage && buffer.byteLength > 0) {
          try {
            const cache = await window.caches.open(MODEL_CACHE_STORAGE_NAME);
            await cache.put(
              url,
              buildResponseFromBuffer({ buffer, contentType })
            );
          } catch {
            // Bỏ qua nếu đầy bộ nhớ cache trình duyệt
          }
        }

        return { buffer, contentType };
      })();

      inFlightDownloads.set(url, pending);
    }

    try {
      const payload = await pending;
      return buildResponseFromBuffer(payload);
    } catch {
      return nativeFetch(input, init);
    } finally {
      inFlightDownloads.delete(url);
    }
  };
}

// Tự động kích hoạt ngay khi module được nạp ở phía client
if (typeof window !== "undefined") {
  installModelBrowserCache();
}
