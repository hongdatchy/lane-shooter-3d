import { LeaderboardEntryDTO } from "@/dto/GameDTO";

const PLAYER_NAME_STORAGE_KEY = "lane_shooter_player_name";
const PLAYER_IDS_STORAGE_KEY = "lane_shooter_player_ids";
const LEADERBOARD_STORAGE_KEY = "lane_shooter_leaderboard";
export const MAX_LEADERBOARD_ENTRIES = 20;

export function sortLeaderboard(entries: LeaderboardEntryDTO[]): LeaderboardEntryDTO[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.wave !== a.wave) return b.wave - a.wave;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.updatedAt - a.updatedAt;
  });
}

function isValidEntry(item: unknown): item is LeaderboardEntryDTO {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<LeaderboardEntryDTO>;
  return (
    typeof candidate.playerName === "string" &&
    candidate.playerName.trim().length > 0 &&
    typeof candidate.score === "number" &&
    typeof candidate.wave === "number" &&
    typeof candidate.kills === "number"
  );
}

function generateSafePlayerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "");
  }
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `p_${ts}_${rand}`;
}

function readPlayerIdsMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PLAYER_IDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const safeMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && /^[a-zA-Z0-9_-]{6,64}$/.test(v)) {
        safeMap[k] = v;
      }
    }
    return safeMap;
  } catch {
    return {};
  }
}

export const playerStorageService = {
  getPlayerName(): string {
    if (typeof window === "undefined") return "";
    try {
      return (window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "").trim();
    } catch {
      return "";
    }
  },

  setPlayerName(name: string): string {
    const clean = name.trim().slice(0, 24);
    if (typeof window === "undefined" || !clean) return clean;
    try {
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, clean);
      this.getOrCreatePlayerId(clean);
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
    return clean;
  },

  getPlayerId(playerName: string): string {
    const key = playerName.trim().toLowerCase();
    if (!key) return "";
    const map = readPlayerIdsMap();
    return map[key] || "";
  },

  // Mỗi biệt danh trên máy sẽ có 1 ID cố định trong localStorage để tránh trùng tên với người chơi khác trên Firestore
  getOrCreatePlayerId(playerName: string): string {
    const key = (playerName.trim() || "player").toLowerCase();
    if (typeof window === "undefined") return key;

    const map = readPlayerIdsMap();
    if (map[key]) return map[key];

    const newId = generateSafePlayerId();
    map[key] = newId;
    try {
      window.localStorage.setItem(PLAYER_IDS_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // Bỏ qua nếu localStorage bị chặn
    }
    return newId;
  },

  getLeaderboard(): LeaderboardEntryDTO[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const sanitized: LeaderboardEntryDTO[] = parsed
        .filter(isValidEntry)
        .map((item) => ({
          id:
            typeof item.id === "string" && item.id
              ? item.id
              : item.playerName.trim().toLowerCase(),
          playerName: item.playerName.trim(),
          score: Number.isFinite(item.score) ? item.score : 0,
          wave: Number.isFinite(item.wave) ? item.wave : 1,
          kills: Number.isFinite(item.kills) ? item.kills : 0,
          victory: Boolean(item.victory),
          gamesPlayed:
            typeof item.gamesPlayed === "number" && item.gamesPlayed > 0
              ? item.gamesPlayed
              : 1,
          updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
        }));

      return sortLeaderboard(sanitized).slice(0, MAX_LEADERBOARD_ENTRIES);
    } catch {
      return [];
    }
  },

  saveLeaderboardCache(entries: LeaderboardEntryDTO[]): void {
    if (typeof window === "undefined") return;
    try {
      const sorted = sortLeaderboard(entries).slice(0, MAX_LEADERBOARD_ENTRIES);
      window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sorted));
    } catch {
      // Bỏ qua nếu localStorage đầy hoặc bị chặn
    }
  },

  getPlayerBestScore(
    playerName: string,
    existingBoard?: LeaderboardEntryDTO[],
    playerId?: string
  ): number {
    const board = existingBoard ?? this.getLeaderboard();
    const targetId = playerId || this.getPlayerId(playerName);
    if (targetId) {
      const byId = board.find((entry) => entry.id === targetId);
      if (byId) return byId.score;
    }
    const clean = playerName.trim().toLowerCase();
    if (!clean) return 0;
    const match = board.find((entry) => entry.playerName.trim().toLowerCase() === clean);
    return match ? match.score : 0;
  },

  recordMatchResult(input: {
    playerName: string;
    score: number;
    wave: number;
    kills: number;
    victory: boolean;
  }): LeaderboardEntryDTO[] {
    const cleanName = (input.playerName.trim() || "Người chơi").slice(0, 24);
    const playerId = this.getOrCreatePlayerId(cleanName);
    const normalizedName = cleanName.toLowerCase();
    const current = this.getLeaderboard();
    const now = Date.now();
    const existingIndex = current.findIndex(
      (item) =>
        item.id === playerId ||
        (!playerId && item.playerName.trim().toLowerCase() === normalizedName)
    );

    const nextBoard = [...current];
    if (existingIndex >= 0) {
      const prev = nextBoard[existingIndex];
      nextBoard[existingIndex] = {
        ...prev,
        id: playerId,
        playerName: cleanName,
        score: Math.max(prev.score, input.score),
        wave: Math.max(prev.wave, input.wave),
        kills: Math.max(prev.kills, input.kills),
        victory: prev.victory || input.victory,
        gamesPlayed: prev.gamesPlayed + 1,
        updatedAt: now,
      };
    } else {
      nextBoard.push({
        id: playerId,
        playerName: cleanName,
        score: input.score,
        wave: input.wave,
        kills: input.kills,
        victory: input.victory,
        gamesPlayed: 1,
        updatedAt: now,
      });
    }

    const sorted = sortLeaderboard(nextBoard).slice(0, MAX_LEADERBOARD_ENTRIES);
    this.saveLeaderboardCache(sorted);
    return sorted;
  },
};

export default playerStorageService;
