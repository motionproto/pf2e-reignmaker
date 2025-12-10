/**
 * VoteHandler - GM-side vote operations
 * 
 * Handles vote operations that require actor modification permissions
 * All vote operations are routed through ActionDispatcher
 */

import { actionDispatcher } from '../ActionDispatcher';
import { getKingdomActor } from '../../stores/KingdomStore';
import { kingdomData } from '../../stores/KingdomStore';
import { get } from 'svelte/store';
import type { EventVote, VoteCast } from '../../types/EventVote';
import { logger } from '../../utils/Logger';

/**
 * Register vote-related action handlers
 * Called during module initialization (GM + players)
 */
export function registerVoteHandlers(): void {
  actionDispatcher.register('castVote', handleCastVote);
  actionDispatcher.register('resolveVote', handleResolveVote);
  actionDispatcher.register('handleUserDisconnect', handleUserDisconnectAction);
  actionDispatcher.register('cleanupOldVotes', handleCleanupOldVotes);
  actionDispatcher.register('resetVote', handleResetVote);
  
  logger.debug('🗳️ [VoteHandler] Vote handlers registered');
}

/**
 * GM-only: Cast a vote
 */
async function handleCastVote(data: {
  eventId: string;
  choiceId: string;
  playerId: string;
  playerName: string;
  characterName?: string;
  playerColor?: string;
}): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) throw new Error('No kingdom actor found');
  
  const kingdom = get(kingdomData);
  const currentTurn = kingdom.currentTurn || 0;
  
  // Get or create vote
  const votes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
  let vote = votes.find(v => v.eventId === data.eventId && v.turn === currentTurn);
  
  if (!vote) {
    // Create new vote
    vote = {
      eventId: data.eventId,
      turn: currentTurn,
      votes: [],
      resolved: false
    };
    votes.push(vote);
  }
  
  // Check if user already voted
  const existingVote = vote.votes.find(v => v.playerId === data.playerId);
  if (existingVote) {
    logger.warn(`🗳️ [VoteHandler] User ${data.playerId} already voted, ignoring`);
    return;
  }
  
  // Add vote
  const newVoteCast: VoteCast = {
    playerId: data.playerId,
    playerName: data.playerName,
    characterName: data.characterName,
    choiceId: data.choiceId,
    playerColor: data.playerColor,
    timestamp: Date.now()
  };
  
  vote.votes.push(newVoteCast);
  
  // Save to actor
  await actor.setFlag('pf2e-reignmaker', 'eventVotes', votes);
  
  logger.info(`🗳️ [VoteHandler] Vote cast by ${data.characterName || data.playerName} for ${data.choiceId}`);
}

/**
 * GM-only: Resolve a vote
 */
async function handleResolveVote(data: {
  eventId: string;
  winner: string;
}): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) throw new Error('No kingdom actor found');
  
  const kingdom = get(kingdomData);
  const currentTurn = kingdom.currentTurn || 0;
  
  const votes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
  const voteIndex = votes.findIndex(v => v.eventId === data.eventId && v.turn === currentTurn);
  
  if (voteIndex < 0) {
    logger.warn(`🗳️ [VoteHandler] No vote found for ${data.eventId}`);
    return;
  }
  
  // Mark as resolved
  votes[voteIndex].resolved = true;
  votes[voteIndex].winningChoice = data.winner;
  
  // Save to actor
  await actor.setFlag('pf2e-reignmaker', 'eventVotes', votes);
  
  logger.info(`🗳️ [VoteHandler] Vote resolved for ${data.eventId}: ${data.winner}`);
}

/**
 * GM-only: Handle user disconnect
 */
async function handleUserDisconnectAction(data: {
  userId: string;
}): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;
  
  const kingdom = get(kingdomData);
  const currentTurn = kingdom.currentTurn || 0;
  
  const allVotes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
  let modified = false;
  
  for (const vote of allVotes) {
    if (vote.turn !== currentTurn || vote.resolved) continue;
    
    const originalLength = vote.votes.length;
    vote.votes = vote.votes.filter(v => v.playerId !== data.userId);
    
    if (vote.votes.length < originalLength) {
      modified = true;
      logger.info(`🗳️ [VoteHandler] Removed vote from disconnected user ${data.userId}`);
    }
  }
  
  if (modified) {
    await actor.setFlag('pf2e-reignmaker', 'eventVotes', allVotes);
  }
}

/**
 * GM-only: Clean up old votes
 */
async function handleCleanupOldVotes(data: Record<string, never>): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;
  
  const kingdom = get(kingdomData);
  const currentTurn = kingdom.currentTurn || 0;
  
  const allVotes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
  const filteredVotes = allVotes.filter(v => v.turn === currentTurn);
  
  if (filteredVotes.length !== allVotes.length) {
    await actor.setFlag('pf2e-reignmaker', 'eventVotes', filteredVotes);
    logger.info(`🗳️ [VoteHandler] Cleaned up ${allVotes.length - filteredVotes.length} old votes`);
  }
}

/**
 * GM-only: Reset a vote (clear all votes)
 */
async function handleResetVote(data: { eventId: string }): Promise<void> {
  const actor = getKingdomActor();
  if (!actor) return;
  
  const kingdom = get(kingdomData);
  const currentTurn = kingdom.currentTurn || 0;
  
  const allVotes = actor.getFlag('pf2e-reignmaker', 'eventVotes') as EventVote[] || [];
  const voteIndex = allVotes.findIndex(v => v.eventId === data.eventId && v.turn === currentTurn);
  
  if (voteIndex >= 0) {
    // Remove the vote entirely
    allVotes.splice(voteIndex, 1);
    await actor.setFlag('pf2e-reignmaker', 'eventVotes', allVotes);
    logger.info(`🗳️ [VoteHandler] Reset vote for ${data.eventId}`);
  }
}
