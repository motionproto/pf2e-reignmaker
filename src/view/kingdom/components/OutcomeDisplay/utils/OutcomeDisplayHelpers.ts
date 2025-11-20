/**
 * OutcomeDisplay Helper Functions
 * 
 * Pure utility functions extracted from OutcomeDisplay.svelte for:
 * - Testability (can be unit tested independently)
 * - Reusability (shared across components)
 * - Maintainability (separate concerns)
 */

/**
 * Get settlement name from pending state (globalThis)
 * Used for Execute/Pardon action
 */
export function getSelectedSettlementName(kingdomData: any): string | null {
  const settlementId = (globalThis as any).__pendingExecuteOrPardonSettlement;
  if (!settlementId) return null;
  
  const settlement = kingdomData?.settlements?.find((s: any) => s.id === settlementId);
  return settlement?.name || null;
}

/**
 * Get faction name from pending state (globalThis)
 * Used for Economic Aid and Infiltration actions
 */
export function getSelectedFactionName(): string | null {
  return (globalThis as any).__pendingEconomicAidFactionName || 
         (globalThis as any).__pendingInfiltrationFactionName || 
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
