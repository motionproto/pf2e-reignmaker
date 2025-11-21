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
 * @param factionId - Optional specific faction (if null, player selects via UI)
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
  logger.info(`🤝 [adjustFactionAttitude] PREPARING attitude adjustment by ${steps} steps`);
  
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

  // Get faction ID from parameter or pending state
  let selectedFactionId = factionId;
  if (!selectedFactionId) {
    // Check for pending faction (set by pre-roll dialog or action)
    selectedFactionId = (globalThis as any).__pendingEconomicAidFaction;
  }

  // Prompt user to select faction if not provided
  if (!selectedFactionId) {
    const eligibleFactions = kingdom.factions.filter((f: any) => f.attitude !== undefined);
    
    if (eligibleFactions.length === 0) {
      throw new Error('No factions available');
    }

    selectedFactionId = await new Promise<string | null>((resolve) => {
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
  }

  // Get faction details for preview
  const faction = factionService.getFaction(selectedFactionId);
  if (!faction) {
    throw new Error(`Faction ${selectedFactionId} not found`);
  }

  // Calculate new attitude for preview (don't apply yet)
  const oldAttitude = faction.attitude;
  const { hasDiplomaticStructures } = await import('../../../utils/faction-attitude-adjuster');
  const hasDiploStructures = hasDiplomaticStructures(kingdom);
  const effectiveMaxLevel = hasDiploStructures ? undefined : options?.maxLevel;

  // Preview the attitude change
  const attitudeOrder = ['Hostile', 'Unfriendly', 'Indifferent', 'Friendly', 'Helpful'];
  const currentIndex = attitudeOrder.indexOf(oldAttitude);
  let newIndex = currentIndex + steps;
  
  // Apply constraints
  if (effectiveMaxLevel) {
    const maxIndex = attitudeOrder.indexOf(effectiveMaxLevel);
    newIndex = Math.min(newIndex, maxIndex);
  }
  if (options?.minLevel) {
    const minIndex = attitudeOrder.indexOf(options.minLevel);
    newIndex = Math.max(newIndex, minIndex);
  }
  
  newIndex = Math.max(0, Math.min(newIndex, attitudeOrder.length - 1));
  const newAttitude = attitudeOrder[newIndex];

  const message = `${faction.name}: ${oldAttitude} → ${newAttitude}`;
  const variant = steps > 0 ? 'positive' : 'negative';
  
  logger.info(`🤝 [adjustFactionAttitude] PREPARED: ${message}`);

  // PHASE 2: RETURN - Preview data + commit function
  return {
    outcomeBadge: {
      icon: 'fa-handshake',
          template: '{{value}}',
      prefix: steps > 0 ? 'Relations improved:' : 'Relations worsened:',
      value: { type: 'static', amount: Math.abs(steps) },
      suffix: `${faction.name} (${oldAttitude} → ${newAttitude})`,
      variant: variant
    },
    commit: async () => {
      logger.info(`🤝 [adjustFactionAttitude] COMMITTING: Adjusting ${faction.name}`);
      
      // Apply the actual attitude change
      await factionService.adjustAttitude(
        selectedFactionId!,
        steps,
        {
          maxLevel: effectiveMaxLevel as any,
          minLevel: options?.minLevel as any
        }
      );
      
      logger.info(`✅ [adjustFactionAttitude] Successfully adjusted ${faction.name}: ${oldAttitude} → ${newAttitude}`);
    }
  };
}
