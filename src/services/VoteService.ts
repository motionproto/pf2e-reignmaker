/**
 * VoteService - Manages multi-player voting for strategic event choices
 * 
 * Features:
 * - Dynamic vote counting based on active players
 * - Real-time synchronization via KingdomActor flags
 * - Random tie-breaking
 * - Player disconnect handling
 */

import type { EventVote, VoteCast, VoteResult, VoteState } from '../types/EventVote';
import { getKingdomActor } from '../stores/KingdomStore';
import { kingdomData } from '../stores/KingdomStore';
import { get } from 'svelte/store';
import { actionDispatcher } from './ActionDispatcher';

export class VoteService {
  // Client-side pending votes (prevents double-clicking)
  private static pendingVotes = new Set<string>();
  
  /**
   * Calculate the number of votes required based on currently active users
   * 
   * Logic:
   * - Eligible voters = all logged-in players (exclude GM)
   * - GM can only vote if they are the only user logged in
   */
  static getRequiredVoteCount(): number {
    const game = (globalThis as any).game;
    if (!game?.users) return 1;
    
    const allUsers = game.users.filter((u: any) => u.active);
    const playerCount = allUsers.filter((u: any) => !u.isGM).length;
    
    // If there are non-GM players, only they can vote
    // If only GM is logged in, GM can vote
    return playerCount > 0 ? playerCount : 1;
  }
  
  /**
   * Get the character name for a player (preferred over user name)
   */
  static getPlayerCharacterName(userId: string): string {
    const game = (globalThis as any).game;
    const user = game?.users?.get(userId);
    if (!user) return 'Unknown Player';
    
    // Prefer character name
    const character = user.character;
    if (character?.name) return character.name;
    
    // Fallback to user name
    return user.name || 'Unknown Player';
  }
  
  /**
   * Get the current active event vote from KingdomActor
   */
  static getActiveEventVote(eventId: string): EventVote | null {
    const actor = getKingdomActor();
    if (!actor) return null;
    
    const kingdom = get(kingdomData);
    const currentTurn = kingdom.currentTurn || 0;
    
    // Check for existing vote for this event in this turn
    const votes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
    return votes.find(v => v.eventId === eventId && v.turn === currentTurn) || null;
  }
  
  
  /**
   * Cast a vote (writes directly to actor flags)
   */
  static async castVote(eventId: string, choiceId: string): Promise<void> {
    const game = (globalThis as any).game;
    const currentUserId = game.user.id;
    const actor = getKingdomActor();
    if (!actor) throw new Error('No kingdom actor found');
    
    // Check if user is eligible to vote
    const allUsers = game.users.filter((u: any) => u.active);
    const playerCount = allUsers.filter((u: any) => !u.isGM).length;
    const isGM = game.user.isGM;
    
    // GM can only vote if they are the only user
    if (isGM && playerCount > 0) {
      console.warn('🗳️ [VoteService] GM cannot vote when players are logged in');
      return;
    }
    
    const kingdom = get(kingdomData);
    const currentTurn = kingdom.currentTurn || 0;
    
    // Get or create vote
    const votes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
    let vote = votes.find(v => v.eventId === eventId && v.turn === currentTurn);
    
    if (!vote) {
      // Create new vote
      vote = {
        eventId,
        turn: currentTurn,
        votes: [],
        resolved: false
      };
      votes.push(vote);
    }
    
    // Check if already voted
    if (vote.votes.find(v => v.playerId === currentUserId)) {
      console.warn(`🗳️ [VoteService] Already voted, ignoring`);
      return;
    }
    
    // Get player color
    const playerColor = game.user.color?.css || game.user.color || '#999999';
    
    // Add vote
    const newVoteCast: VoteCast = {
      playerId: currentUserId,
      playerName: game.user.name,
      characterName: this.getPlayerCharacterName(currentUserId),
      choiceId,
      playerColor,
      timestamp: Date.now()
    };
    
    vote.votes.push(newVoteCast);
    
    // Save to actor (Foundry will sync to all clients)
    await actor.setFlag('pf2e-reignmaker', 'eventVotes', votes);
    
    console.log(`🗳️ [VoteService] Vote cast for ${choiceId}`);
    
    // Check if voting is complete
    await this.checkVoteResolution(eventId);
  }
  
  /**
   * Check if voting is complete and resolve if so
   */
  static async checkVoteResolution(eventId: string): Promise<void> {
    const vote = this.getActiveEventVote(eventId);
    if (!vote || vote.resolved) return;
    
    const game = (globalThis as any).game;
    
    // Filter out votes from disconnected users
    const validVotes = vote.votes.filter(v => {
      const user = game?.users?.get(v.playerId);
      return user && user.active;
    });
    
    const requiredVotes = this.getRequiredVoteCount();
    
    console.log(`🗳️ [VoteService] Vote status: ${validVotes.length} / ${requiredVotes} votes`);
    
    // Auto-resolve when valid votes match current requirement
    if (validVotes.length >= requiredVotes) {
      await this.resolveVote(eventId);
    }
  }
  
  /**
   * Resolve the vote and determine the winner (with random tie-breaking)
   * Writes directly to actor flags
   */
  static async resolveVote(eventId: string): Promise<VoteResult> {
    const actor = getKingdomActor();
    if (!actor) throw new Error('No kingdom actor found');
    
    const kingdom = get(kingdomData);
    const currentTurn = kingdom.currentTurn || 0;
    const game = (globalThis as any).game;
    
    const votes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
    const voteIndex = votes.findIndex(v => v.eventId === eventId && v.turn === currentTurn);
    
    if (voteIndex < 0) throw new Error('No active vote found');
    const vote = votes[voteIndex];
    
    if (vote.resolved) {
      // Already resolved, return existing result
      return {
        winner: vote.winningChoice!,
        voteCounts: this.countVotes(vote)
      };
    }
    
    // Filter out votes from disconnected users
    const validVotes = vote.votes.filter(v => {
      const user = game?.users?.get(v.playerId);
      return user && user.active;
    });
    
    // Count votes
    const voteCounts = validVotes.reduce((acc, v) => {
      acc[v.choiceId] = (acc[v.choiceId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Find max votes
    const maxVotes = Math.max(...Object.values(voteCounts));
    let tiedChoices = Object.entries(voteCounts)
      .filter(([_, count]) => count === maxVotes)
      .map(([choiceId]) => choiceId);
    
    // Special rule: If __ignore__ is in a tie, it automatically loses
    if (tiedChoices.length > 1 && tiedChoices.includes('__ignore__')) {
      tiedChoices = tiedChoices.filter(id => id !== '__ignore__');
      console.log(`🗳️ [VoteService] Ignore option removed from tie (loses automatically)`);
    }
    
    // Random tie-breaking
    const winnerIndex = Math.floor(Math.random() * tiedChoices.length);
    const winner = tiedChoices[winnerIndex];
    
    // Mark as resolved
    votes[voteIndex].resolved = true;
    votes[voteIndex].winningChoice = winner;
    
    // Save to actor
    await actor.setFlag('pf2e-reignmaker', 'eventVotes', votes);
    
    console.log(`🗳️ [VoteService] Vote resolved! Winner: ${winner}`, {
      voteCounts,
      tiedChoices: tiedChoices.length > 1 ? tiedChoices : undefined
    });
    
    return {
      winner,
      tiedChoices: tiedChoices.length > 1 ? tiedChoices : undefined,
      voteCounts
    };
  }
  
  /**
   * Get the current vote state for the UI
   */
  static getVoteState(eventId: string): VoteState {
    const vote = this.getActiveEventVote(eventId);
    if (!vote) {
      return {
        hasVoted: false,
        totalVotes: 0,
        requiredVotes: this.getRequiredVoteCount(),
        waitingForPlayers: []
      };
    }
    
    const game = (globalThis as any).game;
    const currentUserId = game?.user?.id;
    
    // Check if current user has voted
    const myVoteCast = vote.votes.find(v => v.playerId === currentUserId);
    
    // Filter valid votes (from active users only)
    const validVotes = vote.votes.filter(v => {
      const user = game?.users?.get(v.playerId);
      return user && user.active;
    });
    
    // Get list of players who haven't voted yet
    const votedUserIds = new Set(validVotes.map(v => v.playerId));
    const allUsers = game?.users?.filter((u: any) => u.active) || [];
    const gmCount = allUsers.filter((u: any) => u.isGM).length;
    const playerCount = allUsers.length - gmCount;
    
    const waitingForUsers = allUsers.filter((u: any) => {
      const isGM = u.isGM;
      const hasVoted = votedUserIds.has(u.id);
      
      // Include non-GM players who haven't voted
      // OR include GMs if only GMs are playing
      const includeGM = playerCount === 0;
      
      return !hasVoted && (!isGM || includeGM);
    });
    
    const waitingForPlayers = waitingForUsers.map((u: any) => 
      this.getPlayerCharacterName(u.id)
    );
    
    return {
      hasVoted: !!myVoteCast,
      myVote: myVoteCast?.choiceId,
      totalVotes: validVotes.length,
      requiredVotes: this.getRequiredVoteCount(),
      waitingForPlayers
    };
  }
  
  /**
   * Handle user disconnect
   */
  static async handleUserDisconnect(userId: string): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;
    
    const kingdom = get(kingdomData);
    const currentTurn = kingdom.currentTurn || 0;
    
    const allVotes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
    let modified = false;
    
    for (const vote of allVotes) {
      if (vote.turn !== currentTurn || vote.resolved) continue;
      
      const originalLength = vote.votes.length;
      vote.votes = vote.votes.filter(v => v.playerId !== userId);
      
      if (vote.votes.length < originalLength) {
        modified = true;
        console.log(`🗳️ [VoteService] Removed vote from disconnected user ${userId}`);
      }
    }
    
    if (modified) {
      await actor.setFlag('pf2e-reignmaker', 'eventVotes', allVotes);
    }
  }
  
  /**
   * Clean up votes from previous turns
   */
  static async cleanupOldVotes(): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;
    
    const kingdom = get(kingdomData);
    const currentTurn = kingdom.currentTurn || 0;
    
    const allVotes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
    const filteredVotes = allVotes.filter(v => v.turn === currentTurn);
    
    if (filteredVotes.length !== allVotes.length) {
      await actor.setFlag('pf2e-reignmaker', 'eventVotes', filteredVotes);
      console.log(`🗳️ [VoteService] Cleaned up ${allVotes.length - filteredVotes.length} old votes`);
    }
  }
  
  /**
   * Reset current vote (clear all votes)
   */
  static async resetVote(eventId: string): Promise<void> {
    const actor = getKingdomActor();
    if (!actor) return;
    
    const kingdom = get(kingdomData);
    const currentTurn = kingdom.currentTurn || 0;
    
    const allVotes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
    const voteIndex = allVotes.findIndex(v => v.eventId === eventId && v.turn === currentTurn);
    
    if (voteIndex >= 0) {
      // Remove the vote entirely
      allVotes.splice(voteIndex, 1);
      await actor.setFlag('pf2e-reignmaker', 'eventVotes', allVotes);
      console.log(`🗳️ [VoteService] Reset vote for ${eventId}`);
    }
  }
  
  /**
   * GM-only: Force resolve vote (pick current leader or random if tied)
   * If no votes have been cast, treat as ignored
   */
  static async forceResolveVote(eventId: string): Promise<void> {
    const vote = this.getActiveEventVote(eventId);
    if (!vote || vote.resolved) return;
    
    // If no votes yet, treat as ignored
    if (vote.votes.length === 0) {
      console.log('🗳️ [VoteService] No votes cast, treating as ignored');
      const actor = getKingdomActor();
      if (!actor) return;
      
      const kingdom = get(kingdomData);
      const currentTurn = kingdom.currentTurn || 0;
      const votes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
      const voteIndex = votes.findIndex(v => v.eventId === eventId && v.turn === currentTurn);
      
      if (voteIndex >= 0) {
        votes[voteIndex].resolved = true;
        votes[voteIndex].winningChoice = '__ignore__';
        await actor.setFlag('pf2e-reignmaker', 'eventVotes', votes);
      }
      return;
    }
    
    // Use existing resolve logic (already handles ties)
    await this.resolveVote(eventId);
  }
  
  /**
   * Count votes by choice (helper)
   */
  private static countVotes(vote: EventVote): Record<string, number> {
    const game = (globalThis as any).game;
    
    // Filter valid votes (from active users only)
    const validVotes = vote.votes.filter(v => {
      const user = game?.users?.get(v.playerId);
      return user && user.active;
    });
    
    return validVotes.reduce((acc, v) => {
      acc[v.choiceId] = (acc[v.choiceId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
