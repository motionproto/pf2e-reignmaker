// PF2e Integration Services
import { PF2eCharacterService } from './PF2eCharacterService';
import { PF2eSkillService } from './PF2eSkillService';
import { PF2eRollService } from './PF2eRollService';

export { PF2eCharacterService, pf2eCharacterService } from './PF2eCharacterService';
export { PF2eSkillService, pf2eSkillService } from './PF2eSkillService';
export { PF2eRollService, pf2eRollService } from './PF2eRollService';

// Character Service exports
export { 
  getPlayerCharacters,
  getCurrentUserCharacter, 
  getUserControlledCharacters,
  showCharacterSelectionDialog,
  assignCharacterToUser
} from './PF2eCharacterService';

// Skill Service exports
export { 
  performKingdomSkillCheck, 
  performKingdomActionRoll,
  getKingdomActionDC 
} from './PF2eSkillService';

// Roll Service exports
export { 
  initializeRollResultHandler 
} from './PF2eRollService';

// Type exports
export type { CharacterSelectionResult } from './PF2eCharacterService';
export type { SkillCheckOptions, SkillCheckResult } from './PF2eSkillService';
export type { RollResult, RollEventData } from './PF2eRollService';

// Legacy compatibility - create a combined service instance similar to original
class PF2eIntegrationService {
  private characterService = PF2eCharacterService.getInstance();
  private skillService = PF2eSkillService.getInstance();
  private rollService = PF2eRollService.getInstance();

  // Character methods
  getPlayerCharacters = () => this.characterService.getPlayerCharacters();
  getCurrentUserCharacter = () => this.characterService.getCurrentUserCharacter();
  getUserControlledCharacters = () => this.characterService.getUserControlledCharacters();
  showCharacterSelectionDialog = (title?: string, message?: string) => 
    this.characterService.showCharacterSelectionDialog(title, message);
  assignCharacterToUser = (character: any) => 
    this.characterService.assignCharacterToUser(character);
  validateCharacterForKingdomAction = (character: any) => 
    this.characterService.validateCharacterForKingdomAction(character);
  getCharacterLevel = (character: any) => 
    this.characterService.getCharacterLevel(character);

  // Skill methods
  performKingdomSkillCheck = (
    skillName: string,
    checkType: 'action' | 'event' | 'incident',
    checkName: string,
    checkId: string,
    checkEffects?: any
  ) => this.skillService.performKingdomSkillCheck(skillName, checkType, checkName, checkId, checkEffects);
  
  performKingdomActionRoll = (
    actor: any,
    skillName: string,
    dc: number,
    actionName: string,
    actionId: string,
    actionEffects: any
  ) => this.skillService.performKingdomActionRoll(actor, skillName, dc, actionName, actionId, actionEffects);
  
  getKingdomActionDC = (characterLevel?: number) => this.skillService.getKingdomActionDC(characterLevel);
  getCharacterSkills = (character: any) => this.skillService.getCharacterSkills(character);
  isCharacterProficientInSkill = (character: any, skill: string) => 
    this.skillService.isCharacterProficientInSkill(character, skill);
  getCharacterSkillModifier = (character: any, skill: string) => 
    this.skillService.getCharacterSkillModifier(character, skill);

  // Roll methods
  initializeRollResultHandler = () => this.rollService.initializeRollResultHandler();
  parseRollOutcome = (roll: any, dc: number) => this.rollService.parseRollOutcome(roll, dc);
  getDegreeOfSuccessText = (outcome: string) => this.rollService.getDegreeOfSuccessText(outcome);
  calculateDegreeOfSuccess = (rollTotal: number, dc: number) => 
    this.rollService.calculateDegreeOfSuccess(rollTotal, dc);
  isSuccessfulOutcome = (outcome: string) => this.rollService.isSuccessfulOutcome(outcome);
  isCriticalOutcome = (outcome: string) => this.rollService.isCriticalOutcome(outcome);
}

// Export singleton instance for backward compatibility
export const pf2eIntegrationService = new PF2eIntegrationService();

// Default export for easy importing
export default pf2eIntegrationService;
