import {
  AdLifecycleHooks,
  PlatformAdapter,
  PlatformCapabilities,
  PlatformPlayer,
} from "../types";

const CRAZYGAMES_SDK_SCRIPT_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
const CRAZYGAMES_SCRIPT_ID = "crazygames-sdk-script";
const SDK_LOAD_TIMEOUT_MS = 12000;

interface CrazyGamesUser {
  username: string;
  profilePictureUrl?: string;
}

interface CrazyGamesAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown, errorData?: unknown) => void;
}

interface CrazyGamesSDK {
  environment: "crazygames" | "local" | "disabled";
  init(): Promise<void>;
  user: {
    readonly isUserAccountAvailable: boolean;
    getUser(): Promise<CrazyGamesUser | null>;
    getUserToken(): Promise<string>;
    showAuthPrompt(): Promise<CrazyGamesUser | null>;
    addAuthListener(listener: (user: CrazyGamesUser | null) => void): void;
    removeAuthListener(listener: (user: CrazyGamesUser | null) => void): void;
  };
  data: {
    getItem(key: string): string | null | undefined;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
  };
  ad: {
    requestAd(adType: "midgame" | "rewarded", callbacks: CrazyGamesAdCallbacks): void;
  };
  game: {
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
    happytime(): void;
  };
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSDK;
    };
  }
}

function formatSdkError(error: unknown, errorData?: unknown): string {
  const parts: string[] = [];
  if (typeof error === "string" && error) {
    parts.push(error);
  } else if (error instanceof Error && error.message) {
    parts.push(error.message);
  } else if (error && typeof error === "object" && "message" in error) {
    parts.push(String((error as { message: unknown }).message));
  } else if (error) {
    parts.push(String(error));
  }

  if (errorData && typeof errorData === "object") {
    const dataObj = errorData as { reason?: unknown; message?: unknown };
    if (dataObj.message) parts.push(String(dataObj.message));
    else if (dataObj.reason) parts.push(String(dataObj.reason));
  }

  return parts.join(": ") || "Unknown CrazyGames SDK error";
}

function getSdkErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}

function toFormattedError(error: unknown): Error {
  return error instanceof Error ? error : new Error(formatSdkError(error));
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid CrazyGames user token format (expected JWT).");
  }
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLength, "=");
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const jsonText = new TextDecoder().decode(bytes);
  const parsed: unknown = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid CrazyGames JWT payload.");
  }
  return parsed as Record<string, unknown>;
}

function loadCrazyGamesSdkScript(): Promise<CrazyGamesSDK> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("CrazyGames SDK can only initialize in a browser."));
  }
  if (window.CrazyGames?.SDK) {
    return Promise.resolve(window.CrazyGames.SDK);
  }

  return new Promise<CrazyGamesSDK>((resolve, reject) => {
    const deadline = window.setTimeout(() => {
      reject(new Error("Timed out waiting for CrazyGames SDK v3 script to load."));
    }, SDK_LOAD_TIMEOUT_MS);

    const finishSuccess = () => {
      window.clearTimeout(deadline);
      if (window.CrazyGames?.SDK) {
        resolve(window.CrazyGames.SDK);
      } else {
        reject(new Error("CrazyGames SDK script loaded, but window.CrazyGames.SDK is undefined."));
      }
    };

    const finishError = () => {
      window.clearTimeout(deadline);
      reject(new Error("Failed to load CrazyGames SDK v3 script."));
    };

    const existing = document.getElementById(CRAZYGAMES_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Wait for existing Next.js beforeInteractive script or re-poll briefly until loaded/timeout
      existing.addEventListener("load", finishSuccess, { once: true });
      existing.addEventListener("error", finishError, { once: true });
      const poll = window.setInterval(() => {
        if (window.CrazyGames?.SDK) {
          window.clearInterval(poll);
          finishSuccess();
        }
      }, 50);
      window.setTimeout(() => window.clearInterval(poll), SDK_LOAD_TIMEOUT_MS);
      return;
    }

    const script = document.createElement("script");
    script.id = CRAZYGAMES_SCRIPT_ID;
    script.src = CRAZYGAMES_SDK_SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", finishSuccess, { once: true });
    script.addEventListener("error", finishError, { once: true });
    document.head.appendChild(script);
  });
}

async function resolveAuthenticatedPlayer(
  sdk: CrazyGamesSDK,
  user: CrazyGamesUser
): Promise<PlatformPlayer> {
  const token = await sdk.user.getUserToken();
  const payload = decodeJwtPayload(token);
  const rawUserId = payload.userId;
  if (typeof rawUserId !== "string" || !rawUserId.trim()) {
    throw new Error("CrazyGames user token is missing userId.");
  }
  const externalId = rawUserId.trim();
  const cleanName = (user.username || "").trim().slice(0, 24);
  if (!cleanName) {
    throw new Error("CrazyGames user profile is missing username.");
  }
  return {
    id: `crazygames_${externalId}`,
    externalId,
    name: cleanName,
    avatarUrl: user.profilePictureUrl,
    platform: "crazygames",
  };
}

export function createCrazyGamesAdapter(): PlatformAdapter {
  let sdkInstance: CrazyGamesSDK | null = null;
  let initPromise: Promise<void> | null = null;

  const capabilities: PlatformCapabilities = {
    supportsAccount: true,
    supportsLoginPrompt: true,
    supportsLogout: false,
    supportsAds: true,
    supportsGuestPersistence: true,
    label: "CrazyGames",
  };

  function requireSdk(): CrazyGamesSDK {
    if (!sdkInstance) {
      throw new Error("CrazyGames SDK is not initialized. Call init() first.");
    }
    return sdkInstance;
  }

  return {
    target: "crazygames",
    capabilities,

    async init(): Promise<void> {
      if (sdkInstance) return;
      if (!initPromise) {
        initPromise = (async () => {
          const sdk = await loadCrazyGamesSdkScript();
          await sdk.init();
          if (sdk.environment === "disabled") {
            throw new Error(
              "CrazyGames SDK is disabled on this domain (use localhost, ?useLocalSdk=true, or CrazyGames Preview/Portal)."
            );
          }
          sdkInstance = sdk;
        })().catch((err) => {
          initPromise = null;
          throw err;
        });
      }
      return initPromise;
    },

    async getPlayer(): Promise<PlatformPlayer | null> {
      const sdk = requireSdk();
      if (!sdk.user.isUserAccountAvailable) {
        return null;
      }
      try {
        const user = await sdk.user.getUser();
        if (!user) {
          return null;
        }
        return await resolveAuthenticatedPlayer(sdk, user);
      } catch (err) {
        const code = getSdkErrorCode(err);
        if (
          code === "userNotAuthenticated" ||
          /user not authenticated|not logged in|not authenticated/i.test(formatSdkError(err))
        ) {
          return null;
        }
        throw toFormattedError(err);
      }
    },

    async promptLogin(): Promise<PlatformPlayer> {
      const sdk = requireSdk();
      if (!sdk.user.isUserAccountAvailable) {
        throw new Error("CrazyGames accounts are not available in this embed context.");
      }
      let user: CrazyGamesUser | null = null;
      try {
        user = await sdk.user.showAuthPrompt();
      } catch (err) {
        if (getSdkErrorCode(err) === "userCancelled") {
          throw new Error("CrazyGames login was cancelled.");
        }
        throw toFormattedError(err);
      }
      if (!user) {
        throw new Error("CrazyGames login was cancelled.");
      }
      return resolveAuthenticatedPlayer(sdk, user);
    },

    async logout(): Promise<void> {
      throw new Error("CrazyGames manages account sign-out through the CrazyGames portal UI.");
    },

    subscribeAuthChange(listener: (player: PlatformPlayer | null) => void): () => void {
      const sdk = requireSdk();
      const wrapped = (user: CrazyGamesUser | null) => {
        if (!user) {
          listener(null);
          return;
        }
        void resolveAuthenticatedPlayer(sdk, user)
          .then((player) => listener(player))
          .catch((err) => {
            console.error("[CrazyGames] Failed to resolve player on auth change:", err);
          });
      };
      sdk.user.addAuthListener(wrapped);
      return () => {
        sdk.user.removeAuthListener(wrapped);
      };
    },

    async getData(key: string): Promise<string | null> {
      const sdk = requireSdk();
      try {
        const value = sdk.data.getItem(key);
        return typeof value === "string" ? value : null;
      } catch (err) {
        throw toFormattedError(err);
      }
    },

    async setData(key: string, value: string): Promise<void> {
      const sdk = requireSdk();
      try {
        sdk.data.setItem(key, value);
      } catch (err) {
        throw toFormattedError(err);
      }
    },

    async removeData(key: string): Promise<void> {
      const sdk = requireSdk();
      try {
        sdk.data.removeItem(key);
      } catch (err) {
        throw toFormattedError(err);
      }
    },

    requestRewardedAd(hooks?: AdLifecycleHooks): Promise<void> {
      const sdk = requireSdk();
      return new Promise<void>((resolve, reject) => {
        sdk.ad.requestAd("rewarded", {
          adStarted: () => {
            hooks?.onStart?.();
          },
          adFinished: () => {
            hooks?.onEnd?.();
            resolve();
          },
          adError: (error, errorData) => {
            hooks?.onEnd?.();
            reject(new Error(`Rewarded ad failed: ${formatSdkError(error, errorData)}`));
          },
        });
      });
    },

    requestInterstitialAd(hooks?: AdLifecycleHooks): Promise<void> {
      const sdk = requireSdk();
      return new Promise<void>((resolve, reject) => {
        sdk.ad.requestAd("midgame", {
          adStarted: () => {
            hooks?.onStart?.();
          },
          adFinished: () => {
            hooks?.onEnd?.();
            resolve();
          },
          adError: (error, errorData) => {
            hooks?.onEnd?.();
            reject(new Error(`Interstitial ad failed: ${formatSdkError(error, errorData)}`));
          },
        });
      });
    },

    notifyLoadingStart(): void {
      requireSdk().game.loadingStart();
    },

    notifyLoadingStop(): void {
      requireSdk().game.loadingStop();
    },

    notifyGameplayStart(): void {
      requireSdk().game.gameplayStart();
    },

    notifyGameplayStop(): void {
      requireSdk().game.gameplayStop();
    },

    notifyHappyTime(): void {
      requireSdk().game.happytime();
    },
  };
}
