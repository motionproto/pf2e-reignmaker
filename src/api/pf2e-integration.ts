// PF2e System Integration Service
// Handles all interactions with the Pathfinder 2e system including character management and skill rolls

import { modifierService } from '../services/domain/modifiers/ModifierService';
import { get } from 'svelte/store';
import { kingdomData } from '../stores/kingdomActor';

declare const game: any;
declare const ui: any;
declare const Hooks: any;
declare const CONFIG: any;

// Store whether we've already initialized the handler
let rollHandlerInitialized = false;

/**
 * PF2e Integration Service
 * Manages all interactions with the PF2e system including:
 * - Character management
 * - Skill checks with modifiers
 * - Roll result processing
 */
export class PF2eIntegrationService {
  /**
   * Get all player characters available for kingdom actions
   */
  getPlayerCharacters() {
    const players = game.users?.players || [];
    return players
      .map((user: any) => ({
        userId: user.id,
        userName: user.name,
        character: user.character,
        isActive: user.active
      }))
      .filter((p: any) => p.character); // Only include players with assigned characters
  }

  /**
   * Get the current user's assigned character
   */
  getCurrentUserCharacter() {
    return game.user?.character;
  }

  /**
   * Get all characters the current user has permission to control
   */
  getUserControlledCharacters(): any[] {
    if (!game?.actors) return [];
    
    // Get all actors that are player characters and the user has owner permission
    return game.actors.filter((actor: any) => 
      actor.type === 'character' && 
      actor.testUserPermission(game.user, 'OWNER')
    );
  }

  /**
   * Show character selection dialog
   */
  async showCharacterSelectionDialog(): Promise<any> {
    const Dialog = (window as any).Dialog;
    
    if (!Dialog || !game) return null;
    
    const characters = this.getUserControlledCharacters();
    
    if (characters.length === 0) {
      ui?.notifications?.warn("You don't have permission to control any character actors.");
      return null;
    }
    
    if (characters.length === 1) {
      // If only one character, auto-select it and assign to user
      const character = characters[0];
      await this.assignCharacterToUser(character);
      return character;
    }
    
    // Build options for the dialog
    const options = characters.map(char => 
      `<option value="${char.id}">${char.name}</option>`
    ).join('');
    
    const content = `
      <div style="margin: 10px 0;">
        <p>Select a character to perform this action:</p>
        <select id="character-select" style="width: 100%; padding: 4px;">
          ${options}
        </select>
      </div>
    `;
    
    return new Promise((resolve) => {
      new Dialog({
        title: "Select Character",
        content: content,
        buttons: {
          select: {
            label: "Select",
            callback: async (html: any) => {
              const selectedId = html.find('#character-select').val();
              const character = characters.find(c => c.id === selectedId);
              if (character) {
                await this.assignCharacterToUser(character);
              }
              resolve(character || null);
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "select"
      }).render(true);
    });
  }

  /**
   * Assign character to current user
   */
  async assignCharacterToUser(character: any): Promise<void> {
    if (!game?.user || !character) return;
    
    // Update the user's character assignment
    await game.user.update({ character: character.id });
  }

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
    'warfare lore': 'lore',
    'warfare': 'lore', // Alternative mapping
    'mercantile lore': 'lore'
  };

  /**
   * Convert kingdom modifiers to PF2e format
   */
  private convertToPF2eModifiers(modifiers: any[]): any[] {
    const pf2eModifiers = [];
    
    for (const mod of modifiers) {
      // Create a PF2e-compatible modifier object
      // The PF2e system expects modifiers with specific structure
      const pf2eMod = {
        label: mod.name || mod.label,
        modifier: mod.value || mod.modifier || 0,
        type: mod.type || 'circumstance', // Default to circumstance
        enabled: mod.enabled !== false
      };
      
      pf2eModifiers.push(pf2eMod);
    }
    
    return pf2eModifiers;
  }

  /**
   * Generic kingdom skill check function with modifier support
   * Used for all kingdom-related skill checks (actions, events, incidents)
   * @param skillName - The skill to roll (e.g., "Diplomacy", "Intimidation")
   * @param checkType - Type of check ("action", "event", "incident")
   * @param checkName - Name of the specific check (e.g., "Arrest Dissidents", "Plague")
   * @param checkId - Unique identifier for the check
   * @param checkEffects - Optional effects object with outcomes
   * @returns The roll result or null if failed
   */
  async performKingdomSkillCheck(
    skillName: string,
    checkType: 'action' | 'event' | 'incident',
    checkName: string,
    checkId: string,
    checkEffects?: any
  ) {
    // Get or select character
    let actor = this.getCurrentUserCharacter();
    
    if (!actor) {
      // Show character selection dialog
      actor = await this.showCharacterSelectionDialog();
      if (!actor) {
        return null; // User cancelled selection
      }
    }
    
    // Map skill name to system slug
    const skillSlug = this.skillNameToSlug[skillName.toLowerCase()] || skillName.toLowerCase();
    const skill = actor?.skills?.[skillSlug];
    
    if (!skill) {
      ui.notifications?.warn(`Character ${actor.name} doesn't have the ${skillName} skill`);
      return null;
    }
    
    // Calculate DC based on character's level
    const characterLevel = actor.level || 1;
    const dc = this.getKingdomActionDC(characterLevel);
    
    // Get modifiers from ModifierService
    const currentKingdomState = get(kingdomData);
    const currentTurn = currentKingdomState.currentTurn || 1;
    
    const kingdomModifiers = modifierService.getModifiersForCheck(
      checkType,
      skillName,
      currentKingdomState,
      currentTurn
    );
    
    // Convert to PF2e format
    const pf2eModifiers = this.convertToPF2eModifiers(kingdomModifiers);
    
    // Get skill proficiency rank for aid bonuses
    const proficiencyRank = skill.rank || 0; // 0=untrained, 1=trained, 2=expert, 3=master, 4=legendary
    
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
    
    // Trigger the PF2e system roll with DC and modifiers
    try {
      const rollResult = await skill.roll({
        dc: { value: dc },
        label: `${labelPrefix}: ${checkName}`,
        modifiers: pf2eModifiers, // Now included!
        extraRollOptions: [
          `${checkType}:kingdom`,
          `${checkType}:kingdom:${checkName.toLowerCase().replace(/\s+/g, '-')}`
        ]
      });
      
      return rollResult;
    } catch (error) {
      console.error(`Failed to perform kingdom ${checkType} roll:`, error);
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
    actionEffects: any
  ) {
    // If an actor was provided, temporarily set it as the user's character
    const originalCharacter = this.getCurrentUserCharacter();
    if (actor && actor !== originalCharacter) {
      await this.assignCharacterToUser(actor);
    }
    
    // Perform the skill check
    const result = await this.performKingdomSkillCheck(
      skillName,
      'action',
      actionName,
      actionId,
      actionEffects
    );
    
    // Restore original character if we changed it
    if (actor && originalCharacter && actor !== originalCharacter) {
      await this.assignCharacterToUser(originalCharacter);
    }
    
    return result;
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
   * Parse a roll result to determine the outcome
   * @param roll - The roll object from the chat message
   * @param dc - The DC of the check
   * @returns The outcome string (criticalSuccess, success, failure, criticalFailure)
   */
  parseRollOutcome(roll: any, dc: number): string {
    const total = roll.total;
    
    // Determine outcome based on PF2e degrees of success
    let outcome: string;
    if (roll.dice[0]?.results[0]?.result === 20 || total >= dc + 10) {
      outcome = 'criticalSuccess';
    } else if (roll.dice[0]?.results[0]?.result === 1 || total <= dc - 10) {
      outcome = 'criticalFailure';
    } else if (total >= dc) {
      outcome = 'success';
    } else {
      outcome = 'failure';
    }
    
    // Natural 20 upgrades outcome, natural 1 downgrades
    const d20Result = roll.dice[0]?.results[0]?.result;
    if (d20Result === 20 && outcome === 'success') {
      outcome = 'criticalSuccess';
    } else if (d20Result === 20 && outcome === 'failure') {
      outcome = 'success';
    } else if (d20Result === 1 && outcome === 'success') {
      outcome = 'failure';
    } else if (d20Result === 1 && outcome === 'failure') {
      outcome = 'criticalFailure';
    }
    
    return outcome;
  }

  /**
   * Initialize the global roll result handler for all kingdom checks
   * This sets up a single handler that dispatches events based on check type
   * Components can call this multiple times safely - it only initializes once
   */
  initializeRollResultHandler() {
    // Initialize hook only once
    if (rollHandlerInitialized) {
      return;
    }
    
    console.log('Initializing createChatMessage hook for kingdom rolls');
    rollHandlerInitialized = true;
    
    // Hook into chat message creation to process kingdom check results  
    Hooks.on('createChatMessage', async (message: any) => {
      console.log('createChatMessage hook fired, checking for pending kingdom check...');
      
      // Check for both old and new flag names for backward compatibility
      let pendingCheck = game.user?.getFlag('pf2e-reignmaker', 'pendingCheck');
      let isLegacyAction = false;
      
      console.log('pendingCheck flag:', pendingCheck);
      
      if (!pendingCheck) {
        // Check for legacy pendingAction flag
        pendingCheck = game.user?.getFlag('pf2e-reignmaker', 'pendingAction');
        console.log('pendingAction flag (legacy):', pendingCheck);
        
        if (pendingCheck) {
          // Convert legacy action to new format
          isLegacyAction = true;
          pendingCheck = {
            checkId: pendingCheck.actionId,
            checkType: 'action',
            checkName: pendingCheck.actionName,
            checkEffects: pendingCheck.actionEffects,
            skillName: pendingCheck.skillName,
            actorId: pendingCheck.actorId,
            actorName: pendingCheck.actorName,
            dc: pendingCheck.dc
          };
        }
      }
      
      if (!pendingCheck) {
        console.log('No pending check found, returning');
        return;
      }
      
      console.log('Message speaker actor:', message.speaker?.actor, 'Expected:', pendingCheck.actorId);
      
      // Check if the message is from the correct actor
      if (message.speaker?.actor !== pendingCheck.actorId) {
        console.log('Actor mismatch, returning');
        return;
      }
      
      // Check if this is a skill check roll
      const roll = message.rolls?.[0];
      console.log('Roll found:', !!roll, 'Has DC:', !!message.flags?.pf2e?.context?.dc);
      
      if (!roll || !message.flags?.pf2e?.context?.dc) {
        console.log('Not a valid skill check, returning');
        return;
      }
      
      const dc = message.flags.pf2e.context.dc.value;
      const outcome = this.parseRollOutcome(roll, dc);
      
      console.log(`Parsed outcome: ${outcome} for ${pendingCheck.checkId}, dispatching ${pendingCheck.checkType} event...`);
      
      // Dispatch a custom event with the roll result
      // Components can listen for this event and filter by checkType and checkId
      const event = new CustomEvent('kingdomRollComplete', {
        detail: {
          checkId: pendingCheck.checkId,
          outcome: outcome,
          actorName: pendingCheck.actorName,
          checkType: pendingCheck.checkType || 'action',
          skillName: pendingCheck.skillName,
          proficiencyRank: pendingCheck.proficiencyRank
        }
      });
      
      // Dispatch to window so any component can listen
      window.dispatchEvent(event);
      
      // Clear the appropriate flag
      if (isLegacyAction) {
        await game.user?.unsetFlag('pf2e-reignmaker', 'pendingAction');
        console.log('Cleared legacy pendingAction flag');
      } else {
        await game.user?.unsetFlag('pf2e-reignmaker', 'pendingCheck');
        console.log('Cleared pendingCheck flag');
      }
    });
  }
}

// Export singleton instance and legacy function names for backward compatibility
export const pf2eIntegrationService = new PF2eIntegrationService();

// Legacy function exports for backward compatibility
export const getPlayerCharacters = () => pf2eIntegrationService.getPlayerCharacters();
export const getCurrentUserCharacter = () => pf2eIntegrationService.getCurrentUserCharacter();
export const getUserControlledCharacters = () => pf2eIntegrationService.getUserControlledCharacters();
export const showCharacterSelectionDialog = () => pf2eIntegrationService.showCharacterSelectionDialog();
export const assignCharacterToUser = (character: any) => pf2eIntegrationService.assignCharacterToUser(character);
export const performKingdomSkillCheck = (skillName: string, checkType: 'action' | 'event' | 'incident', checkName: string, checkId: string, checkEffects?: any) => 
  pf2eIntegrationService.performKingdomSkillCheck(skillName, checkType, checkName, checkId, checkEffects);
export const performKingdomActionRoll = (actor: any, skillName: string, dc: number, actionName: string, actionId: string, actionEffects: any) =>
  pf2eIntegrationService.performKingdomActionRoll(actor, skillName, dc, actionName, actionId, actionEffects);
export const getKingdomActionDC = (characterLevel?: number) => pf2eIntegrationService.getKingdomActionDC(characterLevel);
export const initializeRollResultHandler = () => pf2eIntegrationService.initializeRollResultHandler();
