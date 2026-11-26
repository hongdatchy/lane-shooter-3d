import * as THREE from "three";
import { DEFAULT_R2_ASSET_URL, isLocalAssetMode } from "@/lib/utils";

export const MODEL_CACHE_STORAGE_NAME = "lane-shooter-3d-models-v3";

// Bật bộ nhớ đệm RAM nội bộ của Three.js trong suốt phiên chơi
THREE.Cache.enabled = true;

let isFetchPatched = false;

interface CachedBufferPayload {
  buffer: ArrayBuffer;
  contentType: string;
}

const inFlightDownloads = new Map<string, Promise<CachedBufferPayload>>();
// Cache trong RAM theo từng phiên tab (F5 sẽ tự reset để đọc file local mới nhất)
const sessionMemoryCache = new Map<string, CachedBufferPayload>();

function toCanonicalUrl(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

export function isModelAssetUrl(url: string): boolean {
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
  const r2Base = (process.env.NEXT_PUBLIC_R2_ASSET_URL ?? DEFAULT_R2_ASSET_URL)
    .trim()
    .toLowerCase();
  return Boolean(r2Base && cleanUrl.startsWith(r2Base));
}

/**
 * Kiểm tra xem buffer tải về có phải là trang HTML lỗi (403/404 từ Cloudflare/Nginx) hay không.
 * Tránh trường hợp Three.js cố parse HTML dẫn tới crash JSON/FBX parser.
 */
export function isHtmlBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 64));
  let i = 0;
  while (
    i < view.length &&
    (view[i] === 32 || view[i] === 9 || view[i] === 10 || view[i] === 13)
  ) {
    i++;
  }
  return view[i] === 60; // Ký tự '<' (0x3C)
}

export function buildResponseFromBuffer(
  payload: CachedBufferPayload,
): Response {
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
 * Kiểm tra xem một URL model đã có sẵn trong CacheStorage của trình duyệt chưa
 */
export async function isModelCached(url: string): Promise<boolean> {
  if (isLocalAssetMode()) {
    return false;
  }
  if (typeof window === "undefined" || !("caches" in window)) {
    return false;
  }
  try {
    const cache = await window.caches.open(MODEL_CACHE_STORAGE_NAME);
    const canonicalUrl = toCanonicalUrl(url);
    const match = (await cache.match(canonicalUrl)) ?? (await cache.match(url));
    if (!match || !match.ok) return false;
    const buf = await match.clone().arrayBuffer();
    return !isHtmlBuffer(buf);
  } catch {
    return false;
  }
}

/**
 * Kích hoạt bộ nhớ đệm 2 tầng cho toàn bộ file 3D (.glb, .fbx):
 * 1. THREE.Cache (RAM): dùng lại ngay trong phiên chơi mà không parse/tải lại.
 * 2. Browser CacheStorage (Ổ cứng trình duyệt): lưu bền vững qua các lần F5 / đóng mở lại trình duyệt.
 * TUYỆT ĐỐI không fallback ngầm và chặn các trang HTML lỗi 403/404 lọt vào Three.js.
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
    init?: RequestInit,
  ): Promise<Response> => {
    const method = (
      init?.method || (input instanceof Request ? input.method : "GET")
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

    const canonicalUrl = toCanonicalUrl(url);
    const cachedInRam = sessionMemoryCache.get(canonicalUrl);
    if (cachedInRam) {
      return buildResponseFromBuffer(cachedInRam);
    }

    const useLocalMode = isLocalAssetMode();
    const canUseCacheStorage = !useLocalMode && "caches" in window;

    // 1. Kiểm tra trong ổ cứng trình duyệt (CacheStorage) trước (chỉ áp dụng cho CDN production; local dev luôn đọc file mới từ public/)
    if (canUseCacheStorage) {
      try {
        const cache = await window.caches.open(MODEL_CACHE_STORAGE_NAME);
        const cachedRes =
          (await cache.match(canonicalUrl)) ?? (await cache.match(url));
        if (cachedRes && cachedRes.ok) {
          const testBuffer = await cachedRes.clone().arrayBuffer();
          if (!isHtmlBuffer(testBuffer)) {
            const payload: CachedBufferPayload = {
              buffer: testBuffer,
              contentType:
                cachedRes.headers.get("Content-Type") ||
                "application/octet-stream",
            };
            sessionMemoryCache.set(canonicalUrl, payload);
            return buildResponseFromBuffer(payload);
          }
          // Nếu lỡ cache phải trang HTML lỗi trước đó thì xóa bỏ
          await cache.delete(canonicalUrl);
          await cache.delete(url);
        }
      } catch {
        // Bỏ qua nếu chế độ ẩn danh chặn
      }
    }

    // 2. Gom các request trùng URL đang tải cùng lúc thành 1 lượt tải duy nhất
    let pending = inFlightDownloads.get(canonicalUrl);
    if (!pending) {
      pending = (async (): Promise<CachedBufferPayload> => {
        const isCrossOrigin =
          /^https?:\/\//i.test(canonicalUrl) &&
          typeof window !== "undefined" &&
          !canonicalUrl.startsWith(window.location.origin);
        const netRes = await nativeFetch(canonicalUrl, {
          ...init,
          method: "GET",
          // Bỏ qua HTTP Disk Cache của Chromium để tránh lỗi net::ERR_CACHE_WRITE_FAILURE với file model lớn (115MB) / local dev
          cache: "no-store",
          mode: isCrossOrigin ? "cors" : "same-origin",
          credentials: isCrossOrigin ? "omit" : "same-origin",
          signal:
            init?.signal ??
            (input instanceof Request ? input.signal : undefined),
        });

        const cType = netRes.headers.get("Content-Type") || "";
        if (!netRes.ok || cType.includes("text/html")) {
          const sourceLabel = useLocalMode ? "local (public/)" : "R2";
          throw new Error(
            `Không tải được model 3D từ ${sourceLabel} (HTTP ${netRes.status}): ${canonicalUrl}`,
          );
        }

        const contentType = cType || "application/octet-stream";
        const buffer = await netRes.arrayBuffer();

        // Kiểm tra xem dữ liệu có phải là file nhị phân hợp lệ hay trang HTML lỗi
        if (isHtmlBuffer(buffer)) {
          throw new Error(
            `Dữ liệu nhận về từ máy chủ là trang HTML lỗi (403/404), không phải file model 3D: ${canonicalUrl}`,
          );
        }

        const payload: CachedBufferPayload = { buffer, contentType };
        sessionMemoryCache.set(canonicalUrl, payload);

        // Lưu bền vững vào CacheStorage của trình duyệt cho R2 CDN ở production
        if (canUseCacheStorage && buffer.byteLength > 0) {
          try {
            const cache = await window.caches.open(MODEL_CACHE_STORAGE_NAME);
            await cache.put(canonicalUrl, buildResponseFromBuffer(payload));
          } catch {
            // Bỏ qua nếu đầy bộ nhớ cache trình duyệt
          }
        }

        return payload;
      })();

      inFlightDownloads.set(canonicalUrl, pending);
    }

    try {
      const payload = await pending;
      return buildResponseFromBuffer(payload);
    } catch (err) {
      // Báo lỗi rõ ràng cho Three.js ErrorBoundary xử lý,
      // TUYỆT ĐỐI không fallback ngầm.
      throw err;
    } finally {
      inFlightDownloads.delete(canonicalUrl);
    }
  };
}

// Tự động kích hoạt ngay khi module được nạp ở phía client
if (typeof window !== "undefined") {
  installModelBrowserCache();
}
