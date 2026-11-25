export type PlatformTarget = "crazygames" | "web";

export interface PlatformPlayer {
  /** Global unique ID prefixed with platform, e.g. "crazygames_UOuZ..." or "web_abc..." */
  id: string;
  /** Raw ID from the platform provider */
  externalId: string;
  name: string;
  avatarUrl?: string;
  platform: PlatformTarget;
}

export interface PlatformCapabilities {
  supportsAccount: boolean;
  supportsLoginPrompt: boolean;
  supportsLogout: boolean;
  supportsAds: boolean;
  supportsGuestPersistence: boolean;
  label: string;
}

export interface AdLifecycleHooks {
  onStart?: () => void;
  onEnd?: () => void;
}

export interface PlatformAdapter {
  readonly target: PlatformTarget;
  readonly capabilities: PlatformCapabilities;

  init(): Promise<void>;
  getPlayer(): Promise<PlatformPlayer | null>;
  promptLogin(): Promise<PlatformPlayer>;
  logout(): Promise<void>;
  subscribeAuthChange(listener: (player: PlatformPlayer | null) => void): () => void;

  getData(key: string): Promise<string | null>;
  setData(key: string, value: string): Promise<void>;
  removeData(key: string): Promise<void>;

  requestRewardedAd(hooks?: AdLifecycleHooks): Promise<void>;
  requestInterstitialAd(hooks?: AdLifecycleHooks): Promise<void>;

  notifyLoadingStart(): void;
  notifyLoadingStop(): void;
  notifyGameplayStart(): void;
  notifyGameplayStop(): void;
  notifyHappyTime(): void;
}
