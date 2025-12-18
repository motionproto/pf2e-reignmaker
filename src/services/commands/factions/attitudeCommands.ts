/**
 * Faction Commands - Attitude Management
 * 
 * Handles:
 * - Adjusting faction attitudes (improve/worsen diplomatic relations)
 * - Faction selection dialogs
 * - Attitude constraints (max/min levels, diplomatic structures)
 */

import { getKingdomActor } from '../../../stores/KingdomStore';
import { logger } from '../../../utils/Logger';
import type { PreparedCommand } from '../types';

/**
 * Adjust Faction Attitude - Improve or worsen diplomatic relations
 * Uses prepare/commit pattern for preview before applying changes
 * 
 * @param factionId - Specific faction ID, 'random' for automatic selection, or null for user dialog
 * @param steps - Number of steps to adjust (+1 = improve, -1 = worsen)
 * @param options - Optional constraints (maxLevel, minLevel, count)
 * @returns PreparedCommand with preview + commit function
 */
export async function adjustFactionAttitude(
  factionId: string | null,
  steps: number,
  options?: {
    maxLevel?: string;
    minLevel?: string;
    count?: number;
  }
): Promise<PreparedCommand> {
  const count = options?.count || 1;
  logger.info(`🤝 [adjustFactionAttitude] PREPARING attitude adjustment by ${steps} steps for ${count} faction(s)`);
  
  // PHASE 1: PREPARE - Get faction info and validate (NO state changes)
  const actor = getKingdomActor();
  if (!actor) {
    throw new Error('No kingdom actor available');
  }

  const kingdom = actor.getKingdomData();
  if (!kingdom || !kingdom.factions || kingdom.factions.length === 0) {
    throw new Error('No factions available');
  }

  // Import utilities
  const { factionService } = await import('../../factions/index');

  // Get faction IDs from parameter
  let selectedFactionIds: string[] = [];

  // Handle 'random' faction selection (for events)
  if (factionId === 'random') {
    // Filter factions based on adjustment direction
    const eligibleFactions = kingdom.factions.filter((f: any) => {
      if (!f.attitude) return false;
      // If improving, exclude Helpful; if worsening, exclude Hostile
      if (steps > 0) return f.attitude !== 'Helpful';
      if (steps < 0) return f.attitude !== 'Hostile';
      return true;
    });
    
    if (eligibleFactions.length === 0) {
      throw new Error('No eligible factions available for random selection');
    }
    
    // Randomly select faction(s)
    const actualCount = Math.min(count, eligibleFactions.length);
    const shuffled = [...eligibleFactions].sort(() => Math.random() - 0.5);
    const selectedFactions = shuffled.slice(0, actualCount);
    selectedFactionIds = selectedFactions.map((f: any) => f.id);
    
    logger.info(`🤝 [adjustFactionAttitude] Randomly selected ${actualCount} faction(s): ${selectedFactions.map((f: any) => f.name).join(', ')}`);
  }
  // Prompt user to select faction if null (legacy fallback for non-pipeline calls)
  else if (!factionId) {
    const eligibleFactions = kingdom.factions.filter((f: any) => f.attitude !== undefined);
    
    if (eligibleFactions.length === 0) {
      throw new Error('No factions available');
    }

    const selectedFactionId = await new Promise<string | null>((resolve) => {
      const Dialog = (globalThis as any).Dialog;
      new Dialog({
        title: 'Select Faction',
        content: `
          <form>
            <div class="form-group">
              <label>Select faction to adjust relations with:</label>
              <select name="factionId" style="width: 100%; padding: 5px;">
                ${eligibleFactions.map((f: any) => 
                  `<option value="${f.id}">${f.name} (${f.attitude})</option>`
                ).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: 'Select',
            callback: (html: any) => {
              const selected = html.find('[name="factionId"]').val();
              resolve(selected);
            }
          },
          cancel: {
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'ok'
      }).render(true);
    });

    if (!selectedFactionId) {
      throw new Error('Faction selection cancelled');
    }
    
    selectedFactionIds = [selectedFactionId];
  } else {
    // Specific faction provided
    selectedFactionIds = [factionId];
  }

  // Ensure we have valid faction IDs
  if (selectedFactionIds.length === 0) {
    throw new Error('No factions selected');
  }

  // Get faction details and calculate attitude changes for all selected factions
  const { hasDiplomaticStructures, adjustAttitudeBySteps } = await import('../../../utils/faction-attitude-adjuster');
  const hasDiploStructures = hasDiplomaticStructures(kingdom);
  const effectiveMaxLevel = hasDiploStructures ? undefined : options?.maxLevel;
  
  const factionChanges: Array<{
    id: string;
    name: string;
    oldAttitude: string;
    newAttitude: string;
  }> = [];
  
  for (const fid of selectedFactionIds) {
    const faction = factionService.getFaction(fid);
    if (!faction) {
      logger.warn(`⚠️ [adjustFactionAttitude] Faction ${fid} not found, skipping`);
      continue;
    }
    
    const newAttitude = adjustAttitudeBySteps(
      faction.attitude, 
      steps,
      { maxLevel: effectiveMaxLevel as any, minLevel: options?.minLevel as any }
    );
    
    if (newAttitude && newAttitude !== faction.attitude) {
      factionChanges.push({
        id: faction.id,
        name: faction.name,
        oldAttitude: faction.attitude,
        newAttitude: newAttitude
      });
    }
  }
  
  if (factionChanges.length === 0) {
    throw new Error('No faction attitudes can be adjusted');
  }

  const variant: 'positive' | 'negative' = steps > 0 ? 'positive' : 'negative';
  
  logger.info(`🤝 [adjustFactionAttitude] PREPARED: ${factionChanges.length} faction(s)`);

  // PHASE 2: RETURN - Preview data + commit function
  // Return multiple badges if multiple factions
  const outcomeBadges = factionChanges.map(change => ({
    icon: 'fa-handshake',
    template: steps > 0 
      ? `Relations improved: ${change.name} (${change.oldAttitude} → ${change.newAttitude})`
      : `Relations worsened: ${change.name} (${change.oldAttitude} → ${change.newAttitude})`,
    variant: variant as 'positive' | 'negative'
  }));
  
  return {
    outcomeBadges: outcomeBadges,
    commit: async () => {
      logger.info(`🤝 [adjustFactionAttitude] COMMITTING: Adjusting ${factionChanges.length} faction(s)`);
      console.log(`🤝 [adjustFactionAttitude] COMMITTING: Adjusting ${factionChanges.length} faction(s)`);
      
      // Apply all attitude changes
      for (const change of factionChanges) {
        await factionService.adjustAttitude(
          change.id,
          steps,
          {
            maxLevel: effectiveMaxLevel as any,
            minLevel: options?.minLevel as any
          }
        );
        console.log(`🤝 [adjustFactionAttitude] Applied: ${change.name} (${change.oldAttitude} → ${change.newAttitude})`);
      }
      
      logger.info(`✅ [adjustFactionAttitude] Successfully adjusted ${factionChanges.length} faction(s)`);
    }
  };
}
