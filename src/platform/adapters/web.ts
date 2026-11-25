import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { deleteField, doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAppOrThrow, getFirebaseDbOrThrow } from "@/lib/firebase";
import {
  AdLifecycleHooks,
  PlatformAdapter,
  PlatformCapabilities,
  PlatformPlayer,
} from "../types";

const PLAYER_SAVES_COLLECTION = "player_saves";

function mapFirebaseUser(user: User): PlatformPlayer {
  const cleanName = (user.displayName || user.email || "Player").trim().slice(0, 24);
  return {
    id: `web_${user.uid}`,
    externalId: user.uid,
    name: cleanName || "Player",
    avatarUrl: user.photoURL || undefined,
    platform: "web",
  };
}

export function createWebAdapter(): PlatformAdapter {
  let authInstance: Auth | null = null;
  let initPromise: Promise<void> | null = null;
  const guestSessionData = new Map<string, string>();

  const capabilities: PlatformCapabilities = {
    supportsAccount: true,
    supportsLoginPrompt: true,
    supportsLogout: true,
    supportsAds: false,
    supportsGuestPersistence: false,
    label: "Web (Firebase)",
  };

  function requireAuth(): Auth {
    if (!authInstance) {
      throw new Error("Web Firebase Auth is not initialized. Call init() first.");
    }
    return authInstance;
  }

  return {
    target: "web",
    capabilities,

    async init(): Promise<void> {
      if (authInstance) return;
      if (!initPromise) {
        initPromise = (async () => {
          const app = getFirebaseAppOrThrow();
          getFirebaseDbOrThrow();
          const auth = getAuth(app);
          await auth.authStateReady();
          authInstance = auth;
        })().catch((err) => {
          initPromise = null;
          throw err;
        });
      }
      return initPromise;
    },

    async getPlayer(): Promise<PlatformPlayer | null> {
      const auth = requireAuth();
      await auth.authStateReady();
      return auth.currentUser ? mapFirebaseUser(auth.currentUser) : null;
    },

    async promptLogin(): Promise<PlatformPlayer> {
      const auth = requireAuth();
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      return mapFirebaseUser(credential.user);
    },

    async logout(): Promise<void> {
      const auth = requireAuth();
      await signOut(auth);
      guestSessionData.clear();
    },

    subscribeAuthChange(listener: (player: PlatformPlayer | null) => void): () => void {
      const auth = requireAuth();
      let isInitial = true;
      return onAuthStateChanged(auth, (user) => {
        if (isInitial) {
          isInitial = false;
          return;
        }
        listener(user ? mapFirebaseUser(user) : null);
      });
    },

    async getData(key: string): Promise<string | null> {
      const auth = requireAuth();
      const user = auth.currentUser;
      if (!user) {
        return guestSessionData.get(key) ?? null;
      }
      const db = getFirebaseDbOrThrow();
      const snap = await getDoc(doc(db, PLAYER_SAVES_COLLECTION, user.uid));
      if (!snap.exists()) return null;
      const entries = snap.data()?.entries as Record<string, unknown> | undefined;
      const value = entries?.[key];
      return typeof value === "string" ? value : null;
    },

    async setData(key: string, value: string): Promise<void> {
      const auth = requireAuth();
      const user = auth.currentUser;
      if (!user) {
        guestSessionData.set(key, value);
        return;
      }
      const db = getFirebaseDbOrThrow();
      await setDoc(
        doc(db, PLAYER_SAVES_COLLECTION, user.uid),
        {
          entries: { [key]: value },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    },

    async removeData(key: string): Promise<void> {
      const auth = requireAuth();
      const user = auth.currentUser;
      if (!user) {
        guestSessionData.delete(key);
        return;
      }
      const db = getFirebaseDbOrThrow();
      await setDoc(
        doc(db, PLAYER_SAVES_COLLECTION, user.uid),
        {
          entries: { [key]: deleteField() },
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    },

    async requestRewardedAd(_hooks?: AdLifecycleHooks): Promise<void> {
      throw new Error("Rewarded ads are not available on standalone web builds.");
    },

    async requestInterstitialAd(_hooks?: AdLifecycleHooks): Promise<void> {
      throw new Error("Interstitial ads are not available on standalone web builds.");
    },

    notifyLoadingStart(): void {},
    notifyLoadingStop(): void {},
    notifyGameplayStart(): void {},
    notifyGameplayStop(): void {},
    notifyHappyTime(): void {},
  };
}
