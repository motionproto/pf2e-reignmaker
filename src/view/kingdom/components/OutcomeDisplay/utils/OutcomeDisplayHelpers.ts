/**
 * OutcomeDisplay Helper Functions
 * 
 * Pure utility functions extracted from OutcomeDisplay.svelte for:
 * - Testability (can be unit tested independently)
 * - Reusability (shared across components)
 * - Maintainability (separate concerns)
 * 
 * NOTE: These functions now read from preview.metadata (stored in kingdom actor)
 * instead of global state (__pending* variables).
 */

import type { OutcomePreview } from '../../../../../models/OutcomePreview';

/**
 * Get settlement name from preview metadata
 * Used for Execute/Pardon action and other settlement-based actions
 */
export function getSelectedSettlementName(kingdomData: any, preview?: OutcomePreview | null): string | null {
  // First try to get from preview metadata (pipeline system)
  if (preview?.metadata?.settlement?.name) {
    return preview.metadata.settlement.name;
  }
  
  // Try to get settlementId from metadata and look up name
  const settlementId = preview?.metadata?.settlement?.id;
  if (settlementId) {
    const settlement = kingdomData?.settlements?.find((s: any) => s.id === settlementId);
    return settlement?.name || null;
  }
  
  return null;
}

/**
 * Get faction name from preview metadata
 * Used for Economic Aid, Military Aid, Diplomatic Mission, and Infiltration actions
 */
export function getSelectedFactionName(preview?: OutcomePreview | null): string | null {
  // Get from preview metadata (pipeline system)
  // Check various possible metadata paths
  return preview?.metadata?.faction?.name || 
         preview?.metadata?.factionName || 
         null;
}

/**
 * Parse special effects into human-readable messages
 * Handles structure damage, destruction, hex claiming, etc.
 */
export function parseSpecialEffects(
  effects: string[] | undefined,
  kingdomData: any,
  structuresService: any
): string[] {
  if (!effects || effects.length === 0) return [];
  
  const messages: string[] = [];
  
  for (const effect of effects as string[]) {
    // Parse structure_damaged:structureId:settlementId
    if (effect.startsWith('structure_damaged:')) {
      const parts = effect.split(':');
      console.log('🔍 [OutcomeDisplayHelpers] Parsing structure_damaged effect:', { effect, parts });
      
      const [, structureId, settlementId] = parts;
      console.log('🔍 [OutcomeDisplayHelpers] Extracted IDs:', { structureId, settlementId });
      
      const structure = structuresService.getStructure(structureId);
      console.log('🔍 [OutcomeDisplayHelpers] Found structure:', structure);
      
      const settlement = kingdomData?.settlements?.find((s: any) => s.id === settlementId);
      console.log('🔍 [OutcomeDisplayHelpers] Found settlement:', settlement);
      
      if (structure && settlement) {
        const message = `${structure.name} in ${settlement.name} has been damaged and provides no bonuses until repaired.`;
        console.log('✅ [OutcomeDisplayHelpers] Created message:', message);
        messages.push(message);
      } else {
        console.warn('⚠️ [OutcomeDisplayHelpers] Failed to create message - missing structure or settlement', {
          hasStructure: !!structure,
          hasSettlement: !!settlement,
          structureId,
          settlementId,
          availableSettlements: kingdomData?.settlements?.map((s: any) => ({ id: s.id, name: s.name }))
        });
      }
    }
    
    // Parse structure_destroyed:structureId:settlementId
    else if (effect.startsWith('structure_destroyed:')) {
      const [, structureId, settlementId] = effect.split(':');
      const structure = structuresService.getStructure(structureId);
      const settlement = kingdomData?.settlements?.find((s: any) => s.id === settlementId);
      
      if (structure && settlement) {
        if (structure.tier === 1) {
          messages.push(`${structure.name} in ${settlement.name} has been completely destroyed and removed.`);
        } else if (structure.upgradeFrom) {
          const previousStructure = structuresService.getStructure(structure.upgradeFrom);
          if (previousStructure) {
            messages.push(`${structure.name} in ${settlement.name} has been destroyed, downgrading to ${previousStructure.name} (damaged).`);
          }
        }
      }
    }
    
    // Parse hex_claimed:count:hexList
    else if (effect.startsWith('hex_claimed:')) {
      const [, count, hexList] = effect.split(':');
      const hexCount = parseInt(count, 10);
      messages.push(`${hexCount} hex${hexCount !== 1 ? 'es' : ''} claimed: ${hexList}`);
    }
    
    // Critical success fame is handled separately in OutcomeBadges
    else if (effect === 'critical_success_fame') {
      // Skip - already displayed by OutcomeBadges
    }
    
    // Shortage penalties are handled separately
    else if (effect.startsWith('shortage_penalty:')) {
      // Skip - already displayed as shortfall warning
    }
    
    // Imprisoned unrest effects
    else if (effect === 'imprisoned_unrest_applied' || effect === 'imprisoned_unrest_allocated') {
      // Skip - already shown in state changes
    }
    else if (effect === 'imprisoned_unrest_overflow') {
      messages.push('Prison capacity exceeded - excess converted to regular unrest');
    }
  }
  
  return messages;
}
