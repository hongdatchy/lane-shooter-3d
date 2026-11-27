import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { LeaderboardEntryDTO } from "@/dto/GameDTO";
import { getFirebaseDbOrThrow } from "@/lib/firebase";
import { PlatformPlayer } from "@/platform";

const LEADERBOARD_COLLECTION = "game_leaderboard";

export function sortLeaderboard(entries: LeaderboardEntryDTO[]): LeaderboardEntryDTO[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.chapter !== a.chapter) return b.chapter - a.chapter;
    if (b.wave !== a.wave) return b.wave - a.wave;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.updatedAt - a.updatedAt;
  });
}

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
    chapter:
      typeof raw.chapter === "number" && Number.isFinite(raw.chapter)
        ? Math.max(1, Math.floor(raw.chapter))
        : 1,
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
  async getLeaderboard(): Promise<LeaderboardEntryDTO[]> {
    const db = getFirebaseDbOrThrow();
    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy("score", "desc")
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs
      .map((d) => normalizeFirestoreEntry(d.id, d.data() as Record<string, unknown>))
      .filter((item): item is LeaderboardEntryDTO => item !== null);
    return sortLeaderboard(list);
  },

  subscribeLeaderboard(
    onData: (entries: LeaderboardEntryDTO[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const db = getFirebaseDbOrThrow();
    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy("score", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => normalizeFirestoreEntry(d.id, d.data() as Record<string, unknown>))
          .filter((item): item is LeaderboardEntryDTO => item !== null);
        onData(sortLeaderboard(list));
      },
      (err) => {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    );
  },

  async syncMatchToCloud(input: {
    player: PlatformPlayer;
    score: number;
    chapter: number;
    wave: number;
    kills: number;
    victory: boolean;
  }): Promise<LeaderboardEntryDTO[]> {
    const { player } = input;
    if (!player?.id || !player?.name) {
      throw new Error("Authenticated platform player is required to submit leaderboard scores.");
    }

    const db = getFirebaseDbOrThrow();
    const cleanName = player.name.trim().slice(0, 24);
    const safeScore = Math.max(0, Math.min(10000000, Math.round(input.score)));
    const safeChapter = Math.max(1, Math.min(20, Math.floor(input.chapter)));
    const safeWave = Math.max(1, Math.min(99, Math.floor(input.wave)));
    const safeKills = Math.max(0, Math.floor(input.kills));
    const now = Date.now();

    const docRef = doc(db, LEADERBOARD_COLLECTION, player.id);
    const existingSnap = await getDoc(docRef);

    if (existingSnap.exists()) {
      const prev = normalizeFirestoreEntry(
        existingSnap.id,
        existingSnap.data() as Record<string, unknown>
      );
      const nextScore = prev ? Math.max(prev.score, safeScore) : safeScore;
      const prevChapter = prev?.chapter ?? 1;
      let nextChapter = prevChapter;
      let nextWave = prev ? prev.wave : safeWave;
      if (safeChapter > prevChapter) {
        nextChapter = safeChapter;
        nextWave = safeWave;
      } else if (safeChapter === prevChapter) {
        nextWave = prev ? Math.max(prev.wave, safeWave) : safeWave;
      }
      const nextKills = prev ? Math.max(prev.kills, safeKills) : safeKills;
      const nextVictory = prev ? prev.victory || Boolean(input.victory) : Boolean(input.victory);
      const nextGamesPlayed = prev ? prev.gamesPlayed + 1 : 1;

      await updateDoc(docRef, {
        id: player.id,
        playerName: cleanName,
        platform: player.platform,
        externalId: player.externalId,
        score: nextScore,
        chapter: nextChapter,
        wave: nextWave,
        kills: nextKills,
        victory: nextVictory,
        gamesPlayed: nextGamesPlayed,
        updatedAt: now,
      });
    } else {
      await setDoc(docRef, {
        id: player.id,
        playerName: cleanName,
        platform: player.platform,
        externalId: player.externalId,
        score: safeScore,
        chapter: safeChapter,
        wave: safeWave,
        kills: safeKills,
        victory: Boolean(input.victory),
        gamesPlayed: 1,
        updatedAt: now,
      });
    }

    return await this.getLeaderboard();
  },
};

export default leaderboardService;
