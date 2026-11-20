import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDocker = process.env.IS_DOCKER === "true";
  const basePath = isDocker
    ? process.env.NEXT_PUBLIC_BASE_PATH || "/lane-shooter-3d"
    : "";
  const isStaticExport = phase === PHASE_PRODUCTION_BUILD && !isDocker;

  return {
    ...(basePath ? { basePath } : {}),
    // Khi chạy `pnpm run build` ở ngoài Docker -> xuất HTML tĩnh vào thư mục `out/` để up CrazyGames
    ...(isStaticExport ? { output: "export", assetPrefix: "./" } : {}),
    images: {
      unoptimized: true,
    },
  };
}
