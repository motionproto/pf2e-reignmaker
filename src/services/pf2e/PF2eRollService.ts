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
  private rollHandlerInitialized = false;

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
  initializeRollResultHandler(): void {
    // Initialize hook only once
    if (this.rollHandlerInitialized) {
      console.log('[PF2eRollService] Roll result handler already initialized');
      return;
    }
    
    console.log('✅ [PF2eRollService] Initializing createChatMessage hook for kingdom rolls');
    this.rollHandlerInitialized = true;
    
    // Hook into chat message creation to process kingdom check results  
    Hooks.on('createChatMessage', async (message: any) => {
      console.log('[PF2eRollService] createChatMessage hook fired, checking for pending kingdom check...');
      
      // Check for both old and new flag names for backward compatibility
      let pendingCheck: any = game.user?.getFlag('pf2e-reignmaker', 'pendingCheck');
      let isLegacyAction = false;
      
      console.log('[PF2eRollService] pendingCheck flag:', pendingCheck);
      
      if (!pendingCheck) {
        // Check for legacy pendingAction flag
        const legacyCheck: any = game.user?.getFlag('pf2e-reignmaker', 'pendingAction');
        console.log('[PF2eRollService] pendingAction flag (legacy):', legacyCheck);
        
        if (legacyCheck) {
          // Convert legacy action to new format
          isLegacyAction = true;
          pendingCheck = {
            checkId: legacyCheck.actionId,
            checkType: 'action',
            checkName: legacyCheck.actionName,
            checkEffects: legacyCheck.actionEffects,
            skillName: legacyCheck.skillName,
            actorId: legacyCheck.actorId,
            actorName: legacyCheck.actorName,
            dc: legacyCheck.dc
          };
        }
      }
      
      if (!pendingCheck) {
        console.log('[PF2eRollService] No pending check found, returning');
        return;
      }
      
      console.log('[PF2eRollService] Message speaker actor:', message.speaker?.actor, 'Expected:', pendingCheck.actorId);
      
      // Check if the message is from the correct actor
      if (message.speaker?.actor !== pendingCheck.actorId) {
        console.log('[PF2eRollService] Actor mismatch, returning');
        return;
      }
      
      // Check if this is a skill check roll
      const roll = message.rolls?.[0];
      console.log('[PF2eRollService] Roll found:', !!roll, 'Has DC:', !!message.flags?.pf2e?.context?.dc);
      
      if (!roll || !message.flags?.pf2e?.context?.dc) {
        console.log('[PF2eRollService] Not a valid skill check, returning');
        return;
      }
      
      const dc = message.flags.pf2e.context.dc.value;
      const outcome = this.parseRollOutcome(roll, dc);
      
      // Extract roll breakdown from PF2e message flags
      const d20Result = roll.dice[0]?.results[0]?.result || 0;
      const modifiers = message.flags.pf2e.context.modifiers || [];
      
      console.log('📊 [PF2eRollService] Raw PF2e data:', {
        d20Result,
        total: roll.total,
        dc,
        rawModifiers: modifiers
      });
      
      const rollBreakdown = {
        d20Result,
        total: roll.total,
        dc,
        modifiers: modifiers.map((m: any) => ({
          label: m.label || m.name || 'Modifier',
          modifier: m.modifier || m.value || 0,
          enabled: m.enabled !== false
        }))
      };
      
      console.log('📊 [PF2eRollService] Formatted roll breakdown:', rollBreakdown);
      console.log(`🎲 [PF2eRollService] Parsed outcome: ${outcome} for ${pendingCheck.checkId}, dispatching ${pendingCheck.checkType} event...`);
      
      // Dispatch a custom event with the roll result
      // Components can listen for this event and filter by checkType and checkId
      const event = new CustomEvent('kingdomRollComplete', {
        detail: {
          checkId: pendingCheck.checkId,
          outcome: outcome,
          actorName: pendingCheck.actorName,
          checkType: pendingCheck.checkType || 'action',
          skillName: pendingCheck.skillName,
          proficiencyRank: pendingCheck.proficiencyRank,
          rollBreakdown
        }
      });
      
      // Dispatch to window so any component can listen
      window.dispatchEvent(event);
      
      // Clear the appropriate flag
      if (isLegacyAction) {
        await game.user?.unsetFlag('pf2e-reignmaker', 'pendingAction');
        console.log('[PF2eRollService] Cleared legacy pendingAction flag');
      } else {
        await game.user?.unsetFlag('pf2e-reignmaker', 'pendingCheck');
        console.log('[PF2eRollService] Cleared pendingCheck flag');
      }
    });
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

// Legacy function exports for backward compatibility
export const pf2eRollService = PF2eRollService.getInstance();
export const initializeRollResultHandler = () => pf2eRollService.initializeRollResultHandler();
