// NOTE: Using new simplified ModifierService
import { createModifierService } from '../ModifierService';
import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { PF2eCharacterService } from './PF2eCharacterService';
import { getSkillPenalty } from '../domain/unrest/UnrestService';
import { logger } from '../../utils/Logger';

// Temporary variable for reroll modifier processing (loaded from kingdom.turnState during rerolls)
// NOTE: This is NOT persistent storage - used only during the reroll execution
// Persistent storage is in kingdom.turnState.actionsPhase.actionInstances (managed by PipelineCoordinator)
let lastRollModifiers: Array<{ label: string; modifier: number }> | null = null;

export interface SkillCheckOptions {
  skillName: string;
  checkType: 'action' | 'event' | 'incident';
  checkName: string;
  checkId: string;
  checkEffects?: any;
  character?: any;
  dc?: number;
}

export interface SkillCheckResult {
  success: boolean;
  roll?: any;
  character?: any;
  error?: string;
}

export class PF2eSkillService {
  private static instance: PF2eSkillService;
  private characterService: PF2eCharacterService;

  /**
   * Map action skill names to PF2e system skill slugs
   */
  private skillNameToSlug: Record<string, string> = {
    'intimidation': 'intimidation',
    'diplomacy': 'diplomacy',
    'stealth': 'stealth',
    'deception': 'deception',
    'athletics': 'athletics',
    'society': 'society',
    'crafting': 'crafting',
    'survival': 'survival',
    'nature': 'nature',
    'medicine': 'medicine',
    'religion': 'religion',
    'arcana': 'arcana',
    'occultism': 'occultism',
    'performance': 'performance',
    'acrobatics': 'acrobatics',
    'thievery': 'thievery',
    'lore': 'lore',
    'applicable-lore': 'lore',   // hyphen version
    'applicable lore': 'lore'     // space version
  };

  constructor() {
    this.characterService = PF2eCharacterService.getInstance();
  }

  static getInstance(): PF2eSkillService {
    if (!PF2eSkillService.instance) {
      PF2eSkillService.instance = new PF2eSkillService();
    }
    return PF2eSkillService.instance;
  }

  /**
   * Calculate DC for kingdom actions based on character level
   * Using the standard level-based DCs from PF2e
   * https://2e.aonprd.com/Rules.aspx?ID=2629
   */
  getKingdomActionDC(characterLevel: number = 1): number {
    // Standard level-based DCs for PF2e (character level, not kingdom level)
    const dcByLevel: Record<number, number> = {
      0: 14,
      1: 15,
      2: 16,
      3: 18,
      4: 19,
      5: 20,
      6: 22,
      7: 23,
      8: 24,
      9: 26,
      10: 27,
      11: 28,
      12: 30,
      13: 31,
      14: 32,
      15: 34,
      16: 35,
      17: 36,
      18: 38,
      19: 39,
      20: 40
    };
    
    return dcByLevel[Math.min(characterLevel, 20)] || 15;
  }

  /**
   * Convert kingdom modifiers to PF2e format
   */
  private convertToPF2eModifiers(modifiers: any[]): any[] {
    const pf2eModifiers = [];
    
    for (const mod of modifiers) {
      try {
        // Create proper PF2e Modifier instances
        const modifierValue = mod.value || mod.modifier || 0;
        const modifierLabel = mod.name || mod.label || 'Kingdom Modifier';
        const modifierType = mod.type || 'circumstance';
        
        // Use the PF2e Modifier constructor if available
        if (game?.pf2e?.Modifier) {
          const pf2eMod = new game.pf2e.Modifier({
            label: modifierLabel,
            modifier: modifierValue,
            type: modifierType,
            slug: modifierLabel.toLowerCase().replace(/\s+/g, '-'),
            ignored: mod.ignored === true,  // Use ignored instead of enabled for settlement modifiers
            enabled: mod.enabled === true
          });
          // Force the ignored state after construction (prevents auto-enable by stacking rules)
          if (mod.ignored === true) {
            pf2eMod.ignored = true;
            pf2eMod.enabled = false;
          } else if (mod.enabled === true) {
            pf2eMod.enabled = true;
          }
          pf2eModifiers.push(pf2eMod);
        } else {
          // Fallback to enhanced object format with test function
          const pf2eMod = {
            label: modifierLabel,
            modifier: modifierValue,
            type: modifierType,
            ignored: mod.ignored === true,
            enabled: mod.enabled === true,
            test: () => true, // Required by PF2e system
            slug: modifierLabel.toLowerCase().replace(/\s+/g, '-')
          };
          pf2eModifiers.push(pf2eMod);
        }
      } catch (error) {
        logger.warn('Failed to create PF2e modifier:', error, mod);
        // Fallback to basic object with test function
        pf2eModifiers.push({
          label: mod.name || mod.label || 'Kingdom Modifier',
          modifier: mod.value || mod.modifier || 0,
          type: mod.type || 'circumstance',
          ignored: mod.ignored === true,
          enabled: mod.enabled === true,
          test: () => true
        });
      }
    }
    
    return pf2eModifiers;
  }

  /**
   * Get kingdom modifiers for skill checks
   * @param skillName - Skill being checked (for structure bonuses)
   * @param actionId - Optional action ID to retrieve aid bonuses for that specific action/event
   * @param checkType - Optional check type to determine which phase aids to check
   * @param onlySettlementId - Optional settlement ID to only include that specific settlement's modifiers
   */
  private async getKingdomModifiers(skillName: string, actionId?: string, checkType?: 'action' | 'event' | 'incident', onlySettlementId?: string): Promise<any[]> {
    const currentKingdomState = get(kingdomData);
    const kingdomModifiers: any[] = [];
    
    // Import structures service for on-the-fly calculation
    const { structuresService } = await import('../structures');
    
    // Add settlement infrastructure bonuses - calculate on-the-fly
    // Only include settlements with valid map locations
    // Default to disabled so players can manually enable the relevant settlement
    if (currentKingdomState?.settlements) {
      // Filter settlements
      let mappedSettlements = currentKingdomState.settlements.filter(
        s => s.location.x !== 0 || s.location.y !== 0
      );
      
      // If onlySettlementId is specified, filter to just that settlement
      if (onlySettlementId) {
        mappedSettlements = mappedSettlements.filter(s => s.id === onlySettlementId);
        console.log('🏘️ [PF2eSkillService] Filtering to settlement:', onlySettlementId);
      }
      
      for (const settlement of mappedSettlements) {
        // Calculate skill bonuses on-the-fly from structures
        if (settlement.structureIds && settlement.structureIds.length > 0) {
          const bonusMap: Record<string, { bonus: number; structureName: string }> = {};
          
          for (const structureId of settlement.structureIds) {
            // Skip damaged structures
            if (structuresService.isStructureDamaged(settlement, structureId)) {
              continue;
            }
            
            const structure = structuresService.getStructure(structureId);
            if (structure?.type === 'skill' && structure.effects.skillsSupported) {
              const bonus = structure.effects.skillBonus || 0;
              for (const skill of structure.effects.skillsSupported) {
                const currentBonus = bonusMap[skill]?.bonus || 0;
                if (bonus > currentBonus) {
                  bonusMap[skill] = {
                    bonus,
                    structureName: structure.name
                  };
                }
              }
            }
          }
          
          // Add modifier for this settlement if it has a bonus for this skill
          if (bonusMap[skillName]) {
            kingdomModifiers.push({
              name: `${settlement.name} ${bonusMap[skillName].structureName}`,
              value: bonusMap[skillName].bonus,
              type: 'circumstance',
              ignored: true  // Set to false when rolling from specific settlement
            });
          }
        }
      }
    }
    
    // Add unrest penalty if applicable using centralized service
    const unrest = currentKingdomState?.unrest || 0;
    const penalty = getSkillPenalty(unrest);
    
    if (penalty < 0) {
      kingdomModifiers.push({
        name: 'Unrest Penalty',
        value: penalty,
        type: 'circumstance',
        enabled: true
      });
    }
    
    // Add aid bonuses based on check type
    if (actionId && currentKingdomState?.turnState) {
      let aids: any[] = [];
      
      // Check for event aids
      if (checkType === 'event' && currentKingdomState.turnState.eventsPhase?.activeAids) {
        aids = currentKingdomState.turnState.eventsPhase.activeAids.filter(
          aid => aid.targetActionId === actionId
        );
      }
      // Check for action aids
      else if (currentKingdomState.turnState.actionsPhase?.activeAids) {
        aids = currentKingdomState.turnState.actionsPhase.activeAids.filter(
          aid => aid.targetActionId === actionId
        );
      }
      
      for (const aid of aids) {
        if (aid.bonus > 0) {
          kingdomModifiers.push({
            name: `Aid from ${aid.characterName} (${aid.skillUsed})`,
            value: aid.bonus,
            type: 'circumstance',
            enabled: true
          });
        }
      }
    }
    
    return kingdomModifiers;
  }

  /**
   * Check if an action/event has a critical success aid that grants keep higher
   * @param actionId - The action/event ID to check
   * @param checkType - The type of check to determine which phase aids to check
   * @returns true if the check should use rollTwice: "keep-higher"
   */
  private shouldUseKeepHigher(actionId?: string, checkType?: 'action' | 'event' | 'incident'): boolean {
    if (!actionId) return false;
    
    const currentKingdomState = get(kingdomData);
    if (!currentKingdomState?.turnState) return false;
    
    let aids: any[] = [];
    
    // Check for event aids
    if (checkType === 'event' && currentKingdomState.turnState.eventsPhase?.activeAids) {
      aids = currentKingdomState.turnState.eventsPhase.activeAids.filter(
        aid => aid.targetActionId === actionId
      );
    }
    // Check for action aids
    else if (currentKingdomState.turnState.actionsPhase?.activeAids) {
      aids = currentKingdomState.turnState.actionsPhase.activeAids.filter(
        aid => aid.targetActionId === actionId
      );
    }
    
    // Return true if any aid grants keep higher
    return aids.some(aid => aid.grantKeepHigher);
  }

  /**
   * Generic kingdom skill check function with modifier support
   * Used for all kingdom-related skill checks (actions, events, incidents)
   */
  async performKingdomSkillCheck(
    skillName: string,
    checkType: 'action' | 'event' | 'incident',
    checkName: string,
    checkId: string,
    checkEffects?: any,
    actionId?: string,  // Optional action ID for aid bonuses
    callback?: (roll: any, outcome: string | null | undefined, message: any, event: Event | null) => Promise<void> | void,  // Callback for PF2e native callback pattern
    isReroll?: boolean,  // Only apply stored modifiers on rerolls
    instanceId?: string  // NEW: Instance ID for loading modifiers on reroll
  ): Promise<any> {
    try {

      // Get or select character
      let actor = this.characterService.getCurrentUserCharacter();
      
      if (!actor) {
        // Show character selection dialog
        actor = await this.characterService.showCharacterSelectionDialog();
        if (!actor) {
          return null; // User cancelled selection
        }
      }
      
      // Map skill name to system slug
      const skillSlug = this.skillNameToSlug[skillName.toLowerCase()] || skillName.toLowerCase();
      let skill = actor?.skills?.[skillSlug];
      
      // Special handling for lore skills - let user select which lore to use
      if (skillSlug === 'lore' && !skill) {
        const loreItems = actor?.itemTypes?.lore || [];
        
        // ALWAYS show the dialog - it will display "No Lore Skills" message if empty
        const selectedLoreItem = await this.showLoreSelectionDialog(loreItems);
        if (!selectedLoreItem) {
          return null; // User cancelled or no lore skills available
        }
        // Get the skill data for the selected lore item
        skill = actor.skills?.[selectedLoreItem.slug];
      }
      
      // After lore selection, verify we have a skill
      if (!skill) {
        // For lore, we've already handled the case above - this shouldn't happen
        // For other skills, this might be an issue with skill mapping
        logger.error(`❌ [PF2eSkillService] Character ${actor.name} doesn't have skill '${skillName}' (slug: ${skillSlug}).`);
        ui.notifications?.error(`${actor.name} doesn't have the ${skillName} skill.`);
        return null; // Cancel the roll
      }
      
      // Calculate DC based on character's level
      const characterLevel = this.characterService.getCharacterLevel(actor);
      const dc = this.getKingdomActionDC(characterLevel);
      
      console.log('🎮 [PF2eSkillService] checkEffects received:', checkEffects);
      
      // Get kingdom modifiers (including aids for this action/event)
      // Pass onlySettlementId if specified in checkEffects
      const kingdomModifiers = await this.getKingdomModifiers(
        skillName, 
        actionId || checkId, 
        checkType,
        checkEffects?.onlySettlementId
      );
      
      console.log('🔍 [PF2eSkillService] Kingdom modifiers:', kingdomModifiers.map(m => ({ 
        name: m.name, 
        value: m.value, 
        enabled: m.enabled, 
        ignored: m.ignored 
      })));
      
      // If checkEffects contains settlement/structure info, enable that specific modifier
      if (checkEffects?.enabledSettlement && checkEffects?.enabledStructure) {
        const targetModifierName = `${checkEffects.enabledSettlement} ${checkEffects.enabledStructure}`;
        console.log('🎯 [PF2eSkillService] Trying to enable modifier:', targetModifierName);
        
        let found = false;
        for (const mod of kingdomModifiers) {
          if (mod.name === targetModifierName) {
            mod.ignored = false;  // Un-ignore this specific modifier
            found = true;
            console.log('✅ [PF2eSkillService] Enabled modifier:', mod.name);
            break;
          }
        }
        
        if (!found) {
          console.warn('⚠️ [PF2eSkillService] Could not find modifier to enable:', targetModifierName);
          console.log('Available modifiers:', kingdomModifiers.map(m => m.name));
        }
      }
      
      // Apply stored modifiers ONLY on rerolls
      if (isReroll && instanceId) {
        const currentKingdomState = get(kingdomData);
        
        // ✅ DIRECT LOOKUP: Load modifiers by instanceId (unique per execution)
        const actionInstance = currentKingdomState.turnState?.actionsPhase?.actionInstances?.[instanceId];
        
        if (actionInstance?.rollModifiers && actionInstance.rollModifiers.length > 0) {
          console.log(`🔄 [PF2eSkillService] Restoring modifiers from instance ${instanceId}:`, actionInstance.rollModifiers.length);
          lastRollModifiers = actionInstance.rollModifiers;
          
          // ✅ NO CLEARING: Modifiers persist until turn cleanup (turn manager clears entire turnState)
          // This allows multiple rerolls of the same action if needed
        } else {
          console.log('ℹ️ [PF2eSkillService] No stored modifiers found for reroll');
          lastRollModifiers = null;
        }
      }
      
      // Apply modifiers if found (only happens on rerolls now)
      if (lastRollModifiers && lastRollModifiers.length > 0) {
        console.log('🔄 [PF2eSkillService] Applying stored modifiers from previous roll:', lastRollModifiers.length);
        
        // Track which labels we've matched
        const matchedLabels = new Set<string>();
        
        // First pass: enable existing modifiers that match by label
        for (const mod of kingdomModifiers) {
          const previousMod = lastRollModifiers.find(m => m.label === mod.name);
          if (previousMod) {
            mod.enabled = true;
            matchedLabels.add(previousMod.label);  // Track by previousMod.label (what we matched against)
            console.log(`  ✅ Matched kingdom modifier "${mod.name}" with stored modifier "${previousMod.label}"`);
          }
        }
        
        // Second pass: add ALL modifiers from previous roll that we haven't matched
        // This includes:
        // - Custom modifiers added by the user
        // - PF2e system modifiers (ability, proficiency, etc.)
        // - Any other modifiers from the previous roll
        for (const prevMod of lastRollModifiers) {
          if (!matchedLabels.has(prevMod.label)) {
            // Add this modifier to kingdomModifiers so it gets converted and passed to PF2e
            // ✅ CRITICAL: Preserve original modifier type (not all modifiers are circumstance)
            kingdomModifiers.push({
              name: prevMod.label,
              value: prevMod.modifier,
              type: (prevMod as any).type || 'circumstance',  // Use stored type, fallback to circumstance
              enabled: true
            });
            console.log(`  ✨ Adding unmatched modifier from previous roll: "${prevMod.label}" = ${prevMod.modifier} (type: ${(prevMod as any).type || 'circumstance'})`);
          }
        }
        
        console.log(`🔄 [PF2eSkillService] Restored ${lastRollModifiers.length} modifiers (${matchedLabels.size} matched, ${lastRollModifiers.length - matchedLabels.size} added)`);
        
        // Clear stored modifiers after applying (prevent reuse on next action)
        lastRollModifiers = null;
      }
      
      // Convert to PF2e format
      const pf2eModifiers = this.convertToPF2eModifiers(kingdomModifiers);
      
      // Log each modifier individually to avoid console collapsing
      console.log('🔧 [PF2eSkillService] After conversion - Modifier count:', pf2eModifiers.length);
      pf2eModifiers.forEach((mod, index) => {
        console.log(`  [${index}] "${mod.label}" → enabled: ${mod.enabled}, ignored: ${mod.ignored}, modifier: ${mod.modifier}, type: ${mod.type}`);
      });
      
      // Get skill proficiency rank for aid bonuses
      const proficiencyRank = skill?.rank || 0; // 0=untrained, 1=trained, 2=expert, 3=master, 4=legendary
      
      // Determine label based on check type
      const labelPrefix = checkType === 'action' ? 'Kingdom Action' : 
                         checkType === 'event' ? 'Kingdom Event' : 
                         'Kingdom Incident';
      
      // Check if we should use rollTwice (keep higher) for this action/event
      const useKeepHigher = this.shouldUseKeepHigher(actionId || checkId, checkType);
      
      // ✅ WRAP CALLBACK: Store modifiers BEFORE calling pipeline callback
      // This centralizes ALL reroll logic in PF2eSkillService
      const wrappedCallback = async (roll: any, outcome: string | null | undefined, message: any, event: Event | null) => {
        // ✅ REROLL SUPPORT: Store modifiers ONLY on initial roll (not on rerolls)
        // KEY: Use instanceId (unique per execution) for complete isolation
        if (!isReroll && instanceId) {
          // Extract modifiers from PF2e message
          const allModifiers = (message as any)?.flags?.pf2e?.modifiers || [];
          const modifiers = allModifiers.filter((mod: any) => mod.type !== 'ability' && mod.type !== 'proficiency');
          
          if (modifiers.length > 0) {
            const { getKingdomActor } = await import('../../stores/KingdomStore');
            const actor = getKingdomActor();
            
            if (actor) {
              await actor.updateKingdomData((kingdom: any) => {
                // Initialize actionInstances if needed
                if (!kingdom.turnState) kingdom.turnState = {};
                if (!kingdom.turnState.actionsPhase) kingdom.turnState.actionsPhase = { activeAids: [] };
                if (!kingdom.turnState.actionsPhase.actionInstances) {
                  kingdom.turnState.actionsPhase.actionInstances = {};
                }
                
                // ✅ KEY: Store by instanceId (unique per execution) for complete isolation
                kingdom.turnState.actionsPhase.actionInstances[instanceId] = {
                  instanceId: instanceId,
                  actionId: actionId || checkId,
                  rollModifiers: modifiers.map((mod: any) => ({
                    label: mod.label || '',
                    modifier: mod.modifier || 0,
                    type: mod.type || 'circumstance',
                    enabled: mod.enabled ?? true,
                    ignored: mod.ignored ?? false
                  })),
                  timestamp: Date.now()
                };
              });
              
              console.log(`💾 [PF2eSkillService] Stored modifiers for instance ${instanceId} (isolated per execution)`);
            }
          }
        } else if (isReroll) {
          console.log('🔄 [PF2eSkillService] This is a reroll - not storing modifiers (already stored from initial roll)');
        }
        
        // Call the pipeline callback (if provided)
        if (callback) {
          await callback(roll, outcome, message, event);
        }
      };
      
      // Trigger the PF2e system roll with DC and modifiers
      const rollResult = await skill.roll({
        dc: { value: dc },
        label: `${labelPrefix}: ${checkName}`,
        modifiers: pf2eModifiers,
        rollTwice: useKeepHigher ? 'keep-higher' : false,
        skipDialog: false,
        callback: wrappedCallback,  // ✅ Use wrapped callback for modifier storage
        extraRollOptions: [
          `${checkType}:kingdom`,
          `${checkType}:kingdom:${checkName.toLowerCase().replace(/\s+/g, '-')}`
        ]
      });

      return rollResult;
      
    } catch (error) {
      logger.error(`❌ [PF2eSkillService] Failed to perform kingdom ${checkType} roll:`, error);
      ui.notifications?.error("Failed to perform skill check");
      return null;
    }
  }

  /**
   * Legacy wrapper for backward compatibility with action rolls
   */
  async performKingdomActionRoll(
    actor: any,
    skillName: string,
    dc: number,
    actionName: string,
    actionId: string,
    actionEffects: any,
    targetActionId?: string  // NEW: Optional parameter for aid rolls to specify the action being aided
  ): Promise<any> {
    // If an actor was provided, temporarily set it as the user's character
    const originalCharacter = this.characterService.getCurrentUserCharacter();
    if (actor && actor !== originalCharacter) {
      await this.characterService.assignCharacterToUser(actor);
    }
    
    // Perform the skill check
    // Use targetActionId if provided (for aid rolls), otherwise use actionId
    const result = await this.performKingdomSkillCheck(
      skillName,
      'action',
      actionName,
      actionId,
      actionEffects,
      targetActionId || actionId  // Pass the target action ID for aid bonuses
    );
    
    // Restore original character if we changed it
    if (actor && originalCharacter && actor !== originalCharacter) {
      await this.characterService.assignCharacterToUser(originalCharacter);
    }
    
    return result;
  }

  /**
   * Get available skills for a character
   */
  getCharacterSkills(character: any): Record<string, any> {
    if (!character?.skills) {
      return {};
    }

    return character.skills;
  }

  /**
   * Check if a character is proficient in a skill
   */
  isCharacterProficientInSkill(character: any, skill: string): boolean {
    const skills = this.getCharacterSkills(character);
    const skillSlug = this.skillNameToSlug[skill.toLowerCase()] || skill.toLowerCase();
    const skillData = skills[skillSlug];
    
    if (!skillData) {
      return false;
    }

    // In PF2e, proficiency rank 0 = untrained, 1+ = trained or better
    return (skillData.rank || 0) > 0;
  }

  /**
   * Get skill modifier for a character
   */
  getCharacterSkillModifier(character: any, skill: string): number {
    const skills = this.getCharacterSkills(character);
    const skillSlug = this.skillNameToSlug[skill.toLowerCase()] || skill.toLowerCase();
    const skillData = skills[skillSlug];
    
    if (!skillData) {
      return 0;
    }

    return skillData.totalModifier || skillData.mod || 0;
  }

  /**
   * Show a dialog to select which lore skill to use
   * Uses the standard LoreSelectionDialog Svelte component
   */
  private async showLoreSelectionDialog(loreItems: any[]): Promise<any | null> {
    return new Promise(async (resolve) => {
      // Dynamically import the dialog component
      const { default: LoreSelectionDialog } = await import('../../view/kingdom/components/LoreSelectionDialog.svelte');
      
      // Create a container for the dialog
      const container = document.createElement('div');
      document.body.appendChild(container);
      
      // Instantiate the Svelte component
      const dialog = new LoreSelectionDialog({
        target: container,
        props: {
          show: true,
          loreItems
        }
      });
      
      // Listen for events
      dialog.$on('select', (event: CustomEvent) => {
        const loreItem = event.detail.loreItem;
        dialog.$destroy();
        container.remove();
        resolve(loreItem);
      });
      
      dialog.$on('cancel', () => {
        dialog.$destroy();
        container.remove();
        resolve(null);
      });
    });
  }
}

// Legacy function exports for backward compatibility
export const pf2eSkillService = PF2eSkillService.getInstance();
export const performKingdomSkillCheck = (
  skillName: string,
  checkType: 'action' | 'event' | 'incident',
  checkName: string,
  checkId: string,
  checkEffects?: any,
  actionId?: string
) => pf2eSkillService.performKingdomSkillCheck(skillName, checkType, checkName, checkId, checkEffects, actionId);

export const performKingdomActionRoll = (
  actor: any,
  skillName: string,
  dc: number,
  actionName: string,
  actionId: string,
  actionEffects: any,
  targetActionId?: string
) => pf2eSkillService.performKingdomActionRoll(actor, skillName, dc, actionName, actionId, actionEffects, targetActionId);

export const getKingdomActionDC = (characterLevel?: number) => 
  pf2eSkillService.getKingdomActionDC(characterLevel);
