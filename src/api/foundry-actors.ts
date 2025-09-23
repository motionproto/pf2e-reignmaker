// Foundry Actor integration for PF2e Kingdom Lite
// Handles player character access and skill rolls

declare const game: any;
declare const ui: any;
declare const Hooks: any;

/**
 * Get all player characters available for kingdom actions
 */
export function getPlayerCharacters() {
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
export function getCurrentUserCharacter() {
  return game.user?.character;
}

/**
 * Get all characters the current user has permission to control
 */
export function getUserControlledCharacters(): any[] {
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
export async function showCharacterSelectionDialog(): Promise<any> {
  const Dialog = (window as any).Dialog;
  
  if (!Dialog || !game) return null;
  
  const characters = getUserControlledCharacters();
  
  if (characters.length === 0) {
    ui?.notifications?.warn("You don't have permission to control any character actors.");
    return null;
  }
  
  if (characters.length === 1) {
    // If only one character, auto-select it and assign to user
    const character = characters[0];
    await assignCharacterToUser(character);
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
              await assignCharacterToUser(character);
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
export async function assignCharacterToUser(character: any): Promise<void> {
  if (!game?.user || !character) return;
  
  // Update the user's character assignment
  await game.user.update({ character: character.id });
}

/**
 * Map action skill names to PF2e system skill slugs
 */
const skillNameToSlug: Record<string, string> = {
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
 * Generic kingdom skill check function
 * Used for all kingdom-related skill checks (actions, events, incidents)
 * @param skillName - The skill to roll (e.g., "Diplomacy", "Intimidation")
 * @param checkType - Type of check ("action", "event", "incident")
 * @param checkName - Name of the specific check (e.g., "Arrest Dissidents", "Plague")
 * @param checkId - Unique identifier for the check
 * @param checkEffects - Optional effects object with outcomes
 * @returns The roll result or null if failed
 */
export async function performKingdomSkillCheck(
  skillName: string,
  checkType: 'action' | 'event' | 'incident',
  checkName: string,
  checkId: string,
  checkEffects?: any
) {
  // Get or select character
  let actor = getCurrentUserCharacter();
  
  if (!actor) {
    // Show character selection dialog
    actor = await showCharacterSelectionDialog();
    if (!actor) {
      return null; // User cancelled selection
    }
  }
  
  // Map skill name to system slug
  const skillSlug = skillNameToSlug[skillName.toLowerCase()] || skillName.toLowerCase();
  const skill = actor?.skills?.[skillSlug];
  
  if (!skill) {
    ui.notifications?.warn(`Character ${actor.name} doesn't have the ${skillName} skill`);
    return null;
  }
  
  // Calculate DC based on character's level
  const characterLevel = actor.level || 1;
  const dc = getKingdomActionDC(characterLevel);
  
  // Store check info in a flag for retrieval after roll
  await game.user?.setFlag('pf2e-kingdom-lite', 'pendingCheck', {
    checkId,
    checkType,
    checkName,
    checkEffects,
    skillName,
    actorId: actor.id,
    actorName: actor.name,
    dc
  });
  
  // Determine label based on check type
  const labelPrefix = checkType === 'action' ? 'Kingdom Action' : 
                     checkType === 'event' ? 'Kingdom Event' : 
                     'Kingdom Incident';
  
  // Trigger the PF2e system roll with DC
  try {
    const rollResult = await skill.roll({
      dc: { value: dc },
      label: `${labelPrefix}: ${checkName}`,
      extraRollOptions: [
        `${checkType}:kingdom`,
        `${checkType}:kingdom:${checkName.toLowerCase().replace(/\s+/g, '-')}`
      ]
    });
    
    return rollResult;
  } catch (error) {
    console.error(`Failed to perform kingdom ${checkType} roll:`, error);
    ui.notifications?.error("Failed to perform skill check");
    await game.user?.unsetFlag('pf2e-kingdom-lite', 'pendingCheck');
    return null;
  }
}

/**
 * Trigger a kingdom action skill roll using the PF2e system
 * This is a wrapper around performKingdomSkillCheck for backward compatibility
 */
export async function performKingdomActionRoll(
  actor: any,
  skillName: string,
  dc: number,
  actionName: string,
  actionId: string,
  actionEffects: any
) {
  // If an actor was provided, temporarily set it as the user's character
  const originalCharacter = getCurrentUserCharacter();
  if (actor && actor !== originalCharacter) {
    await assignCharacterToUser(actor);
  }
  
  // Perform the skill check
  const result = await performKingdomSkillCheck(
    skillName,
    'action',
    actionName,
    actionId,
    actionEffects
  );
  
  // Restore original character if we changed it
  if (actor && originalCharacter && actor !== originalCharacter) {
    await assignCharacterToUser(originalCharacter);
  }
  
  return result;
}

/**
 * Calculate DC for kingdom actions based on character level
 * Using the standard level-based DCs from PF2e
 * https://2e.aonprd.com/Rules.aspx?ID=2629
 */
export function getKingdomActionDC(characterLevel: number = 1): number {
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
export function parseRollOutcome(roll: any, dc: number): string {
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
 * Initialize the roll result handler for all kingdom checks
 * This should be called once when the module is ready
 * @param onCheckResolved - Callback when any check is resolved
 */
export function initializeRollResultHandler(
  onCheckResolved: (checkId: string, outcome: string, actorName: string, checkType?: string) => void
) {
  // Hook into chat message creation to process kingdom check results
  Hooks.on('createChatMessage', async (message: any) => {
    // Check for both old and new flag names for backward compatibility
    let pendingCheck = game.user?.getFlag('pf2e-kingdom-lite', 'pendingCheck');
    let isLegacyAction = false;
    
    if (!pendingCheck) {
      // Check for legacy pendingAction flag
      pendingCheck = game.user?.getFlag('pf2e-kingdom-lite', 'pendingAction');
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
    
    if (!pendingCheck) return;
    
    // Check if the message is from the correct actor
    if (message.speaker?.actor !== pendingCheck.actorId) return;
    
    // Check if this is a skill check roll
    const roll = message.rolls?.[0];
    if (!roll || !message.flags?.pf2e?.context?.dc) return;
    
    const dc = message.flags.pf2e.context.dc.value;
    const outcome = parseRollOutcome(roll, dc);
    
    // Notify the callback with the result
    onCheckResolved(
      pendingCheck.checkId, 
      outcome, 
      pendingCheck.actorName, 
      pendingCheck.checkType || 'action'
    );
    
    // Clear the appropriate flag
    if (isLegacyAction) {
      await game.user?.unsetFlag('pf2e-kingdom-lite', 'pendingAction');
    } else {
      await game.user?.unsetFlag('pf2e-kingdom-lite', 'pendingCheck');
    }
  });
}
