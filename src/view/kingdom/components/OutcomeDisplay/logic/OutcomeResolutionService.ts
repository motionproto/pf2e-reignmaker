/**
 * OutcomeResolutionService - Consolidated resolution data handling
 * 
 * Single source of truth for all interactive outcome resolution data:
 * - Dice rolls (from dice buttons)
 * - Resource selections (from dropdown choices)
 * - Choice selections (from choice buttons)
 * 
 * Used by OutcomeDisplay to prepare data for controllers in a consistent format.
 */

/**
 * Complete resolution data from user interactions
 */
export interface OutcomeResolutionData {
  /** Dice rolls keyed by modifier index */
  diceRolls?: Map<number, number>;
  
  /** Resource selections keyed by modifier index */
  resourceSelections?: Map<number, string>;
  
  /** Selected choice index and data */
  choice?: {
    index: number;
    data: any;
    result?: {
      effect: string;
      stateChanges: Record<string, any>;
    };
  };
}

/**
 * Input data from OutcomeDisplay component state
 */
interface ResolutionInput {
  resolvedDice: Map<number, number>;
  selectedResources: Map<number, string>;
  selectedChoice: number | null;
  choices?: any[];
  choiceResult?: {
    effect: string;
    stateChanges: Record<string, any>;
  } | null;
}

/**
 * Create the outcome resolution service
 */
export function createOutcomeResolutionService() {
  return {
    /**
     * Build complete resolution data from UI state
     * 
     * Converts OutcomeDisplay's internal state into a standardized format
     * that controllers and services can consume consistently.
     */
    buildResolutionData(input: ResolutionInput): OutcomeResolutionData {
      const data: OutcomeResolutionData = {};
      
      // Include dice rolls if any exist
      if (input.resolvedDice.size > 0) {
        data.diceRolls = new Map(input.resolvedDice);
      }
      
      // Include resource selections if any exist
      if (input.selectedResources.size > 0) {
        data.resourceSelections = new Map(input.selectedResources);
      }
      
      // Include choice data if a choice was made
      if (input.selectedChoice !== null && input.choices) {
        data.choice = {
          index: input.selectedChoice,
          data: input.choices[input.selectedChoice]
        };
        
        // Include computed result if available
        if (input.choiceResult) {
          data.choice.result = input.choiceResult;
        }
      }
      
      return data;
    },
    
    /**
     * Validate that all required interactions are complete
     */
    validateResolutionData(
      data: OutcomeResolutionData,
      requirements: {
        requiresDice: boolean;
        requiresResourceSelection: boolean;
        requiresChoice: boolean;
      }
    ): { valid: boolean; missing?: string[] } {
      const missing: string[] = [];
      
      if (requirements.requiresDice && (!data.diceRolls || data.diceRolls.size === 0)) {
        missing.push('dice rolls');
      }
      
      if (requirements.requiresResourceSelection && (!data.resourceSelections || data.resourceSelections.size === 0)) {
        missing.push('resource selections');
      }
      
      if (requirements.requiresChoice && !data.choice) {
        missing.push('choice selection');
      }
      
      return {
        valid: missing.length === 0,
        missing: missing.length > 0 ? missing : undefined
      };
    },
    
    /**
     * Convert resolution data to plain object for event dispatch
     * (Maps don't serialize well in CustomEvent detail)
     */
    toEventDetail(data: OutcomeResolutionData): Record<string, any> {
      return {
        diceRolls: data.diceRolls ? Object.fromEntries(data.diceRolls) : undefined,
        resourceSelections: data.resourceSelections ? Object.fromEntries(data.resourceSelections) : undefined,
        choice: data.choice
      };
    },
    
    /**
     * Parse resolution data from event detail back to typed format
     * (Useful for consumers of the OutcomeDisplay primary event)
     */
    fromEventDetail(detail: Record<string, any>): OutcomeResolutionData {
      const data: OutcomeResolutionData = {};
      
      if (detail.diceRolls) {
        data.diceRolls = new Map(
          Object.entries(detail.diceRolls).map(([k, v]) => [parseInt(k), v as number])
        );
      }
      
      if (detail.resourceSelections) {
        data.resourceSelections = new Map(
          Object.entries(detail.resourceSelections).map(([k, v]) => [parseInt(k), v as string])
        );
      }
      
      if (detail.choice) {
        data.choice = detail.choice;
      }
      
      return data;
    }
  };
}

/**
 * Singleton instance for convenience
 */
export const outcomeResolutionService = createOutcomeResolutionService();
