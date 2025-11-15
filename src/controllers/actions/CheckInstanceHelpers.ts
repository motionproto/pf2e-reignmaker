/**
 * Check Instance Management Helpers
 * 
 * Centralizes logic for creating and managing check instances for actions.
 * Handles placeholder replacement, metadata preparation, and instance creation.
 */

import { createCheckInstanceService } from '../../services/CheckInstanceService';
import { getKingdomActor, updateKingdom } from '../../stores/KingdomStore';
import type { PlayerAction } from './action-types';
import type { Army } from '../../models/Army';

/**
 * Pending actions state - passed from ActionsPhase component
 */
export interface PendingActionsState {
  pendingBuildAction?: { skill: string; structureId?: string; settlementId?: string } | null;
  pendingRepairAction?: { skill: string; structureId?: string; settlementId?: string } | null;
  pendingUpgradeAction?: { skill: string; settlementId?: string } | null;
  pendingDiplomaticAction?: { skill: string; factionId?: string; factionName?: string } | null;
  pendingInfiltrationAction?: { skill: string; factionId?: string; factionName?: string } | null;
  pendingStipendAction?: { skill: string; settlementId?: string } | null;
}

/**
 * Replace placeholders in action effect messages.
 * 
 * Handles dynamic replacement of {structure}, {Settlement}, etc.
 * with actual names from pending action context.
 * 
 * @param text - Text containing placeholders
 * @param actionId - Action ID to determine which placeholder logic to use
 * @param pendingActions - State containing pending action data
 * @returns Text with placeholders replaced
 */
export async function replacePlaceholders(
  text: string,
  actionId: string,
  pendingActions: PendingActionsState
): Promise<string> {
  let result = text;
  
  // Handle build-structure: {structure} placeholder
  if (actionId === 'build-structure' && result.includes('{structure}')) {
    if (pendingActions.pendingBuildAction?.structureId) {
      const { structuresService } = await import('../../services/structures');
      const structure = structuresService.getStructure(pendingActions.pendingBuildAction.structureId);
      
      if (structure) {
        result = result.replace(/{structure}/g, structure.name);
      } else {
        result = result.replace(/{structure}/g, 'structure');
      }
    } else {
      result = result.replace(/{structure}/g, 'structure');
    }
  }
  
  // Handle repair-structure: {structure} placeholder
  if (actionId === 'repair-structure' && result.includes('{structure}')) {
    if (pendingActions.pendingRepairAction?.structureId) {
      const { structuresService } = await import('../../services/structures');
      const structure = structuresService.getStructure(pendingActions.pendingRepairAction.structureId);
      
      if (structure) {
        result = result.replace(/{structure}/g, structure.name);
      } else {
        result = result.replace(/{structure}/g, 'structure');
      }
    } else {
      result = result.replace(/{structure}/g, 'structure');
    }
  }
  
  // Handle upgrade-settlement: Replace generic text with personalized outcome
  if (actionId === 'upgrade-settlement' && pendingActions.pendingUpgradeAction?.settlementId) {
    const actor = getKingdomActor();
    if (actor) {
      const kingdom = actor.getKingdomData();
      const settlement = kingdom?.settlements.find((s: any) => 
        s.id === pendingActions.pendingUpgradeAction!.settlementId
      );
      
      if (settlement) {
        const newLevel = settlement.level + 1;
        
        // Replace generic outcome text with personalized versions
        if (result.includes('Settlement level increases by 1 at half the cost')) {
          result = `${settlement.name} level increases to ${newLevel} at half the cost (rounded up)`;
        } else if (result.includes('Settlement level increases by 1')) {
          result = `${settlement.name} level increases to ${newLevel}`;
        } else if (result.includes('achieve nothing in the settlement')) {
          result = result.replace('in the settlement', `in ${settlement.name}`);
        } else if (result.includes('investment in the settlement')) {
          result = result.replace('in the settlement', `in ${settlement.name}`);
        }
      }
    }
  }
  
  return result;
}

/**
 * Create action metadata for instance storage.
 * 
 * @param actionId - Action ID
 * @param pendingActions - Pending action state
 * @returns Metadata object or undefined
 */
export function createActionMetadata(
  actionId: string,
  pendingActions: PendingActionsState
): Record<string, any> | undefined {
  if (actionId === 'repair-structure' && pendingActions.pendingRepairAction) {
    return {
      structureId: pendingActions.pendingRepairAction.structureId,
      settlementId: pendingActions.pendingRepairAction.settlementId
    };
  }
  
  if (actionId === 'upgrade-settlement' && pendingActions.pendingUpgradeAction) {
    return {
      settlementId: pendingActions.pendingUpgradeAction.settlementId
    };
  }
  
  if (actionId === 'dimplomatic-mission' && pendingActions.pendingDiplomaticAction) {
    return {
      factionId: pendingActions.pendingDiplomaticAction.factionId,
      factionName: pendingActions.pendingDiplomaticAction.factionName
    };
  }
  
  if (actionId === 'infiltration' && (pendingActions as any).pendingInfiltrationAction) {
    return {
      factionId: (pendingActions as any).pendingInfiltrationAction.factionId,
      factionName: (pendingActions as any).pendingInfiltrationAction.factionName
    };
  }
  
  if (actionId === 'collect-stipend' && pendingActions.pendingStipendAction) {
    return {
      settlementId: pendingActions.pendingStipendAction.settlementId
    };
  }
  
  return undefined;
}

/**
 * Create a check instance for an action with outcome data.
 * 
 * Handles:
 * - Placeholder replacement in effect messages
 * - Metadata preparation
 * - Instance creation via CheckInstanceService
 * - Preliminary resolution data preparation
 * 
 * @param context - Action resolution context
 * @returns Instance ID
 */
export async function createActionCheckInstance(context: {
  actionId: string;
  action: PlayerAction;
  outcome: string;
  actorName: string;
  actorId?: string;  // ✅ ADD: Actor ID
  actorLevel?: number;  // ✅ ADD: Actor level
  proficiencyRank?: number;  // ✅ ADD: Proficiency rank
  skillName?: string;
  rollBreakdown?: any;
  currentTurn: number;
  pendingActions: PendingActionsState;
  controller: any;
}): Promise<string> {
  const {
    actionId,
    action,
    outcome,
    actorName,
    actorId,
    actorLevel,
    proficiencyRank,
    skillName,
    rollBreakdown,
    currentTurn,
    pendingActions,
    controller
  } = context;
  
  const checkInstanceService = await createCheckInstanceService();
  
  const outcomeType = outcome as 'success' | 'criticalSuccess' | 'failure' | 'criticalFailure';
  
  // Get modifiers from the action for preview
  const modifiers = controller.getActionModifiers(action, outcomeType);
  
  // Get base outcome description (handle both nested and top-level)
  const outcomeData = (action as any).effects?.[outcomeType] || action[outcomeType];
  let effectMessage = outcomeData?.description || 'Action completed';
  
  // Replace placeholders in effect message
  effectMessage = await replacePlaceholders(effectMessage, actionId, pendingActions);
  
  // Create metadata with actor context
  const metadata = {
    ...createActionMetadata(actionId, pendingActions),
    // ✅ ADD: Actor context for pipeline use
    actor: actorId ? {
      actorId,
      actorName,
      level: actorLevel || 1,
      selectedSkill: skillName || '',
      proficiencyRank: proficiencyRank || 0
    } : undefined
  };
  
  // Create instance
  const instanceId = await checkInstanceService.createInstance(
    'action',
    actionId,
    action,
    currentTurn,
    metadata
  );
  
  // Build preliminary resolution data with dynamic modifiers
  // IMPORTANT: Keep raw modifiers (with formulas) for OutcomeDisplay
  let preliminaryModifiers = modifiers.map((m: any) => ({ 
    resource: m.resource, 
    value: m.value,
    type: m.type,  // Preserve type (static/dice)
    formula: m.formula,  // Preserve formula for dice rolls
    operation: m.operation,
    duration: m.duration
  }));
  
  // Special handling for upgrade-settlement: inject cost modifier
  if (actionId === 'upgrade-settlement' && pendingActions.pendingUpgradeAction?.settlementId) {
    const actor = getKingdomActor();
    if (actor && pendingActions.pendingUpgradeAction) {
      const kingdom = actor.getKingdomData();
      const settlement = kingdom?.settlements.find((s: any) => 
        s.id === pendingActions.pendingUpgradeAction!.settlementId
      );
      
      if (settlement) {
        const newLevel = settlement.level + 1;
        const fullCost = newLevel;
        
        // Calculate cost based on outcome
        let actualCost = fullCost;
        if (outcomeType === 'success') {
          actualCost = fullCost;
        } else if (outcomeType === 'criticalSuccess') {
          actualCost = Math.ceil(fullCost / 2);
        } else if (outcomeType === 'failure') {
          actualCost = Math.ceil(fullCost / 2);
        } else if (outcomeType === 'criticalFailure') {
          actualCost = fullCost;
        }
        
        // Add cost modifier
        preliminaryModifiers.push({
          resource: 'gold',
          value: -actualCost
        });
      }
    }
  }
  
  // PREPARE/COMMIT PATTERN: Execute game commands to PREPARE (not commit)
  // This allows the OutcomeDisplay to show special effect badges before Apply Result is clicked
  let preliminarySpecialEffects: any[] = [];
  let pendingCommits: Array<() => Promise<void>> = [];
  
  // Build preliminary resolution data first (needed for preview calculation)
  const preliminaryResolutionData = {
    diceRolls: {},
    choices: {},
    allocations: {},
    textInputs: {},
    compoundData: {},
    numericModifiers: preliminaryModifiers,
    manualEffects: [],
    complexActions: [],
    customComponentData: null
  };
  
  // ✅ CALCULATE PREVIEW FOR MIGRATED PIPELINE ACTIONS
  // Check if action uses new pipeline system
  const MIGRATED_ACTIONS = new Set([
    'deal-with-unrest', 'sell-surplus', 'purchase-resources', 'harvest-resources',
    'claim-hexes', 'build-roads', 'fortify-hex', 'create-worksite', 'send-scouts',
    'collect-stipend'
  ]);
  
  if (MIGRATED_ACTIONS.has(actionId)) {
    console.log(`🎯 [CheckInstanceHelpers] Calculating preview for migrated action: ${actionId}`);
    
    try {
      const actor = getKingdomActor();
      if (actor) {
        const kingdom = actor.getKingdomData();
        const { unifiedCheckHandler } = await import('../../services/UnifiedCheckHandler');
        
        // Build context for preview calculation
        const context = {
          check: action,
          outcome: outcomeType,
          kingdom,
          metadata,
          resolutionData: preliminaryResolutionData
        };
        
        // Calculate preview
        const preview = await unifiedCheckHandler.calculatePreview(actionId, context);
        
        // Format preview to special effects
        const formattedPreview = unifiedCheckHandler.formatPreview(actionId, preview);
        
        // Add preview special effects
        preliminarySpecialEffects.push(...formattedPreview);
        
        console.log(`✅ [CheckInstanceHelpers] Preview calculated:`, formattedPreview);
      }
    } catch (error) {
      console.error(`❌ [CheckInstanceHelpers] Failed to calculate preview:`, error);
    }
  }
  
  // Get game commands from action outcome (reuse outcomeData from above)
  const gameCommands = outcomeData?.gameCommands || [];

  // Skip prepare/commit for actions with custom implementations
  // These handle their own resolution logic
  const actionsWithCustomImplementations = ['outfit-army'];
  const shouldSkipPrepare = actionsWithCustomImplementations.includes(actionId);

  if (gameCommands.length > 0 && !shouldSkipPrepare) {
    const actor = getKingdomActor();
    if (actor) {
      const kingdom = actor.getKingdomData();
      
      // Import resolver to prepare commands
      const { createGameCommandsResolver } = await import('../../services/GameCommandsResolver');
      const resolver = await createGameCommandsResolver();
      
      // Execute each game command to PREPARE (returns PreparedCommand or ResolveResult)
      for (const gameCommand of gameCommands) {
        try {
          let result: any;
          
          // Call the appropriate resolver method based on game command type
          switch (gameCommand.type) {
            case 'giveActorGold': {
              // Get settlementId from gameCommand OR from pending action state
              let settlementId = gameCommand.settlementId;
              if (!settlementId && (globalThis as any).__pendingStipendSettlement) {
                settlementId = (globalThis as any).__pendingStipendSettlement;
              }
              
              if (settlementId) {
                const multiplier = parseFloat(gameCommand.multiplier) || 1;
                result = await resolver.giveActorGold(multiplier, settlementId);
              }
              break;
            }
            
            case 'recruitArmy': {
              // Determine army level
              let level = 1; // Default level
              
              if (gameCommand.level === 'kingdom-level') {
                // Get party level from kingdom data (synced by partyLevelHooks)
                level = kingdom.partyLevel || 1;
              } else if (typeof gameCommand.level === 'number') {
                level = gameCommand.level;
              }
              
              // Pass exemptFromUpkeep flag for allied armies
              const exemptFromUpkeep = gameCommand.exemptFromUpkeep === true;
              
              // For allied armies, get faction ID from global state and store it for resolver
              if (exemptFromUpkeep) {
                const factionId = (globalThis as any).__pendingEconomicAidFaction;
                if (factionId) {
                  // Store faction ID in pending recruit data so resolver can pick it up
                  const existingPendingData = (globalThis as any).__pendingRecruitArmy || {};
                  (globalThis as any).__pendingRecruitArmy = {
                    ...existingPendingData,
                    supportedBy: factionId  // Faction ID provides support/upkeep
                    // ledBy remains PLAYER_KINGDOM (player commands the army)
                  };
                }
              }
              
              result = await resolver.recruitArmy(level, undefined, exemptFromUpkeep);
              break;
            }
            
            case 'foundSettlement': {
              // For critical success on Establish Settlement, grant free structure
              const grantFreeStructure = (outcomeType === 'criticalSuccess');
              result = await resolver.foundSettlement(
                gameCommand.name || 'New Settlement',
                gameCommand.location || { x: 0, y: 0 },
                grantFreeStructure
              );
              break;
            }
            
            case 'disbandArmy': {
              // Get armyId from pending state (set by pre-roll dialog)
              const armyId = (globalThis as any).__pendingDisbandArmyArmy;
              const deleteActor = gameCommand.deleteActor !== false; // Default to true
              
              if (!armyId) {
                console.error('❌ [CheckInstanceHelpers] No army selected for disbanding');
                break;
              }
              
              result = await resolver.disbandArmy(armyId, deleteActor);
              break;
            }
            
            case 'trainArmy': {
              // Get armyId from pending state (set by pre-roll dialog)
              const armyId = (globalThis as any).__pendingTrainArmyArmy;
              
              if (!armyId) {
                console.error('❌ [CheckInstanceHelpers] No army selected for training');
                break;
              }
              
              result = await resolver.trainArmy(armyId, outcomeType);
              break;
            }
            
            case 'adjustFactionAttitude': {
              // Get factionId from gameCommand OR from pending state OR from metadata (before actor was added)
              const baseMetadata = createActionMetadata(actionId, pendingActions);
              const factionId = gameCommand.factionId || (globalThis as any).__pendingEconomicAidFaction || baseMetadata?.factionId;
              const factionName = (globalThis as any).__pendingEconomicAidFactionName || baseMetadata?.factionName || 'faction';
              const steps = gameCommand.steps || -1;
              
              if (factionId) {
                // IMPORTANT: Capture factionId and factionName in closure for commit phase
                const capturedFactionId = factionId;
                const capturedFactionName = factionName;
                const capturedSteps = steps;
                
                // Call resolver to prepare the command
                result = await resolver.adjustFactionAttitude(
                  capturedFactionId,
                  capturedSteps,
                  {
                    maxLevel: gameCommand.maxLevel,
                    minLevel: gameCommand.minLevel,
                    count: gameCommand.count
                  }
                );
                
                // If result is a PreparedCommand, wrap its commit to use captured values
                if (result && 'commit' in result) {
                  const originalCommit = result.commit;
                  result.commit = async () => {
                    // Execute original commit (which should use the captured faction ID)
                    await originalCommit();
                  };
                }
              }
              break;
            }
            
            case 'requestMilitaryAidFactionAttitude': {
              // Request Military Aid-specific wrapper around adjustFactionAttitude
              // Gets factionId from pending state (set by pre-roll dialog)
              const factionId = (globalThis as any).__pendingEconomicAidFaction;
              const factionName = (globalThis as any).__pendingEconomicAidFactionName || 'faction';
              const steps = gameCommand.steps || -1;
              
              if (factionId) {
                // IMPORTANT: Capture factionId and factionName in closure for commit phase
                const capturedFactionId = factionId;
                const capturedFactionName = factionName;
                const capturedSteps = steps;
                
                // Call resolver's adjustFactionAttitude (reuse the same implementation)
                result = await resolver.adjustFactionAttitude(
                  capturedFactionId,
                  capturedSteps,
                  {
                    maxLevel: gameCommand.maxLevel,
                    minLevel: gameCommand.minLevel,
                    count: gameCommand.count
                  }
                );
                
                // If result is a PreparedCommand, wrap its commit to use captured values
                if (result && 'commit' in result) {
                  const originalCommit = result.commit;
                  result.commit = async () => {
                    // Execute original commit (which should use the captured faction ID)
                    await originalCommit();
                  };
                }
              }
              break;
            }
            
            case 'outfitArmy': {
              // Get armyId from gameCommand (optional - can auto-select)
              const armyId = gameCommand.armyId;
              const equipmentType = gameCommand.equipmentType || 'armor';
              const fallbackToGold = gameCommand.fallbackToGold === true;
              
              // Convert outcome to appropriate format for resolver
              const resolverOutcome = outcomeType === 'criticalSuccess' ? 'criticalSuccess' 
                : outcomeType === 'success' ? 'success'
                : outcomeType === 'failure' ? 'failure'
                : 'criticalFailure';
              
              // outfitArmy now returns PreparedCommand | ResolveResult (hybrid during migration)
              result = await resolver.outfitArmy(armyId, equipmentType, resolverOutcome, fallbackToGold);
              
              // Check if result is ResolveResult (legacy) and convert to PreparedCommand
              if (result && 'success' in result && !('specialEffect' in result)) {
                // Legacy ResolveResult - convert to PreparedCommand format
                if (result.success) {
                  const message = result.data?.message || 'Army outfitted';
                  const isNegative = result.data?.grantedGold === true;
                  
                  result = {
                    specialEffect: {
                      type: 'status',
                      message: message,
                      icon: isNegative ? 'fa-coins' : 'fa-shield-alt',
                      variant: isNegative ? 'neutral' : 'positive'
                    },
                    commit: async () => {
                      // Already executed by resolver (legacy pattern)
                      console.log('✅ [CheckInstanceHelpers] outfitArmy already applied (legacy)');
                    }
                  };
                }
              }
              // If result is already PreparedCommand, use it as-is
              break;
            }
            
            case 'requestMilitaryAidRecruitment': {
              // Custom game command for Request Military Aid critical success
              // Shows RecruitArmyDialog FIRST, then prepares allied army recruitment
              
              // Determine army level
              let level = 1;
              if (gameCommand.level === 'kingdom-level') {
                level = kingdom.partyLevel || 1;
              } else if (typeof gameCommand.level === 'number') {
                level = gameCommand.level;
              }
              
              const exemptFromUpkeep = gameCommand.exemptFromUpkeep === true;
              
              // Import and show RecruitArmyDialog to get army details
              const { default: RecruitArmyDialog } = await import('../../view/kingdom/components/RecruitArmyDialog.svelte');
              
              const recruitmentData = await new Promise<any>((resolve) => {
                let dialogComponent: any;
                
                const mount = document.createElement('div');
                document.body.appendChild(mount);
                
                dialogComponent = new RecruitArmyDialog({
                  target: mount,
                  props: { 
                    show: true,
                    exemptFromUpkeep: exemptFromUpkeep  // Pass exemptFromUpkeep to hide settlement selector
                  }
                });
                
                dialogComponent.$on('confirm', (event: CustomEvent) => {
                  dialogComponent.$destroy();
                  mount.remove();
                  resolve(event.detail);
                });
                
                dialogComponent.$on('cancel', () => {
                  dialogComponent.$destroy();
                  mount.remove();
                  resolve(null);
                });
              });
              
              if (recruitmentData) {
                // Set pending recruitment data
                (globalThis as any).__pendingRecruitArmy = recruitmentData;
                
                // Now prepare recruitment with the data
                result = await resolver.recruitArmy(level, undefined, exemptFromUpkeep);
              } else {
                // User cancelled - no-op
                result = null;
              }
              break;
            }
            
            case 'requestMilitaryAidEquipment': {
              // Custom game command for Request Military Aid success
              // Shows custom EquipmentSelectionDialog with army dropdown + equipment choices
              
              // IMPORTANT: Check if there are any armies available BEFORE showing dialog
              const availableArmies = (kingdom.armies || []).filter((a: Army) => {
                if (!a.actorId) return false;
                // Check if army has at least one equipment slot available
                const validTypes = ['armor', 'runes', 'weapons', 'equipment'];
                return validTypes.some(type => !a.equipment?.[type as keyof typeof a.equipment]);
              });
              
              if (availableArmies.length === 0) {
                // No armies to outfit - grant 1 gold instead (fallback case)
                console.log('💰 [CheckInstanceHelpers] No armies available to outfit - PREPARING to grant 1 gold');
                
                // Return PreparedCommand with commit function that adds gold
                result = {
                  specialEffect: {
                    type: 'resource',
                    message: 'No armies available to outfit - received 1 Gold instead',
                    icon: 'fa-coins',
                    variant: 'neutral'
                  },
                  commit: async () => {
                    console.log('🎬 [CheckInstanceHelpers] COMMITTING: Adding 1 gold');
                    
                    await updateKingdom(k => {
                      k.resources.gold = (k.resources.gold || 0) + 1;
                    });
                    
                    console.log('✅ [CheckInstanceHelpers] Gold fallback applied successfully');
                  }
                };
                
                break;
              }
              
              // Import custom dialog dynamically
              const { default: EquipmentSelectionDialog } = await import('../../actions/request-military-aid/EquipmentSelectionDialog.svelte');
              
              // Show dialog and wait for user selection
              const selection = await new Promise<{ armyId: string; equipmentType: string } | null>((resolve) => {
                let dialogComponent: any;
                
                const mount = document.createElement('div');
                document.body.appendChild(mount);
                
                dialogComponent = new EquipmentSelectionDialog({
                  target: mount,
                  props: { show: true }
                });
                
                // Let Dialog component handle its own show/hide lifecycle
                dialogComponent.$on('confirm', (event: CustomEvent) => {
                  // Don't manipulate show - let Dialog handle it
                  dialogComponent.$destroy();
                  mount.remove();
                  resolve(event.detail);
                });
                
                dialogComponent.$on('cancel', () => {
                  // Don't manipulate show - let Dialog handle it
                  dialogComponent.$destroy();
                  mount.remove();
                  resolve(null);
                });
              });
              
              if (selection) {
                // PREPARE: Generate preview message only (don't apply equipment yet)
                console.log('🎬 [CheckInstanceHelpers] Selection received:', selection);
                
                const army = kingdom.armies?.find((a: any) => a.id === selection.armyId);
                const armyName = army?.name || 'Army';
                
                const equipmentNames = {
                  armor: 'Armor',
                  runes: 'Runes',
                  weapons: 'Weapons',
                  equipment: 'Enhanced Gear'
                };
                const equipmentName = equipmentNames[selection.equipmentType as keyof typeof equipmentNames] || selection.equipmentType;
                
                const message = `${armyName} will be outfitted with ${equipmentName}`;
                
                // Return PreparedCommand with commit function that actually applies equipment
                result = {
                  specialEffect: {
                    type: 'status',
                    message: message,
                    icon: 'fa-shield-alt',
                    variant: 'positive'
                  },
                  commit: async () => {
                    console.log('🎬 [CheckInstanceHelpers] COMMITTING requestMilitaryAidEquipment');
                    console.log('  - armyId:', selection.armyId);
                    console.log('  - equipmentType:', selection.equipmentType);
                    
                    // NOW apply the equipment
                    const applyResult = await resolver.outfitArmy(
                      selection.armyId, 
                      selection.equipmentType, 
                      'success',
                      false
                    );
                    
                    // Check if result is ResolveResult (has success property)
                    if ('success' in applyResult) {
                      if (!applyResult.success) {
                        console.error('❌ [CheckInstanceHelpers] Failed to outfit army:', applyResult.error);
                        throw new Error(applyResult.error || 'Failed to outfit army');
                      }
                    } else if ('commit' in applyResult) {
                      // PreparedCommand - execute commit
                      await applyResult.commit();
                    }
                    
                    console.log('✅ [CheckInstanceHelpers] Equipment applied successfully');
                  }
                };
                
                console.log('🎬 [CheckInstanceHelpers] Created PreparedCommand for equipment');
                console.log('  - has specialEffect:', !!result.specialEffect);
                console.log('  - has commit:', !!result.commit);
              } else {
                console.log('⚠️ [CheckInstanceHelpers] User cancelled equipment selection');
                // User cancelled - no-op
                result = null;
              }
              break;
            }
            
            // NOTE: Some actions use custom implementation (post-roll dialog)
            // They're handled by their own action files, not the prepare/commit pattern
            
            // Add more game command types here as they're refactored to PreparedCommand
          }
          
          // Check if result is a PreparedCommand (has specialEffect and commit)
          if (result && 'specialEffect' in result && 'commit' in result) {
            // NEW PATTERN: PreparedCommand
            preliminarySpecialEffects.push(result.specialEffect);
            pendingCommits.push(result.commit);
          }
        } catch (error) {
          console.error('❌ [CheckInstanceHelpers] Failed to prepare game command:', gameCommand.type, error);
        }
      }
    }
  }
  
  // Store outcome with special effects
  await checkInstanceService.storeOutcome(
    instanceId,
    outcomeType,
    preliminaryResolutionData,
    actorName,
    skillName || '',
    effectMessage,
    rollBreakdown,
    preliminarySpecialEffects  // Pass special effects to display in preview
  );
  
  // Store pending commits if any (prepare/commit pattern)
  // IMPORTANT: Store in client-side memory, NOT in actor flags (functions can't be serialized)
  if (pendingCommits.length > 0) {
    const { commitStorage } = await import('../../utils/CommitStorage');
    commitStorage.store(instanceId, pendingCommits);
  }
  
  return instanceId;
}

/**
 * Update check instance outcome (for debug mode).
 * 
 * Re-generates effect message with placeholder replacement and updates instance.
 * 
 * @param context - Update context
 */
export async function updateCheckInstanceOutcome(context: {
  instanceId: string;
  actionId: string;
  action: PlayerAction;
  newOutcome: string;
  instance: any;
  pendingActions: PendingActionsState;
  controller: any;
}): Promise<void> {
  const {
    instanceId,
    actionId,
    action,
    newOutcome,
    instance,
    pendingActions,
    controller
  } = context;
  
  const checkInstanceService = await createCheckInstanceService();
  
  // Get modifiers for the new outcome
  const modifiers = controller.getActionModifiers(action, newOutcome);
  
  // Get base outcome description
  const outcomeData = (action as any)[newOutcome];
  let customEffect: string | undefined = undefined;
  
  if (outcomeData?.description) {
    customEffect = await replacePlaceholders(
      outcomeData.description,
      actionId,
      pendingActions
    );
  }
  
  // Update instance with new outcome
  const resolutionData = {
    numericModifiers: modifiers.map((m: any) => ({ 
      resource: m.resource, 
      value: m.value 
    })),
    manualEffects: [],
    complexActions: []
  };
  
  await checkInstanceService.storeOutcome(
    instanceId,
    newOutcome,
    resolutionData,
    instance.appliedOutcome?.actorName || 'Unknown',
    instance.appliedOutcome?.skillName || '',
    customEffect || ((action as any)[newOutcome])?.description || 'Action completed',
    instance.appliedOutcome?.rollBreakdown  // Preserve existing rollBreakdown
  );
}
