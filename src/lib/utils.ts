import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_R2_ASSET_URL =
  "https://pub-1f6e2b4582bc477f8b6205fdb1d711e5.r2.dev";

// Tạo đường dẫn tài nguyên (models, sounds...) ưu tiên Cloudflare R2 CDN
export function withAssetBase(path: string): string {
  const clean = path.replace(/^\/+/, "");
  const r2Base = (
    process.env.NEXT_PUBLIC_R2_ASSET_URL ?? DEFAULT_R2_ASSET_URL
  ).trim();
  if (r2Base) {
    return `${r2Base.replace(/\/+$/, "")}/${clean}`;
  }
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  if (base) {
    return `${base.replace(/\/+$/, "")}/${clean}`;
  }
  return `./${clean}`;
}
