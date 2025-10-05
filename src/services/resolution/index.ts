/**
 * Resolution Services
 * 
 * Consolidated services for handling outcome resolution, dice rolling,
 * and formatting. These services contain all business logic for
 * resolution flows, keeping controllers and views clean.
 */

export { rollDiceFormula, isDiceFormula, detectDiceModifiers, detectStateChangeDice, evaluateDiceFormula, getDicePattern } from './DiceRollingService';

export { createOutcomeResolutionService } from './OutcomeResolutionService';
export type { OutcomeResolutionService, OutcomeResolutionData } from './OutcomeResolutionService';

export { createOutcomeFormattingService, getOutcomeDisplayProps, formatStateChangeLabel, formatStateChangeValue, getChangeClass } from './OutcomeFormattingService';
export type { OutcomeFormattingService } from './OutcomeFormattingService';
