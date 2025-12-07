/**
 * SeizeHexes Command Handler
 * 
 * Handles seizing hexes for factions (default: rebels).
 * Used by guerrilla-movement and secession-crisis incidents.
 * 
 * Two modes of operation:
 * 
 * MODE A - Random Selection (guerrilla-movement):
 * 1. Roll dice to determine hex count (e.g., '1d3' or '2d3')
 * 2. Find all eligible hexes (player-owned, no settlement)
 * 3. Pick random starting hex
 * 4. Expand to adjacent eligible hexes using BFS/flood-fill
 * 5. Continue until count reached or no more adjacent hexes
 * 
 * MODE B - Explicit Hex IDs (secession-crisis):
 * 1. Accept array of specific hex IDs
 * 2. Filter to player-owned hexes only
 * 3. Seize those specific hexes
 * 
 * Common:
 * - Create target faction if doesn't exist (default: 'rebels')
 * - Change hex ownership to target faction
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import { logger } from '../../../utils/Logger';
import { getKingdomActor, updateKingdom } from '../../../stores/KingdomStore';
import { PLAYER_KINGDOM } from '../../../types/ownership';
import { getAdjacentHexes } from '../../../utils/hexUtils';
import { factionService } from '../../factions/index';

// Rebels faction ID - consistent across all seizure events
export const REBELS_FACTION_ID = 'rebels';
export const REBELS_FACTION_NAME = 'Rebels';

export class SeizeHexesHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'seizeHexes';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[SeizeHexesHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[SeizeHexesHandler] No kingdom data available');
      return null;
    }
    
    // Determine target faction (default: rebels)
    const targetFactionId = command.factionId || REBELS_FACTION_ID;
    const targetFactionName = command.factionName || REBELS_FACTION_NAME;
    
    let selectedHexes: any[];
    
    // MODE B: Explicit hex IDs provided
    if (command.hexIds && Array.isArray(command.hexIds) && command.hexIds.length > 0) {
      logger.info(`[SeizeHexesHandler] Using explicit hex IDs: ${command.hexIds.join(', ')}`);
      
      // Get the specified hexes that are player-owned
      selectedHexes = kingdom.hexes.filter((hex: any) => 
        command.hexIds.includes(hex.id) && hex.claimedBy === PLAYER_KINGDOM
      );
      
      if (selectedHexes.length === 0) {
        logger.warn('[SeizeHexesHandler] No specified hexes are player-owned');
        return {
          outcomeBadges: [{
            icon: 'fa-exclamation-triangle',
            template: 'No player-owned hexes to seize from selection',
            variant: 'neutral'
          }],
          commit: async () => {
            logger.info('[SeizeHexesHandler] No hexes to seize - skipping');
          }
        };
      }
      
      logger.info(`[SeizeHexesHandler] Found ${selectedHexes.length} player-owned hexes to seize`);
    }
    // MODE A: Random selection with count/dice
    else {
      let count = command.count || 1;
      
      // Handle dice formula (e.g., '1d3', '2d3')
      if (typeof count === 'string') {
        const roll = new Roll(count);
        await roll.evaluate({ async: true });
        count = roll.total || 1;
        logger.info(`[SeizeHexesHandler] Rolled ${command.count} = ${count}`);
      }
      
      logger.info(`[SeizeHexesHandler] Preparing to seize ${count} hex(es) randomly`);
      
      // Find all eligible hexes (player-owned, no settlement)
      // Note: ownership is stored in `claimedBy`, settlements are detected via `features` array
      const eligibleHexes = kingdom.hexes.filter((hex: any) => 
        hex.claimedBy === PLAYER_KINGDOM && 
        !hex.features?.some((f: any) => f.type === 'settlement')
      );
      
      if (eligibleHexes.length === 0) {
        logger.warn('[SeizeHexesHandler] No eligible hexes available to seize');
        return {
          outcomeBadges: [{
            icon: 'fa-exclamation-triangle',
            template: 'No eligible hexes to seize (all have settlements)',
            variant: 'neutral'
          }],
          commit: async () => {
            logger.info('[SeizeHexesHandler] No hexes to seize - skipping');
          }
        };
      }
      
      // Select contiguous hexes using BFS from random starting point
      selectedHexes = this.selectContiguousHexes(eligibleHexes, count, kingdom);
      
      if (selectedHexes.length === 0) {
        logger.warn('[SeizeHexesHandler] Could not select any hexes');
        return {
          outcomeBadges: [{
            icon: 'fa-exclamation-triangle',
            template: 'Could not select any hexes to seize',
            variant: 'neutral'
          }],
          commit: async () => {
            logger.info('[SeizeHexesHandler] No hexes selected - skipping');
          }
        };
      }
    }
    
    // Ensure target faction exists
    let factionId = await this.ensureFaction(kingdom, targetFactionId, targetFactionName);
    
    // Build preview message
    const hexNames = selectedHexes.map(hex => hex.name || `Hex ${hex.id}`);
    const actualCount = selectedHexes.length;
    
    const factionLabel = targetFactionName.toLowerCase();
    const message = actualCount === 1
      ? `${hexNames[0]} seized by ${factionLabel}`
      : `${actualCount} hexes seized by ${factionLabel}: ${hexNames.join(', ')}`;
    
    logger.info(`[SeizeHexesHandler] Preview: ${message}`);
    
    // Capture values for closure
    const capturedFactionId = factionId;
    const capturedFactionName = targetFactionName;
    
    return {
      outcomeBadges: [{
        icon: 'fa-flag',
        template: message,
        variant: 'negative'
      }],
      commit: async () => {
        logger.info(`[SeizeHexesHandler] Seizing ${actualCount} hex(es) for ${capturedFactionName}`);
        
        const hexIds = selectedHexes.map(h => h.id);
        
        // Ensure faction exists before committing
        const freshActor = getKingdomActor();
        const freshKingdom = freshActor?.getKingdomData();
        let finalFactionId = capturedFactionId;
        if (freshKingdom) {
          finalFactionId = await this.ensureFaction(freshKingdom, targetFactionId, targetFactionName);
        }
        
        // Apply seizure to kingdom data
        // Note: ownership is stored in `claimedBy` property
        await updateKingdom((kingdom) => {
          kingdom.hexes = kingdom.hexes.map((hex: any) => {
            if (hexIds.includes(hex.id)) {
              logger.info(`[SeizeHexesHandler] Seizing ${hex.name || hex.id} for ${capturedFactionName}`);
              return { ...hex, claimedBy: finalFactionId };
            }
            return hex;
          });
        });
        
        // Build hex list for chat message
        const hexList = selectedHexes.map(hex => {
          const hexName = hex.name || `Hex ${hex.id}`;
          return `<li><strong>${hexName}</strong></li>`;
        }).join('');
        
        // Show chat message
        const chatMessage = actualCount === 1
          ? `<p><strong>Territory Seized by ${capturedFactionName}:</strong></p><ul>${hexList}</ul>`
          : `<p><strong>${actualCount} Territories Seized by ${capturedFactionName}:</strong></p><ul>${hexList}</ul>`;
        
        ChatMessage.create({
          content: chatMessage,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[SeizeHexesHandler] Successfully seized ${actualCount} hex(es)`);
      },
      // Store hex IDs for post-apply interaction (map display)
      metadata: {
        seizedHexIds: selectedHexes.map(h => h.id),
        seizedHexes: selectedHexes.map(hex => ({
          id: hex.id,
          name: hex.name || `Hex ${hex.id}`
        })),
        factionId: capturedFactionId,
        factionName: capturedFactionName
      }
    };
  }
  
  /**
   * Select contiguous hexes using BFS from a random starting point
   */
  private selectContiguousHexes(
    eligibleHexes: any[], 
    targetCount: number,
    kingdom: any
  ): any[] {
    if (eligibleHexes.length === 0) return [];
    
    // Create lookup map for eligible hexes by coordinates
    const eligibleByCoords = new Map<string, any>();
    for (const hex of eligibleHexes) {
      const key = `${hex.row}:${hex.col}`;
      eligibleByCoords.set(key, hex);
    }
    
    // Pick random starting hex
    const startIndex = Math.floor(Math.random() * eligibleHexes.length);
    const startHex = eligibleHexes[startIndex];
    
    // BFS to find contiguous hexes
    const selected: any[] = [startHex];
    const visited = new Set<string>([`${startHex.row}:${startHex.col}`]);
    const queue: any[] = [startHex];
    
    while (selected.length < targetCount && queue.length > 0) {
      const current = queue.shift()!;
      
      // Get adjacent hexes
      const adjacents = getAdjacentHexes(current.row, current.col);
      
      // Shuffle adjacents for randomness
      this.shuffleArray(adjacents);
      
      for (const adj of adjacents) {
        if (selected.length >= targetCount) break;
        
        const key = `${adj.i}:${adj.j}`;
        
        // Skip if already visited
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Check if this adjacent hex is eligible
        const eligibleHex = eligibleByCoords.get(key);
        if (eligibleHex) {
          selected.push(eligibleHex);
          queue.push(eligibleHex);
        }
      }
    }
    
    // If we couldn't find enough contiguous hexes, try expanding from different starting points
    if (selected.length < targetCount && selected.length < eligibleHexes.length) {
      logger.warn(`[SeizeHexesHandler] Only found ${selected.length} contiguous hexes, wanted ${targetCount}`);
    }
    
    return selected;
  }
  
  /**
   * Shuffle array in place (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  /**
   * Ensure a faction exists, create if not
   * @param kingdom - Current kingdom data
   * @param factionId - Desired faction ID
   * @param factionName - Faction display name
   * @returns Faction ID
   */
  private async ensureFaction(kingdom: any, factionId: string, factionName: string): Promise<string> {
    // Check if faction already exists
    const existingFaction = kingdom.factions?.find(
      (f: any) => f.id === factionId || f.name.toLowerCase() === factionName.toLowerCase()
    );
    
    if (existingFaction) {
      logger.info(`[SeizeHexesHandler] Found existing faction: ${existingFaction.id}`);
      return existingFaction.id;
    }
    
    // Create new faction
    logger.info(`[SeizeHexesHandler] Creating new faction: ${factionName}`);
    await factionService.createFaction(factionName, 'Hostile');
    
    // Update the faction ID to be consistent
    await updateKingdom((kingdom) => {
      const faction = kingdom.factions?.find((f: any) => f.name === factionName);
      if (faction) {
        faction.id = factionId;
        // Set description based on faction type
        if (factionId === REBELS_FACTION_ID) {
          faction.description = 'Armed rebels who have seized territory within your kingdom. They must be dealt with before you can reclaim the lost hexes.';
        }
      }
    });
    
    return factionId;
  }
  
  /**
   * Get standard post-apply interaction configuration for hex display
   * Call this method to add map display to your pipeline
   * Shows the seized hexes in display mode (no selection, just preview)
   */
  static getMapDisplayInteraction(title?: string) {
    return {
      type: 'map-selection' as const,
      id: 'seizedHexes',
      mode: 'display' as const,
      count: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.seizedHexIds?.length || 0;
      },
      colorType: 'destroyed' as const,  // Red color for seized territory
      title: (ctx: any) => {
        if (title) return title;
        
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        const count = instance?.metadata?.seizedHexIds?.length || 0;
        return count === 1
          ? 'Territory Seized by Rebels'
          : `${count} Territories Seized by Rebels`;
      },
      condition: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.seizedHexIds?.length > 0;
      },
      existingHexes: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.seizedHexIds || [];
      },
      validateHex: (): ValidationResult => {
        return { valid: false, message: 'Display only - showing seized territory' };
      },
      allowToggle: false,
      getHexInfo: (hexId: string, ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        const hex = instance?.metadata?.seizedHexes?.find((h: any) => h.id === hexId);
        if (hex) {
          return `<p style="color: #FF4444;"><strong>Seized by Rebels:</strong></p><p style="color: #999;">${hex.name}</p>`;
        }
        return '<p style="color: #FF4444;"><strong>Territory seized by rebels</strong></p>';
      }
    };
  }
}

