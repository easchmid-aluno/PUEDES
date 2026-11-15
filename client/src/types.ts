export type GamePhase = 'lobby' | 'hint-phase' | 'discussion' | 'results' | 'game-over';

export interface Player {
  id: string;
  nickname: string;
  avatar: string; // Emoji allowed ONLY as player avatar
  score: number;
  isHost: boolean;
  isConnected: boolean;
  hints: string[]; // exactly 3 entries: [turn0, turn1, turn2]
  votes: string[]; // IDs they voted for
  hasSubmittedHint: boolean;
}

export interface RoomSettings {
  rounds: number; // 3 | 5 | 7 | 10
  impostors: number | 'auto';
  hintTime: number; // 15 | 20 | 30 | 45
  discussTime: number; // 60 | 90 | 120 | 180
  categories: string[];
  isPublic: boolean; // Pública ou Privada
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  settings: RoomSettings;
  impostorCount: number;
  currentRound: number;
  totalRounds: number;
  currentTurn: number; // 0, 1, 2 (turns 1/3, 2/3, 3/3)
  currentPlayerIndex: number;
  turnOrder: string[]; // Order of player IDs for this round/turn
  phaseEndsAt: number; // Server timestamp in ms when the phase/turn ends
  serverNow: number;   // Server timestamp in ms when state was emitted
  chat: ChatMessage[];
  roundResults?: RoundResults;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  avatar: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface RoundResults {
  impostorIds: string[];
  civilianIds: string[];
  wordA: string; // civilians' word
  wordB: string; // impostors' word
  category: string;
  scoreGained: Record<string, number>;
  isGameOver: boolean;
}

export interface PublicRoomInfo {
  roomCode: string;
  playerCount: number;
  maxPlayers: number;
  hostNickname: string;
  hostAvatar: string;
  rounds: number;
}
