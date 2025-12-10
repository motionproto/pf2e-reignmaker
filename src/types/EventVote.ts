/**
 * EventVote - Type definitions for multi-player voting on strategic event choices
 * 
 * System supports:
 * - Variable player count (dynamic calculation based on active users)
 * - Real-time vote updates across all clients
 * - Random tie-breaking when multiple choices have equal votes
 * - Player disconnect handling (reduces required votes)
 */

export interface EventVote {
  eventId: string;
  turn: number;
  votes: VoteCast[];
  resolved: boolean;
  winningChoice?: string;
}

export interface VoteCast {
  playerId: string;
  playerName: string;          // User name (fallback)
  characterName?: string;       // Character name (preferred display)
  playerColor?: string;         // Player color for UI display
  choiceId: string;
  timestamp: number;
}

export interface VoteResult {
  winner: string;
  tiedChoices?: string[];       // If there was a tie
  voteCounts: Record<string, number>;
}

export interface VoteState {
  hasVoted: boolean;
  myVote?: string;              // choiceId that current user voted for
  totalVotes: number;
  requiredVotes: number;
  waitingForPlayers: string[];  // Character names of players who haven't voted
}
