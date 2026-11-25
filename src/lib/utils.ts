import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_R2_ASSET_URL =
  "https://lane-shooter-assets.hongdatchy.workers.dev";

/**
 * Xác định nguồn tải asset 3D (models):
 * - Ở local dev (`NODE_ENV === "development"`): dùng trực tiếp file trong `public/` (`./models/...`).
 * - Ở production build (`next build`): dùng Cloudflare R2 CDN.
 * - Có thể ghi đè tường minh bằng `NEXT_PUBLIC_ASSET_SOURCE="local" | "r2"`.
 */
export function isLocalAssetMode(): boolean {
  const explicit = process.env.NEXT_PUBLIC_ASSET_SOURCE?.trim().toLowerCase();
  if (explicit === "local") return true;
  if (explicit === "r2") return false;
  return process.env.NODE_ENV === "development";
}

// Tạo đường dẫn tài nguyên đóng gói trực tiếp trong public/ (ảnh vũ khí, icon, model local...)
export function withLocalAssetBase(path: string): string {
  const clean = path.replace(/^\/+/, "");
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  if (base) {
    return `${base.replace(/\/+$/, "")}/${clean}`;
  }
  return `./${clean}`;
}

// Tạo đường dẫn tài nguyên 3D: local dev dùng file trong `public/`, production dùng Cloudflare R2 CDN
export function withAssetBase(path: string): string {
  if (isLocalAssetMode()) {
    return withLocalAssetBase(path);
  }
  const clean = path.replace(/^\/+/, "");
  const r2Base = (
    process.env.NEXT_PUBLIC_R2_ASSET_URL ?? DEFAULT_R2_ASSET_URL
  ).trim();
  if (r2Base) {
    return `${r2Base.replace(/\/+$/, "")}/${clean}`;
  }
  return withLocalAssetBase(clean);
}
