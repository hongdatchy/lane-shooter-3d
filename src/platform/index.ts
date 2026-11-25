import { createCrazyGamesAdapter } from "./adapters/crazygames";
import { createWebAdapter } from "./adapters/web";
import { PlatformAdapter, PlatformTarget } from "./types";

export * from "./types";

const CONFIGURED_PLATFORM = process.env.NEXT_PUBLIC_PLATFORM;

export function getConfiguredPlatformTarget(): PlatformTarget {
  if (CONFIGURED_PLATFORM === "crazygames" || CONFIGURED_PLATFORM === "web") {
    return CONFIGURED_PLATFORM;
  }
  throw new Error(
    `Invalid or missing NEXT_PUBLIC_PLATFORM="${CONFIGURED_PLATFORM ?? ""}". Expected "crazygames" or "web".`
  );
}

let cachedAdapter: PlatformAdapter | null = null;

export function getPlatformAdapter(): PlatformAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  const target = getConfiguredPlatformTarget();
  switch (target) {
    case "crazygames":
      cachedAdapter = createCrazyGamesAdapter();
      break;
    case "web":
      cachedAdapter = createWebAdapter();
      break;
  }

  return cachedAdapter;
}
