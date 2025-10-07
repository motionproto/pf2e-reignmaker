import { PF2eCharacterService } from './PF2eCharacterService';
import { PF2eSkillService } from './PF2eSkillService';

/**
 * Service to get skill bonuses for the current user's character
 * Used for displaying skill modifiers in the UI
 */
export class PF2eSkillBonusService {
  private static instance: PF2eSkillBonusService;
  private characterService: PF2eCharacterService;
  private skillService: PF2eSkillService;

  constructor() {
    this.characterService = PF2eCharacterService.getInstance();
    this.skillService = PF2eSkillService.getInstance();
  }

  static getInstance(): PF2eSkillBonusService {
    if (!PF2eSkillBonusService.instance) {
      PF2eSkillBonusService.instance = new PF2eSkillBonusService();
    }
    return PF2eSkillBonusService.instance;
  }

  /**
   * Get skill bonus for the current user's character
   * Returns null if no character is assigned or skill is not found
   */
  getSkillBonus(skillName: string): number | null {
    const character = this.characterService.getCurrentUserCharacter();
    
    if (!character) {
      return null;
    }

    return this.skillService.getCharacterSkillModifier(character, skillName);
  }

  /**
   * Get skill bonuses for multiple skills
   * Returns a map of skill name to bonus (or null if not available)
   */
  getSkillBonuses(skillNames: string[]): Map<string, number | null> {
    const bonuses = new Map<string, number | null>();
    
    for (const skillName of skillNames) {
      bonuses.set(skillName, this.getSkillBonus(skillName));
    }
    
    return bonuses;
  }

  /**
   * Check if the current user has a character assigned
   */
  hasCharacterAssigned(): boolean {
    return this.characterService.getCurrentUserCharacter() !== null;
  }
}

// Export singleton instance
export const pf2eSkillBonusService = PF2eSkillBonusService.getInstance();

// Export convenience functions
export const getSkillBonus = (skillName: string) => 
  pf2eSkillBonusService.getSkillBonus(skillName);

export const getSkillBonuses = (skillNames: string[]) => 
  pf2eSkillBonusService.getSkillBonuses(skillNames);

export const hasCharacterAssigned = () => 
  pf2eSkillBonusService.hasCharacterAssigned();
