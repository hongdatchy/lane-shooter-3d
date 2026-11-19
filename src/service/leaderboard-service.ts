import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { LeaderboardEntryDTO } from "@/dto/GameDTO";
import { db, isFirebaseReady } from "@/lib/firebase";
import {
  MAX_LEADERBOARD_ENTRIES,
  playerStorageService,
  sortLeaderboard,
} from "@/service/player-storage-service";

const LEADERBOARD_COLLECTION = "game_leaderboard";
const FETCH_LIMIT = 50;

export type LeaderboardSource = "firebase" | "local";

function normalizeFirestoreEntry(
  id: string,
  raw: Record<string, unknown>
): LeaderboardEntryDTO | null {
  if (typeof raw.playerName !== "string" || !raw.playerName.trim()) {
    return null;
  }
  return {
    id,
    playerName: raw.playerName.trim().slice(0, 24),
    score: typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : 0,
    wave: typeof raw.wave === "number" && Number.isFinite(raw.wave) ? raw.wave : 1,
    kills: typeof raw.kills === "number" && Number.isFinite(raw.kills) ? raw.kills : 0,
    victory: Boolean(raw.victory),
    gamesPlayed:
      typeof raw.gamesPlayed === "number" && raw.gamesPlayed > 0 ? raw.gamesPlayed : 1,
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : Date.now(),
  };
}

export const leaderboardService = {
  async getLeaderboard(): Promise<{ entries: LeaderboardEntryDTO[]; source: LeaderboardSource }> {
    if (!isFirebaseReady() || !db) {
      return { entries: playerStorageService.getLeaderboard(), source: "local" };
    }
    try {
      const q = query(
        collection(db, LEADERBOARD_COLLECTION),
        orderBy("score", "desc"),
        limit(FETCH_LIMIT)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs
        .map((d) => normalizeFirestoreEntry(d.id, d.data() as Record<string, unknown>))
        .filter((item): item is LeaderboardEntryDTO => item !== null);
      const sorted = sortLeaderboard(list).slice(0, MAX_LEADERBOARD_ENTRIES);
      return { entries: sorted, source: "firebase" };
    } catch (err) {
      console.warn("Firestore leaderboard read error, falling back to localStorage:", err);
      return { entries: playerStorageService.getLeaderboard(), source: "local" };
    }
  },

  // Lắng nghe realtime Bảng xếp hạng giống mô hình Firestore client ở project Thái Hương
  subscribeLeaderboard(
    onData: (entries: LeaderboardEntryDTO[], source: LeaderboardSource) => void
  ): () => void {
    if (!isFirebaseReady() || !db) {
      onData(playerStorageService.getLeaderboard(), "local");
      return () => {};
    }

    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy("score", "desc"),
      limit(FETCH_LIMIT)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => normalizeFirestoreEntry(d.id, d.data() as Record<string, unknown>))
          .filter((item): item is LeaderboardEntryDTO => item !== null);
        const sorted = sortLeaderboard(list).slice(0, MAX_LEADERBOARD_ENTRIES);
        onData(sorted, "firebase");
      },
      (err) => {
        console.warn("Firestore leaderboard realtime error, falling back to localStorage:", err);
        onData(playerStorageService.getLeaderboard(), "local");
      }
    );
  },

  // Đẩy kết quả trận đấu lên Firestore (kèm fallback nếu chưa config hoặc mất mạng)
  async syncMatchToCloud(input: {
    playerName: string;
    score: number;
    wave: number;
    kills: number;
    victory: boolean;
  }): Promise<{ entries: LeaderboardEntryDTO[]; source: LeaderboardSource }> {
    if (!isFirebaseReady() || !db) {
      return { entries: playerStorageService.getLeaderboard(), source: "local" };
    }

    const cleanName = (input.playerName.trim() || "Người chơi").slice(0, 24);
    const playerId = playerStorageService.getOrCreatePlayerId(cleanName);
    const safeScore = Math.max(0, Math.min(10000000, Math.round(input.score)));
    const safeWave = Math.max(1, Math.min(99, Math.floor(input.wave)));
    const safeKills = Math.max(0, Math.floor(input.kills));
    const now = Date.now();

    try {
      const docRef = doc(db, LEADERBOARD_COLLECTION, playerId);
      const existingSnap = await getDoc(docRef);

      if (existingSnap.exists()) {
        const prev = normalizeFirestoreEntry(
          existingSnap.id,
          existingSnap.data() as Record<string, unknown>
        );
        const payload: LeaderboardEntryDTO = {
          id: playerId,
          playerName: cleanName,
          score: prev ? Math.max(prev.score, safeScore) : safeScore,
          wave: prev ? Math.max(prev.wave, safeWave) : safeWave,
          kills: prev ? Math.max(prev.kills, safeKills) : safeKills,
          victory: prev ? prev.victory || Boolean(input.victory) : Boolean(input.victory),
          gamesPlayed: prev ? prev.gamesPlayed + 1 : 1,
          updatedAt: now,
        };
        await updateDoc(docRef, {
          id: payload.id,
          playerName: payload.playerName,
          score: payload.score,
          wave: payload.wave,
          kills: payload.kills,
          victory: payload.victory,
          gamesPlayed: payload.gamesPlayed,
          updatedAt: payload.updatedAt,
        });
      } else {
        const payload: LeaderboardEntryDTO = {
          id: playerId,
          playerName: cleanName,
          score: safeScore,
          wave: safeWave,
          kills: safeKills,
          victory: Boolean(input.victory),
          gamesPlayed: 1,
          updatedAt: now,
        };
        await setDoc(docRef, payload);
      }

      return await this.getLeaderboard();
    } catch (err) {
      console.warn("Firestore leaderboard write error, using local fallback:", err);
      return { entries: playerStorageService.getLeaderboard(), source: "local" };
    }
  },
};

export default leaderboardService;
