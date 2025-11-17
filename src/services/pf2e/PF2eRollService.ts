export interface RollResult {
  total: number;
  outcome: string;
  roll: any;
  character: any;
  success: boolean;
}

export interface RollEventData {
  checkId: string;
  outcome: string;
  actorName: string;
  checkType: string;
  skillName: string;
  proficiencyRank?: number;
  rollBreakdown?: {
    d20Result: number;
    total: number;
    dc: number;
    modifiers: Array<{ label: string; modifier: number; enabled?: boolean }>;
  };
}

export class PF2eRollService {
  private static instance: PF2eRollService;

  static getInstance(): PF2eRollService {
    if (!PF2eRollService.instance) {
      PF2eRollService.instance = new PF2eRollService();
    }
    return PF2eRollService.instance;
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
    // First calculate base outcome WITHOUT considering natural 20/1
    let outcome: string;
    if (total >= dc + 10) {
      outcome = 'criticalSuccess';
    } else if (total <= dc - 10) {
      outcome = 'criticalFailure';
    } else if (total >= dc) {
      outcome = 'success';
    } else {
      outcome = 'failure';
    }
    
    // Natural 20 upgrades outcome by one step, natural 1 downgrades by one step
    const d20Result = roll.dice[0]?.results[0]?.result;
    if (d20Result === 20) {
      // Natural 20: Upgrade by one step
      if (outcome === 'criticalFailure') {
        outcome = 'failure';
      } else if (outcome === 'failure') {
        outcome = 'success';
      } else if (outcome === 'success') {
        outcome = 'criticalSuccess';
      }
      // Critical success stays critical success
    } else if (d20Result === 1) {
      // Natural 1: Downgrade by one step
      if (outcome === 'criticalSuccess') {
        outcome = 'success';
      } else if (outcome === 'success') {
        outcome = 'failure';
      } else if (outcome === 'failure') {
        outcome = 'criticalFailure';
      }
      // Critical failure stays critical failure
    }
    
    return outcome;
  }


  /**
   * Get degree of success text
   */
  getDegreeOfSuccessText(outcome: string): string {
    switch (outcome) {
      case 'criticalSuccess': return 'Critical Success';
      case 'success': return 'Success';
      case 'failure': return 'Failure';
      case 'criticalFailure': return 'Critical Failure';
      default: return 'Unknown';
    }
  }

  /**
   * Calculate degree of success from roll total and DC
   */
  calculateDegreeOfSuccess(rollTotal: number, dc: number): string {
    const difference = rollTotal - dc;
    
    if (difference >= 10) {
      return 'criticalSuccess';
    } else if (difference >= 0) {
      return 'success';
    } else if (difference >= -10) {
      return 'failure';
    } else {
      return 'criticalFailure';
    }
  }

  /**
   * Check if an outcome represents success
   */
  isSuccessfulOutcome(outcome: string): boolean {
    return outcome === 'success' || outcome === 'criticalSuccess';
  }

  /**
   * Check if an outcome represents a critical result
   */
  isCriticalOutcome(outcome: string): boolean {
    return outcome === 'criticalSuccess' || outcome === 'criticalFailure';
  }
}

// Export singleton instance
export const pf2eRollService = PF2eRollService.getInstance();
