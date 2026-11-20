import * as THREE from "three";
import { DEFAULT_R2_ASSET_URL } from "@/lib/utils";

export const MODEL_CACHE_STORAGE_NAME = "lane-shooter-3d-models-v1";

// Bật bộ nhớ đệm RAM nội bộ của Three.js trong suốt phiên chơi
THREE.Cache.enabled = true;

let isFetchPatched = false;

interface CachedBufferPayload {
  buffer: ArrayBuffer;
  contentType: string;
}

const inFlightDownloads = new Map<string, Promise<CachedBufferPayload>>();

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
  const r2Base = (
    process.env.NEXT_PUBLIC_R2_ASSET_URL ?? DEFAULT_R2_ASSET_URL
  )
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

export function getLocalFallbackUrls(url: string): string[] {
  try {
    const cleanUrl = url.split("?")[0];
    const r2Base = (
      process.env.NEXT_PUBLIC_R2_ASSET_URL ?? DEFAULT_R2_ASSET_URL
    )
      .trim()
      .replace(/\/+$/, "");

    let rel = cleanUrl;
    if (r2Base && cleanUrl.toLowerCase().startsWith(r2Base.toLowerCase())) {
      rel = cleanUrl.slice(r2Base.length).replace(/^\/+/, "");
    } else {
      const parsed = new URL(
        url,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
      );
      rel = parsed.pathname.replace(/^\/+/, "");
    }

    const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim().replace(/\/+$/, "");
    const list: string[] = [];
    if (basePath) {
      list.push(`${basePath}/${rel}`);
    }
    list.push(`/${rel}`);
    list.push(`./${rel}`);
    return list;
  } catch {
    return [];
  }
}

export function buildResponseFromBuffer(payload: CachedBufferPayload): Response {
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
  if (typeof window === "undefined" || !("caches" in window)) {
    return false;
  }
  try {
    const cache = await window.caches.open(MODEL_CACHE_STORAGE_NAME);
    const match = await cache.match(url);
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
 * Có cơ chế tự động thử fallback sang đường dẫn file local nếu R2 bị lỗi CORS hoặc mất mạng,
 * và TUYỆT ĐỐI chặn các trang HTML lỗi 403/404 lọt vào Three.js.
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
          const testBuffer = await cachedRes.clone().arrayBuffer();
          if (!isHtmlBuffer(testBuffer)) {
            return cachedRes;
          }
          // Nếu lỡ cache phải trang HTML lỗi trước đó thì xóa bỏ
          await cache.delete(url);
        }
      } catch {
        // Bỏ qua nếu chế độ ẩn danh chặn
      }
    }

    // 2. Gom các request trùng URL đang tải cùng lúc thành 1 lượt tải duy nhất
    let pending = inFlightDownloads.get(url);
    if (!pending) {
      pending = (async (): Promise<CachedBufferPayload> => {
        let netRes: Response | null = null;
        let lastError: unknown = null;

        // Ưu tiên tải từ CDN / Cloudflare R2
        try {
          const res = await nativeFetch(url, {
            ...init,
            method: "GET",
            mode: "cors",
            credentials: "omit",
          });
          const cType = res.headers.get("Content-Type") || "";
          if (res.ok && !cType.includes("text/html")) {
            netRes = res;
          } else {
            lastError = new Error(`R2 trả về HTTP ${res.status}`);
          }
        } catch (err) {
          lastError = err;
        }

        // Nếu R2 bị lỗi CORS hoặc không tải được -> thử fallback sang các đường dẫn local tương ứng
        if (!netRes) {
          const fallbacks = getLocalFallbackUrls(url);
          for (const fbUrl of fallbacks) {
            try {
              const fbRes = await nativeFetch(fbUrl, init);
              const fbType = fbRes.headers.get("Content-Type") || "";
              if (fbRes.ok && !fbType.includes("text/html")) {
                netRes = fbRes;
                break;
              }
            } catch {
              // Tiếp tục thử fallback tiếp theo
            }
          }
        }

        if (!netRes || !netRes.ok) {
          throw lastError || new Error(`Không tải được model từ R2 hoặc local fallback: ${url}`);
        }

        const contentType =
          netRes.headers.get("Content-Type") || "application/octet-stream";
        const buffer = await netRes.arrayBuffer();

        // Kiểm tra xem dữ liệu có phải là file nhị phân hợp lệ hay trang HTML lỗi
        if (isHtmlBuffer(buffer)) {
          throw new Error(
            `Dữ liệu nhận về từ máy chủ là trang HTML lỗi (403/404), không phải file model 3D: ${url}`
          );
        }

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
    } catch (err) {
      // Báo lỗi rõ ràng cho Three.js ErrorBoundary xử lý (trả về fallback robot),
      // TUYỆT ĐỐI không gọi nativeFetch trả về trang HTML 403 gây crash parser.
      throw err;
    } finally {
      inFlightDownloads.delete(url);
    }
  };
}

// Tự động kích hoạt ngay khi module được nạp ở phía client
if (typeof window !== "undefined") {
  installModelBrowserCache();
}
