/**
 * DestroyWorksite Command Handler
 * 
 * Handles destruction of worksite(s) from random hexes
 * Used by incidents (bandit raids, emigration threat, mass exodus)
 */

import { BaseGameCommandHandler } from '../GameCommandHandler';
import type { GameCommandContext } from '../GameCommandHandler';
import type { PreparedCommand } from '../../../types/game-commands';
import type { ValidationResult } from '../../hex-selector/types';
import { logger } from '../../../utils/Logger';
import { getKingdomActor, updateKingdom } from '../../../stores/KingdomStore';

export class DestroyWorksiteHandler extends BaseGameCommandHandler {
  canHandle(command: any): boolean {
    return command.type === 'destroyWorksite';
  }
  
  async prepare(command: any, ctx: GameCommandContext): Promise<PreparedCommand | null> {
    let count = command.count || 1;
    
    // Handle dice formula (e.g., '1d3')
    if (typeof count === 'string') {
      const roll = new Roll(count);
      await roll.evaluate({ async: true });
      count = roll.total || 1;
      logger.info(`[DestroyWorksiteHandler] Rolled ${command.count} = ${count}`);
    }
    
    logger.info(`[DestroyWorksiteHandler] Preparing to destroy ${count} worksite(s)`);
    
    // Get current kingdom data
    const actor = getKingdomActor();
    if (!actor) {
      logger.error('[DestroyWorksiteHandler] No kingdom actor available');
      return null;
    }
    
    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      logger.error('[DestroyWorksiteHandler] No kingdom data available');
      return null;
    }
    
    // Find all hexes with worksites
    const hexesWithWorksites = kingdom.hexes.filter(hex => hex.worksite !== null && hex.worksite !== undefined);
    
    if (hexesWithWorksites.length === 0) {
      logger.warn('[DestroyWorksiteHandler] No worksites available to destroy');
      return {
        outcomeBadges: [{
          icon: 'fa-exclamation-triangle',
          template: 'No worksites available to destroy',
          variant: 'neutral'
        }],
        commit: async () => {
          logger.info('[DestroyWorksiteHandler] No worksites to destroy - skipping');
        }
      };
    }
    
    // Select random worksites up to the count
    const actualCount = Math.min(count, hexesWithWorksites.length);
    const selectedHexes: typeof hexesWithWorksites = [];
    const availableHexes = [...hexesWithWorksites];
    
    for (let i = 0; i < actualCount; i++) {
      const randomIndex = Math.floor(Math.random() * availableHexes.length);
      selectedHexes.push(availableHexes[randomIndex]);
      availableHexes.splice(randomIndex, 1); // Remove to avoid duplicates
    }
    
    // Build preview message
    const worksiteNames = selectedHexes.map(hex => {
      const hexName = hex.name || `Hex ${hex.id}`;
      const worksiteType = hex.worksite?.type || 'Unknown';
      return `${worksiteType} (${hexName})`;
    });
    
    const message = actualCount === 1
      ? `Destroy ${worksiteNames[0]}`
      : `Destroy ${actualCount} worksites: ${worksiteNames.join(', ')}`;
    
    logger.info(`[DestroyWorksiteHandler] Preview: ${message}`);
    
    return {
      outcomeBadges: [{
        icon: 'fa-industry',
        template: message,
        variant: 'negative'
      }],
      commit: async () => {
        logger.info(`[DestroyWorksiteHandler] Destroying ${actualCount} worksite(s)`);
        
        const hexIds = selectedHexes.map(h => h.id);
        
        // Apply destruction to kingdom data
        await updateKingdom((kingdom) => {
          kingdom.hexes = kingdom.hexes.map(hex => {
            if (hexIds.includes(hex.id)) {
              logger.info(`[DestroyWorksiteHandler] Removing ${hex.worksite?.type} from ${hex.name || hex.id}`);
              return { ...hex, worksite: null };
            }
            return hex;
          });
        });
        
        // Recalculate production after worksite removal
        const { tryRecalculateProduction } = await import('../../../utils/recalculateProduction');
        await tryRecalculateProduction();
        
        // Build worksite list for chat message
        const worksiteList = selectedHexes.map(hex => {
          const hexName = hex.name || `Hex ${hex.id}`;
          const worksiteType = hex.worksite?.type || 'Unknown';
          return `<li><strong>${worksiteType}</strong> at ${hexName}</li>`;
        }).join('');
        
        // Show chat message
        const chatMessage = actualCount === 1
          ? `<p><strong>Worksite Destroyed:</strong></p><ul>${worksiteList}</ul>`
          : `<p><strong>${actualCount} Worksites Destroyed:</strong></p><ul>${worksiteList}</ul>`;
        
        ChatMessage.create({
          content: chatMessage,
          speaker: ChatMessage.getSpeaker()
        });
        
        logger.info(`[DestroyWorksiteHandler] Successfully destroyed ${actualCount} worksite(s)`);
      },
      // Store hex IDs and worksite info for post-apply interaction
      metadata: {
        destroyedHexIds: selectedHexes.map(h => h.id),
        destroyedWorksites: selectedHexes.map(hex => ({
          id: hex.id,
          name: hex.name || `Hex ${hex.id}`,
          worksiteType: hex.worksite?.type || 'Unknown'
        }))
      }
    };
  }
  
  /**
   * Get standard post-apply interaction configuration for hex display
   * Call this method to add map display to your pipeline
   */
  static getMapDisplayInteraction(title?: string) {
    return {
      type: 'map-selection' as const,
      id: 'affectedHexes',
      mode: 'display' as const,
      count: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.destroyedHexIds?.length || 0;
      },
      colorType: 'destroyed' as const,
      title: (ctx: any) => {
        if (title) return title;
        
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        const count = instance?.metadata?.destroyedHexIds?.length || 0;
        return count === 1
          ? 'Worksite Destroyed'
          : `${count} Worksites Destroyed`;
      },
      condition: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.destroyedHexIds?.length > 0;
      },
      existingHexes: (ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        return instance?.metadata?.destroyedHexIds || [];
      },
      validateHex: (): ValidationResult => {
        return { valid: false, message: 'Display only - showing affected hexes' };
      },
      allowToggle: false,
      getHexInfo: (hexId: string, ctx: any) => {
        const instance = ctx.kingdom?.pendingOutcomes?.find((i: any) => i.previewId === ctx.instanceId);
        const worksite = instance?.metadata?.destroyedWorksites?.find((w: any) => w.id === hexId);
        if (worksite) {
          return `<p style="color: #FF4444;"><strong>Destroyed:</strong> ${worksite.worksiteType}</p><p style="color: #999;">${worksite.name}</p>`;
        }
        return '<p style="color: #FF4444;"><strong>Worksite destroyed</strong></p>';
      }
    };
  }
}

