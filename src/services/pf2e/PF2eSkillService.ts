/**
 * PF2eSkillService - Pure PF2e system integration
 * 
 * This service handles ONLY PF2e system integration:
 * - Executing skill rolls via skill.roll()
 * - DC calculation
 * - Skill slug mapping
 * - Lore skill selection UI
 * 
 * Kingdom-specific modifier logic lives in KingdomModifierService.
 */

import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { PF2eCharacterService } from './PF2eCharacterService';
import { logger } from '../../utils/Logger';
import { rollStateService } from '../roll/RollStateService';
import { kingdomModifierService } from '../domain/KingdomModifierService';
import { fromPF2eModifier, toPF2eModifier, type RollModifier } from '../../types/RollModifier';

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

/**
 * Options for executeSkillRoll - pure PF2e integration
 */
export interface ExecuteSkillRollOptions {
  /** The PF2e actor to roll for */
  actor: any;
  /** The skill object from actor.skills */
  skill: any;
  /** The DC for the check */
  dc: number;
  /** Label for the roll (e.g., "Kingdom Action: Claim Hex") */
  label: string;
  /** Modifiers to apply to the roll (in RollModifier format) */
  modifiers: RollModifier[];
  /** Whether to roll twice and keep higher */
  rollTwice?: 'keep-higher' | false;
  /** Callback when roll completes */
  callback?: (roll: any, outcome: string | null | undefined, message: any, event: Event | null) => Promise<void> | void;
  /** Extra roll options for PF2e system */
  extraRollOptions?: string[];
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
   * Map skill name to PF2e system slug
   */
  getSkillSlug(skillName: string): string {
    return this.skillNameToSlug[skillName.toLowerCase()] || skillName.toLowerCase();
  }

  /**
   * Get skill from actor by name
   */
  getSkill(actor: any, skillName: string): any {
    const skillSlug = this.getSkillSlug(skillName);
    return actor?.skills?.[skillSlug];
  }

  /**
   * Convert RollModifier array to PF2e format
   * Uses proper PF2e Modifier constructor when available
   */
  convertToPF2eModifiers(modifiers: RollModifier[]): any[] {
    const pf2eModifiers = [];
    
    for (const mod of modifiers) {
      try {
        // Use the PF2e Modifier constructor if available
        if (game?.pf2e?.Modifier) {
          const pf2eMod = new game.pf2e.Modifier({
            label: mod.label,
            modifier: mod.value,
            type: mod.type,
            slug: mod.label.toLowerCase().replace(/\s+/g, '-'),
            ignored: mod.ignored,
            enabled: mod.enabled
          });
          // Force the ignored state after construction (prevents auto-enable by stacking rules)
          if (mod.ignored) {
            pf2eMod.ignored = true;
            pf2eMod.enabled = false;
          } else if (mod.enabled) {
            pf2eMod.enabled = true;
          }
          pf2eModifiers.push(pf2eMod);
        } else {
          // Fallback to toPF2eModifier helper
          pf2eModifiers.push(toPF2eModifier(mod));
        }
      } catch (error) {
        logger.warn('Failed to create PF2e modifier:', error, mod);
        // Fallback to basic object with test function
        pf2eModifiers.push(toPF2eModifier(mod));
      }
    }
    
    return pf2eModifiers;
  }

  /**
   * Execute a PF2e skill roll with provided options
   * Pure PF2e integration - no kingdom logic
   */
  async executeSkillRoll(options: ExecuteSkillRollOptions): Promise<any> {
    const { actor, skill, dc, label, modifiers, rollTwice, callback, extraRollOptions } = options;
    
    // Convert modifiers to PF2e format
    const pf2eModifiers = this.convertToPF2eModifiers(modifiers);
    
    // Log modifiers for debugging
    console.log('🔧 [PF2eSkillService.executeSkillRoll] Modifier count:', pf2eModifiers.length);
    pf2eModifiers.forEach((mod, index) => {
      console.log(`  [${index}] "${mod.label}" → enabled: ${mod.enabled}, ignored: ${mod.ignored}, modifier: ${mod.modifier}, type: ${mod.type}`);
    });
    
    // Execute the PF2e skill roll
    const rollResult = await skill.roll({
      dc: { value: dc },
      label,
      modifiers: pf2eModifiers,
      rollTwice: rollTwice || false,
      skipDialog: false,
      callback,
      extraRollOptions: extraRollOptions || []
    });
    
    return rollResult;
  }

  /**
   * Generic kingdom skill check function with modifier support
   * Used for all kingdom-related skill checks (actions, events, incidents)
   * 
   * @deprecated Use PipelineCoordinator with KingdomModifierService and executeSkillRoll instead
   */
  async performKingdomSkillCheck(
    skillName: string,
    checkType: 'action' | 'event' | 'incident',
    checkName: string,
    checkId: string,
    checkEffects?: any,
    actionId?: string,  // Optional action ID for aid bonuses
    callback?: (roll: any, outcome: string | null | undefined, message: any, event: Event | null) => Promise<void> | void,
    isReroll?: boolean,  // Only apply stored modifiers on rerolls
    instanceId?: string  // Instance ID for loading modifiers on reroll
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
      const skillSlug = this.getSkillSlug(skillName);
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
        logger.error(`❌ [PF2eSkillService] Character ${actor.name} doesn't have skill '${skillName}' (slug: ${skillSlug}).`);
        ui.notifications?.error(`${actor.name} doesn't have the ${skillName} skill.`);
        return null; // Cancel the roll
      }
      
      // Calculate DC based on character's level
      const characterLevel = this.characterService.getCharacterLevel(actor);
      const dc = this.getKingdomActionDC(characterLevel);
      
      console.log('🎮 [PF2eSkillService] checkEffects received:', checkEffects);
      
      // Get kingdom modifiers from KingdomModifierService
      const kingdomModifiers = kingdomModifierService.getModifiersForCheck({
        skillName,
        actionId: actionId || checkId,
        checkType,
        onlySettlementId: checkEffects?.onlySettlementId,
        enabledSettlement: checkEffects?.enabledSettlement,
        enabledStructure: checkEffects?.enabledStructure
      });
      
      console.log('🔍 [PF2eSkillService] Kingdom modifiers:', kingdomModifiers.map(m => ({ 
        label: m.label, 
        value: m.value, 
        enabled: m.enabled, 
        ignored: m.ignored 
      })));
      
      // Apply stored modifiers ONLY on rerolls - use RollStateService
      if (isReroll && instanceId) {
        const currentKingdomState = get(kingdomData);
        const currentTurn = currentKingdomState?.currentTurn || 0;
        
        console.log(`🔍 [PF2eSkillService] Reroll detected - using RollStateService to load modifiers for instance ${instanceId}`);
        
        // Use RollStateService for modifier retrieval (turn-aware)
        const storedModifiers = await rollStateService.getRollModifiers(instanceId, currentTurn);
        
        if (storedModifiers && storedModifiers.length > 0) {
          console.log(`✅ [PF2eSkillService] Found ${storedModifiers.length} stored modifiers via RollStateService`);
          
          // Track which labels we've matched
          const matchedLabels = new Set<string>();
          
          // First pass: enable existing modifiers that match by label
          for (const mod of kingdomModifiers) {
            const previousMod = storedModifiers.find(m => m.label === mod.label);
            if (previousMod) {
              mod.enabled = true;
              mod.ignored = false;
              matchedLabels.add(previousMod.label);
              console.log(`  ✅ Matched kingdom modifier "${mod.label}" with stored modifier "${previousMod.label}"`);
            }
          }
          
          // Second pass: add ALL modifiers from previous roll that we haven't matched
          for (const prevMod of storedModifiers) {
            if (!matchedLabels.has(prevMod.label)) {
              kingdomModifiers.push({
                label: prevMod.label,
                value: prevMod.value,
                type: prevMod.type || 'circumstance',
                enabled: true,
                ignored: false
              });
              console.log(`  ✨ Adding unmatched modifier from previous roll: "${prevMod.label}" = ${prevMod.value} (type: ${prevMod.type || 'circumstance'})`);
            }
          }
          
          console.log(`🔄 [PF2eSkillService] Restored ${storedModifiers.length} modifiers (${matchedLabels.size} matched, ${storedModifiers.length - matchedLabels.size} added)`);
        } else {
          console.error(`❌ [PF2eSkillService] No stored modifiers found for reroll via RollStateService! Instance ${instanceId}`);
        }
      }
      
      // Determine label based on check type
      const labelPrefix = checkType === 'action' ? 'Kingdom Action' : 
                         checkType === 'event' ? 'Kingdom Event' : 
                         'Kingdom Incident';
      
      // Check if we should use rollTwice (keep higher) for this action/event
      const useKeepHigher = kingdomModifierService.hasKeepHigherAid(actionId || checkId, checkType);
      
      // Create wrapped callback for modifier storage
      const currentKingdomState = get(kingdomData);
      const currentTurn = currentKingdomState?.currentTurn || 0;
      
      const wrappedCallback = async (roll: any, outcome: string | null | undefined, message: any, event: Event | null) => {
        // Store modifiers ONLY on initial roll (not on rerolls)
        if (!isReroll && instanceId) {
          // Extract modifiers from PF2e message
          const allModifiers = (message as any)?.flags?.pf2e?.modifiers || [];
          console.log(`🔍 [PF2eSkillService.wrappedCallback] Extracted ${allModifiers.length} total modifiers from PF2e message for instance ${instanceId}`);
          
          // Filter out ability and proficiency (recalculated by PF2e on reroll)
          const filteredModifiers = allModifiers.filter((mod: any) => mod.type !== 'ability' && mod.type !== 'proficiency');
          console.log(`🔍 [PF2eSkillService.wrappedCallback] After filtering: ${filteredModifiers.length} non-ability/non-proficiency modifiers`);
          
          if (filteredModifiers.length > 0) {
            // Convert to RollModifier format and store via RollStateService
            const rollModifiers: RollModifier[] = filteredModifiers.map((mod: any) => fromPF2eModifier(mod));
            
            // Delegate to RollStateService for storage
            await rollStateService.storeRollModifiers(
              instanceId,
              currentTurn,
              actionId || checkId,
              rollModifiers
            );
          }
        }
        
        // Call the pipeline callback (if provided)
        if (callback) {
          await callback(roll, outcome, message, event);
        }
      };
      
      // Execute the roll using the new method
      return await this.executeSkillRoll({
        actor,
        skill,
        dc,
        label: `${labelPrefix}: ${checkName}`,
        modifiers: kingdomModifiers,
        rollTwice: useKeepHigher ? 'keep-higher' : false,
        callback: wrappedCallback,
        extraRollOptions: [
          `${checkType}:kingdom`,
          `${checkType}:kingdom:${checkName.toLowerCase().replace(/\s+/g, '-')}`
        ]
      });
      
    } catch (error) {
      logger.error(`❌ [PF2eSkillService] Failed to perform kingdom ${checkType} roll:`, error);
      ui.notifications?.error("Failed to perform skill check");
      return null;
    }
  }

  /**
   * Legacy wrapper for backward compatibility with action rolls
   * @deprecated Use PipelineCoordinator instead
   */
  async performKingdomActionRoll(
    actor: any,
    skillName: string,
    dc: number,
    actionName: string,
    actionId: string,
    actionEffects: any,
    targetActionId?: string
  ): Promise<any> {
    // If an actor was provided, temporarily set it as the user's character
    const originalCharacter = this.characterService.getCurrentUserCharacter();
    if (actor && actor !== originalCharacter) {
      await this.characterService.assignCharacterToUser(actor);
    }
    
    // Perform the skill check
    const result = await this.performKingdomSkillCheck(
      skillName,
      'action',
      actionName,
      actionId,
      actionEffects,
      targetActionId || actionId
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
    const skillSlug = this.getSkillSlug(skill);
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
    const skillSlug = this.getSkillSlug(skill);
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
  async showLoreSelectionDialog(loreItems: any[]): Promise<any | null> {
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
