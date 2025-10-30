/**
 * CustomModifierService - Handles application of custom modifiers
 * 
 * Extracted from EventPhaseController.applyCustomModifiers()
 * Provides reusable modifier application logic for any phase
 */

import { updateKingdom } from '../../stores/KingdomStore';
import { createGameCommandsService } from '../GameCommandsService';
import { isStaticModifier, isOngoingDuration, isDiceModifier } from '../../types/modifiers';
import type { ActiveModifier } from '../../models/Modifiers';
import { logger } from '../../utils/Logger';

export interface CustomModifierServiceConfig {
  phase?: string;  // Optional phase name for logging
}

/**
 * Apply custom modifiers at the start of a phase
 * Custom modifiers have sourceType === 'custom'
 */
export async function applyCustomModifiers(config?: CustomModifierServiceConfig): Promise<void> {
  const phaseName = config?.phase || 'Phase';
  
  const { getKingdomActor } = await import('../../stores/KingdomStore');
  const actor = getKingdomActor();
  if (!actor) {
    logger.debug(`[CustomModifierService] No kingdom actor found`);
    return;
  }
  
  const kingdom = actor.getKingdomData();
  if (!kingdom || !kingdom.activeModifiers || kingdom.activeModifiers.length === 0) {
    logger.debug(`[CustomModifierService] No active modifiers found`);
    return;
  }

  kingdom.activeModifiers.forEach((m: ActiveModifier) => {
    logger.debug(`[CustomModifierService] Found modifier: ${m.name} (source: ${m.sourceType})`);
  });
  
  // Filter for custom modifiers only (sourceType === 'custom')
  const customModifiers = kingdom.activeModifiers.filter((m: ActiveModifier) => m.sourceType === 'custom');
  
  if (customModifiers.length === 0) {
    logger.debug(`[CustomModifierService] No custom modifiers to apply`);
    return;
  }

  logger.debug(`[CustomModifierService] Applying ${customModifiers.length} custom modifiers`);

  // Batch modifiers by resource to avoid collisions
  const modifiersByResource = new Map<string, number>();
  const modifiersToDecrement: Array<{ modifierId: string; modifierIndex: number }> = [];
  
  for (const modifier of customModifiers) {
    logger.debug(`[CustomModifierService] Processing modifier: ${modifier.name}`);

    for (let i = 0; i < modifier.modifiers.length; i++) {
      const mod = modifier.modifiers[i];
      let resourceInfo = 'unknown';
      if (isStaticModifier(mod) || isDiceModifier(mod)) {
        resourceInfo = mod.resource;
      } else if (Array.isArray((mod as any).resource)) {
        resourceInfo = (mod as any).resource.join(', ');
      } else {
        resourceInfo = (mod as any).resource || 'unknown';
      }

      logger.debug(`[CustomModifierService]   Modifier effect on ${resourceInfo}`);

      // Apply static modifiers with ongoing OR numeric duration
      if (isStaticModifier(mod) && (isOngoingDuration(mod.duration) || typeof mod.duration === 'number')) {
        const current = modifiersByResource.get(mod.resource) || 0;
        const newValue = current + mod.value;
        modifiersByResource.set(mod.resource, newValue);
        logger.debug(`[CustomModifierService]   Applying ${mod.value} to ${mod.resource} (new total: ${newValue})`);

        // Track numeric durations for decrementing
        if (typeof mod.duration === 'number') {
          modifiersToDecrement.push({ modifierId: modifier.id, modifierIndex: i });
        }
      } else {
        logger.debug(`[CustomModifierService]   Skipping (not applicable for application)`);
      }
    }
  }
  
  // Apply all at once (single batch)
  const numericModifiers = Array.from(modifiersByResource.entries()).map(([resource, value]) => ({
    resource: resource as any,
    value
  }));

  logger.debug(`[CustomModifierService] Batched modifiers to apply:`);
  numericModifiers.forEach(m => logger.debug(`   ${m.resource}: ${m.value}`));
  
  if (numericModifiers.length > 0) {
    const gameCommandsService = await createGameCommandsService();
    await gameCommandsService.applyNumericModifiers(numericModifiers);
    logger.debug(`✅ [CustomModifierService] Applied ${numericModifiers.length} modifier effects`);
  } else {
    logger.debug(`[CustomModifierService] No modifiers to apply (all skipped)`);
  }
  
  // Decrement turn-based durations and remove expired modifiers
  if (modifiersToDecrement.length > 0) {
    logger.debug(`[CustomModifierService] Decrementing ${modifiersToDecrement.length} turn-based modifiers`);
    await updateKingdom(kingdom => {
      const modifiersToRemove: string[] = [];
      
      for (const { modifierId, modifierIndex } of modifiersToDecrement) {
        const modifier = kingdom.activeModifiers?.find(m => m.id === modifierId);
        if (modifier && modifier.modifiers[modifierIndex]) {
          const mod = modifier.modifiers[modifierIndex];
          if (typeof mod.duration === 'number') {
            mod.duration -= 1;
            logger.debug(`[CustomModifierService]   ${modifier.name}: ${mod.duration + 1} → ${mod.duration} turns remaining`);

            // Mark modifier for removal if all its modifiers are expired
            if (mod.duration <= 0) {
              const allExpired = modifier.modifiers.every(m => 
                typeof m.duration === 'number' && m.duration <= 0
              );
              if (allExpired && !modifiersToRemove.includes(modifierId)) {
                modifiersToRemove.push(modifierId);
              }
            }
          }
        }
      }
      
      // Remove expired modifiers
      if (modifiersToRemove.length > 0) {
        logger.debug(`[CustomModifierService] Removing ${modifiersToRemove.length} expired modifiers`);
        kingdom.activeModifiers = kingdom.activeModifiers?.filter(m => 
          !modifiersToRemove.includes(m.id)
        ) || [];
      }
    });
  }
}

/**
 * Factory function for creating a custom modifier service
 * Provides a consistent interface for service creation
 */
export async function createCustomModifierService(config?: CustomModifierServiceConfig) {
  return {
    async applyCustomModifiers() {
      await applyCustomModifiers(config);
    }
  };
}
