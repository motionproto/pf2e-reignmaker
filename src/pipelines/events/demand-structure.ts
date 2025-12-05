/**
 * Demand Structure Event Pipeline
 *
 * Enhanced event where citizens demand a specific structure be built.
 * 
 * Initial Event:
 * - Critical Success: -1 unrest, ends (leadership inspires confidence)
 * - Success: ends (promises of future construction accepted)
 * - Failure: Select target structure, create ongoing modifier, ongoing (no immediate penalty)
 * - Critical Failure: +1 unrest, select target structure, create ongoing modifier, ongoing
 *
 * Target Structure Selection Rules:
 * - Follows tier progression: demands ONLY the next tier in a category
 * - If no structures in category: demands tier 1
 * - If tier N built: demands tier N+1 (not lower tiers)
 * - Must not already exist in the target settlement
 * - Random selection from all valid candidates across settlements
 *
 * Ongoing Phase (each subsequent turn):
 * - The modifier "Citizens demand a <structurename>" generates +1 unrest per turn
 * - Critical Success: ends (citizens convinced, modifier removed)
 * - Success: No additional penalty (managed expectations this turn)
 * - Failure: +1 unrest (pressure builds, modifier continues)
 * - Critical Failure: +1 unrest (citizens grow restless, modifier continues)
 *
 * Auto-Resolution (when target structure is built in that settlement):
 * - -1d4 unrest (citizens celebrate)
 * - Modifier removed
 * - Event ends
 */

import type { CheckPipeline } from '../../types/CheckPipeline';
import { textBadge } from '../../types/OutcomeBadge';
import { logger } from '../../utils/Logger';

export const demandStructurePipeline: CheckPipeline = {
  id: 'demand-structure',
  name: 'Demand Structure',
  description: 'Citizens demand that a specific structure be built.',
  checkType: 'event',
  tier: 1,

  skills: [
    { skill: 'diplomacy', description: 'negotiate a compromise' },
    { skill: 'intimidation', description: 'enforce order' },
    { skill: 'society', description: 'understand their needs' },
  ],

  outcomes: {
    criticalSuccess: {
      description: 'Your leadership inspires the citizens to patience.',
      endsEvent: true,
      modifiers: [
        { type: 'static', resource: 'unrest', value: -1, duration: 'immediate' }
      ]
    },
    success: {
      description: 'The citizens accept your promises of future construction.',
      endsEvent: true,
      modifiers: []
    },
    failure: {
      description: 'The citizens point to a specific structure and demand it be built.',
      endsEvent: false,
      modifiers: []  // No immediate penalty on failure - the ongoing modifier handles it
    },
    criticalFailure: {
      description: 'The citizens grow angry and demand a specific structure be built immediately.',
      endsEvent: false,
      modifiers: [
        { type: 'static', resource: 'unrest', value: 1, duration: 'immediate' }
      ]
    },
  },

  preview: {
    calculate: async (ctx) => {
      const outcomeBadges: any[] = [];
      
      // Only select target structure on failure/criticalFailure for NON-ongoing instances
      if ((ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') && !ctx.metadata?.demandedStructureId) {
        // First time this event triggers with failure - select a target structure and settlement
        const { structuresService } = await import('../../services/structures');
        const { kingdomData } = await import('../../stores/KingdomStore');
        const { get } = await import('svelte/store');
        const { getCategoryDisplayName } = await import('../../models/Structure');
        
        structuresService.initializeStructures();
        const allStructures = structuresService.getAllStructures();
        const kingdom = get(kingdomData);
        
        // Need at least one settlement
        if (!kingdom.settlements || kingdom.settlements.length === 0) {
          logger.warn('[DemandStructure] No settlements available');
          outcomeBadges.push(
            textBadge('No settlements available', 'fa-exclamation-triangle', 'info')
          );
          return { resources: [], outcomeBadges };
        }
        
        // Build list of all valid candidates: { structure, settlement }
        // Following tier progression rules
        type Candidate = { structure: any; settlement: any };
        const candidates: Candidate[] = [];
        
        for (const settlement of kingdom.settlements) {
          const builtStructureIds = new Set<string>(settlement.structureIds || []);
          const builtStructures = allStructures.filter(s => builtStructureIds.has(s.id));
          
          // Group structures by category to check tier progression
          const categoryMaxTiers = new Map<string, number>();
          for (const built of builtStructures) {
            if (!built.category) continue;
            const categoryName = getCategoryDisplayName(built.category);
            const currentMax = categoryMaxTiers.get(categoryName) || 0;
            categoryMaxTiers.set(categoryName, Math.max(currentMax, built.tier || 1));
          }
          
          // Find structures at the NEXT tier only (natural progression)
          for (const structure of allStructures) {
            // Skip if already built in this settlement
            if (builtStructureIds.has(structure.id)) continue;
            
            const categoryName = structure.category ? getCategoryDisplayName(structure.category) : '';
            const maxTierInCategory = categoryMaxTiers.get(categoryName) || 0;
            const nextTier = maxTierInCategory + 1;
            const structureTier = structure.tier || 1;
            
            // Only demand the NEXT tier in progression (not lower tiers we already have)
            if (structureTier === nextTier) {
              candidates.push({ structure, settlement });
            }
          }
        }
        
        if (candidates.length > 0) {
          // Select random candidate
          const selected = candidates[Math.floor(Math.random() * candidates.length)];
          const targetStructure = selected.structure;
          const targetSettlement = selected.settlement;
          
          ctx.metadata.demandedStructureId = targetStructure.id;
          ctx.metadata.demandedStructureName = targetStructure.name;
          ctx.metadata.demandedStructureCategory = targetStructure.category;
          ctx.metadata.demandedStructureTier = targetStructure.tier || 1;
          ctx.metadata.demandedSettlementId = targetSettlement.id;
          ctx.metadata.demandedSettlementName = targetSettlement.name;
          
          logger.info(`[DemandStructure] Selected target: ${targetStructure.name} (Tier ${targetStructure.tier || 1}) in ${targetSettlement.name}`);
          
          // Add badge showing the demanded structure and settlement
          outcomeBadges.push(
            textBadge(`Citizens of ${targetSettlement.name} demand a ${targetStructure.name}`, 'fa-bullhorn', 'negative')
          );
          
          // Add badge explaining the ongoing effect
          outcomeBadges.push(
            textBadge('Ongoing: +1 Unrest per turn until built', 'fa-clock', 'negative')
          );
        } else {
          logger.warn('[DemandStructure] No valid candidate structures found across all settlements');
          // Add warning badge
          outcomeBadges.push(
            textBadge('No available structures to demand', 'fa-exclamation-triangle', 'info')
          );
        }
      } else if (ctx.metadata?.demandedStructureId) {
        // Ongoing event - show the existing demanded structure and settlement
        const demandText = ctx.metadata.demandedSettlementName 
          ? `Citizens of ${ctx.metadata.demandedSettlementName} demand a ${ctx.metadata.demandedStructureName}`
          : `Citizens demand a ${ctx.metadata.demandedStructureName}`;
        
        outcomeBadges.push(
          textBadge(demandText, 'fa-bullhorn', 'negative')
        );
        
        // For ongoing events, show different messages based on outcome
        if (ctx.outcome === 'criticalSuccess') {
          outcomeBadges.push(
            textBadge('Event Ends - Citizens convinced!', 'fa-check-circle', 'positive')
          );
          outcomeBadges.push(
            textBadge('Ongoing modifier removed', 'fa-times-circle', 'positive')
          );
        } else if (ctx.outcome === 'success') {
          outcomeBadges.push(
            textBadge('Expectations managed for now', 'fa-handshake', 'info')
          );
          outcomeBadges.push(
            textBadge('Ongoing modifier continues', 'fa-clock', 'negative')
          );
        } else {
          // failure or criticalFailure on ongoing
          outcomeBadges.push(
            textBadge('Ongoing modifier continues', 'fa-clock', 'negative')
          );
        }
      }
      
      return { resources: [], outcomeBadges };
    }
  },

  execute: async (ctx) => {
    const { updateKingdom, kingdomData } = await import('../../stores/KingdomStore');
    const { get } = await import('svelte/store');
    const { settlementService, structureDemands } = await import('../../services/settlements');
    
    // On failure/criticalFailure - register demand with settlement service
    if ((ctx.outcome === 'failure' || ctx.outcome === 'criticalFailure') && ctx.metadata?.demandedStructureId) {
      // Check if this is the first time (no existing modifier for this event instance)
      const demands = get(structureDemands);
      const existingDemand = demands.find(d => d.eventInstanceId === ctx.instanceId);
      
      if (!existingDemand) {
        const kingdom = get(kingdomData);
        
        logger.info(`[DemandStructure] Registering demand via settlement service: ${ctx.metadata.demandedStructureName} in ${ctx.metadata.demandedSettlementName}`);
        
        await settlementService.registerDemand({
          structureId: ctx.metadata.demandedStructureId,
          structureName: ctx.metadata.demandedStructureName,
          settlementId: ctx.metadata.demandedSettlementId,
          settlementName: ctx.metadata.demandedSettlementName || 'the settlement',
          eventInstanceId: ctx.instanceId,
          currentTurn: kingdom.currentTurn
        });
      } else {
        logger.info(`[DemandStructure] Demand already registered for this event instance`);
      }
    }
    
    // On criticalSuccess - remove the ongoing modifier (event ends)
    if (ctx.outcome === 'criticalSuccess' && ctx.metadata?.demandedStructureId) {
      logger.info(`[DemandStructure] Removing ongoing modifier - citizens convinced`);
      
      await updateKingdom(kingdom => {
        if (kingdom.activeModifiers) {
          kingdom.activeModifiers = kingdom.activeModifiers.filter(
            (m: any) => !(m.sourceId === ctx.instanceId && m.sourceType === 'custom')
          );
        }
      });
    }
    
    return { success: true };
  },

  traits: ["dangerous", "ongoing"],
};
