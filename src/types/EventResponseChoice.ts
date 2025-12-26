/**
 * EventResponseChoice - Type definitions for event-specific response choices
 * 
 * These are conceptually different from pre-roll interactions (which are for actions).
 * Event response choices represent the player's strategic approach to handling the event.
 */

export interface EventResponseChoice {
  id: string;
  label: string;
  description: string;
  icon: string;
  skills: string[];
  
  /**
   * Weighted personality impact (0-10 scale)
   * Optional - not all choices impact personality
   * Multiple values can be set for nuanced choices
   */
  personality?: {
    idealist?: number;  // Does what is right, regardless of cost (0-10)
    practical?: number; // Balanced, lawful, tries to please all parties (0-10)
    ruthless?: number;  // Acts at expense of others for self-profit (0-10)
  };
  
  /**
   * Outcome badges for this strategic choice
   * Maps outcome types to arrays of badges
   * Used to show different effects based on chosen approach
   */
  outcomeBadges?: {
    criticalSuccess?: any[];
    success?: any[];
    failure?: any[];
    criticalFailure?: any[];
  };
  
  /**
   * Outcome descriptions for this strategic choice
   * Maps outcome types to description strings
   * Used to show choice-specific outcome text
   */
  outcomeDescriptions?: {
    criticalSuccess?: string;
    success?: string;
    failure?: string;
    criticalFailure?: string;
  };
}

export interface EventResponseChoices {
  label: string;
  required: boolean;
  options: EventResponseChoice[];
}
