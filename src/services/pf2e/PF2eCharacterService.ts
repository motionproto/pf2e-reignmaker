// Note: getKingdomActor not needed for character service, removing unused import

export interface CharacterSelectionResult {
  success: boolean;
  selectedCharacter?: any;
  error?: string;
}

export class PF2eCharacterService {
  private static instance: PF2eCharacterService;

  static getInstance(): PF2eCharacterService {
    if (!PF2eCharacterService.instance) {
      PF2eCharacterService.instance = new PF2eCharacterService();
    }
    return PF2eCharacterService.instance;
  }

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
  getCurrentUserCharacter(): any | null {
    try {
      return game.user?.character || null;
    } catch (error) {
      console.error('[PF2eCharacterService] Error getting current user character:', error);
      return null;
    }
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
   * Show character selection dialog for kingdom actions
   */
  async showCharacterSelectionDialog(
    title: string = 'Select Character',
    message: string = 'Select a character to perform this action:'
  ): Promise<any> {
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
        <p>${message}</p>
        <select id="character-select" style="width: 100%; padding: 4px;">
          ${options}
        </select>
      </div>
    `;
    
    return new Promise((resolve) => {
      new Dialog({
        title: title,
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
   * Validate that a character is suitable for kingdom actions
   */
  validateCharacterForKingdomAction(character: any): { valid: boolean; reason?: string } {
    if (!character) {
      return { valid: false, reason: 'No character provided' };
    }

    if (character.type !== 'character') {
      return { valid: false, reason: 'Actor is not a character' };
    }

    if (!character.testUserPermission(game.user, 'OWNER')) {
      return { valid: false, reason: 'No permission to control this character' };
    }

    // Check if character has required PF2e data
    if (!character.level && !character.system?.details?.level?.value) {
      return { valid: false, reason: 'Character level not found' };
    }

    return { valid: true };
  }

  /**
   * Get character level from either legacy or current PF2e structure
   */
  getCharacterLevel(character: any): number {
    if (!character) return 1;
    
    // Try new structure first
    if (character.system?.details?.level?.value) {
      return character.system.details.level.value;
    }
    
    // Try legacy structure
    if (character.level) {
      return character.level;
    }
    
    return 1; // Default fallback
  }
}

// Legacy function exports for backward compatibility
export const pf2eCharacterService = PF2eCharacterService.getInstance();
export const getPlayerCharacters = () => pf2eCharacterService.getPlayerCharacters();
export const getCurrentUserCharacter = () => pf2eCharacterService.getCurrentUserCharacter();
export const getUserControlledCharacters = () => pf2eCharacterService.getUserControlledCharacters();
export const showCharacterSelectionDialog = (title?: string, message?: string) => 
  pf2eCharacterService.showCharacterSelectionDialog(title, message);
export const assignCharacterToUser = (character: any) => 
  pf2eCharacterService.assignCharacterToUser(character);
