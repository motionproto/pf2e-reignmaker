// NOTE: Using new simplified ModifierService
import { createModifierService } from '../ModifierService';
import { get } from 'svelte/store';
import { kingdomData } from '../../stores/KingdomStore';
import { PF2eCharacterService } from './PF2eCharacterService';
import { getSkillPenalty } from '../domain/unrest/UnrestService';
import { logger } from '../../utils/Logger';

// Module-level state for reroll modifier preservation (client-only, no persistence)
let lastRollModifiers: Array<{ label: string; modifier: number }> | null = null;

/**
 * Store modifiers from a completed roll for potential reroll
 * Called by OutcomeDisplay when user clicks "Reroll with Fame"
 */
export function storeModifiersForReroll(modifiers: Array<{ label: string; modifier: number }>) {
  lastRollModifiers = modifiers;

}

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
    'applicable-lore': 'lore'
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
            enabled: mod.enabled !== false
          });
          pf2eModifiers.push(pf2eMod);
        } else {
          // Fallback to enhanced object format with test function
          const pf2eMod = {
            label: modifierLabel,
            modifier: modifierValue,
            type: modifierType,
            enabled: mod.enabled !== false,
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
          enabled: mod.enabled !== false,
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
   */
  private getKingdomModifiers(skillName: string, actionId?: string, checkType?: 'action' | 'event' | 'incident'): any[] {
    const currentKingdomState = get(kingdomData);
    const kingdomModifiers: any[] = [];
    
    // Add settlement infrastructure bonuses from cached skillBonuses
    // Only include settlements with valid map locations
    // Default to disabled so players can manually enable the relevant settlement
    if (currentKingdomState?.settlements) {
      // Filter to only mapped settlements (exclude unmapped at 0,0)
      const mappedSettlements = currentKingdomState.settlements.filter(
        s => s.location.x !== 0 || s.location.y !== 0
      );
      
      for (const settlement of mappedSettlements) {
        const bonus = settlement.skillBonuses?.[skillName] ?? 0;
        if (bonus > 0) {
          kingdomModifiers.push({
            name: `${settlement.name} Infrastructure`,
            value: bonus,
            type: 'circumstance',
            enabled: false  // Player manually enables if action is in this settlement
          });
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
    actionId?: string  // Optional action ID for aid bonuses
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
        
        if (loreItems.length > 0) {
          // Show selection dialog for lore skills
          const selectedLoreItem = await this.showLoreSelectionDialog(loreItems);
          if (!selectedLoreItem) {
            return null; // User cancelled
          }
          // Get the skill data for the selected lore item
          skill = actor.skills?.[selectedLoreItem.slug];
        } else {
          logger.warn(`⚠️ [PF2eSkillService] Character ${actor.name} has no lore skills.`);
          ui.notifications?.warn(`${actor.name} has no lore skills to use.`);
        }
      }
      
      if (!skill) {
        // Skill not found - warn but continue (may be untrained or different mapping)
        logger.warn(`⚠️ [PF2eSkillService] Character ${actor.name} doesn't have skill '${skillName}' (slug: ${skillSlug}). Attempting roll anyway.`);
        ui.notifications?.info(`Rolling ${skillName} (untrained or not in character sheet)`);
      }
      
      // Calculate DC based on character's level
      const characterLevel = this.characterService.getCharacterLevel(actor);
      const dc = this.getKingdomActionDC(characterLevel);
      
      // Get kingdom modifiers (including aids for this action/event)
      const kingdomModifiers = this.getKingdomModifiers(skillName, actionId || checkId, checkType);
      
      // Apply stored modifiers from previous roll (for rerolls)
      if (lastRollModifiers && lastRollModifiers.length > 0) {

        // Track which labels we've matched
        const matchedLabels = new Set<string>();
        
        // First pass: enable existing modifiers that match
        for (const mod of kingdomModifiers) {
          const previousMod = lastRollModifiers.find(m => m.label === mod.name);
          if (previousMod) {
            mod.enabled = true;
            matchedLabels.add(mod.name);

          }
        }
        
        // Second pass: add custom modifiers from previous roll that aren't in our list
        // These are modifiers the user added manually in the PF2e dialog
        for (const prevMod of lastRollModifiers) {
          if (!matchedLabels.has(prevMod.label)) {
            // This is a custom modifier - add it with the value from the previous roll
            kingdomModifiers.push({
              name: prevMod.label,
              value: prevMod.modifier,
              type: 'circumstance',  // Default to circumstance for custom modifiers
              enabled: true
            });

          }
        }
        
        // Clear stored modifiers after use
        lastRollModifiers = null;

      }
      
      // Convert to PF2e format
      const pf2eModifiers = this.convertToPF2eModifiers(kingdomModifiers);
      
      // Get skill proficiency rank for aid bonuses
      const proficiencyRank = skill?.rank || 0; // 0=untrained, 1=trained, 2=expert, 3=master, 4=legendary
      
      // Store check info in a flag for retrieval after roll
      await game.user?.setFlag('pf2e-reignmaker', 'pendingCheck', {
        checkId,
        checkType,
        checkName,
        checkEffects,
        skillName,
        actorId: actor.id,
        actorName: actor.name,
        dc,
        proficiencyRank
      });
      
      // Determine label based on check type
      const labelPrefix = checkType === 'action' ? 'Kingdom Action' : 
                         checkType === 'event' ? 'Kingdom Event' : 
                         'Kingdom Incident';
      
      // Check if we should use rollTwice (keep higher) for this action/event
      const useKeepHigher = this.shouldUseKeepHigher(actionId || checkId, checkType);
      
      // Trigger the PF2e system roll with DC and modifiers
      let rollResult;
      if (skill) {
        // Use the skill's roll method if available
        rollResult = await skill.roll({
          dc: { value: dc },
          label: `${labelPrefix}: ${checkName}`,
          modifiers: pf2eModifiers,
          rollTwice: useKeepHigher ? 'keep-higher' : false,
          skipDialog: false,
          extraRollOptions: [
            `${checkType}:kingdom`,
            `${checkType}:kingdom:${checkName.toLowerCase().replace(/\s+/g, '-')}`
          ]
        });
      } else {
        // Fallback: Try to find any skill and use it, or create a generic check
        const firstAvailableSkill = Object.values(actor.skills || {})[0] as any;
        if (firstAvailableSkill && firstAvailableSkill.roll) {

          rollResult = await firstAvailableSkill.roll({
            dc: { value: dc },
            label: `${labelPrefix}: ${checkName} (${skillName})`,
            modifiers: pf2eModifiers,
            rollTwice: useKeepHigher ? 'keep-higher' : false,
            skipDialog: false,
            extraRollOptions: [
              `${checkType}:kingdom`,
              `${checkType}:kingdom:${checkName.toLowerCase().replace(/\s+/g, '-')}`
            ]
          });
        } else {
          logger.error('❌ [PF2eSkillService] No skills available on character');
          ui.notifications?.error(`Cannot roll - character has no skills`);
          await game.user?.unsetFlag('pf2e-reignmaker', 'pendingCheck');
          return null;
        }
      }

      return rollResult;
      
    } catch (error) {
      logger.error(`❌ [PF2eSkillService] Failed to perform kingdom ${checkType} roll:`, error);
      ui.notifications?.error("Failed to perform skill check");
      await game.user?.unsetFlag('pf2e-reignmaker', 'pendingCheck');
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
