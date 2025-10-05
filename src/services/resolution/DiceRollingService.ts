/**
 * DiceRollingService - Centralized dice rolling and formula evaluation
 * 
 * Consolidates all dice-related logic from:
 * - OutcomeDisplayLogic (UI dice rolling)
 * - GameEffectsService (fallback dice rolling)
 * 
 * Single source of truth for dice operations across the application.
 */

// Dice formula detection regex
const DICE_PATTERN = /^-?\d+d\d+([+-]\d+)?$/;

/**
 * Roll a dice formula (e.g., "1d4", "2d6+1", "-1d4", "-2d6-1")
 */
export function rollDiceFormula(formula: string): number {
  // Handle negative prefix
  const isNegative = formula.startsWith('-');
  const cleanFormula = isNegative ? formula.substring(1) : formula;
  
  // Parse the dice formula
  const match = cleanFormula.match(/(\d+)d(\d+)(?:([+-])(\d+))?/i);
  if (!match) {
    console.error(`Invalid dice formula: ${formula}`);
    return 0;
  }
  
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const bonusSign = match[3]; // '+' or '-'
  const bonusValue = match[4] ? parseInt(match[4]) : 0;
  
  // Calculate bonus
  let bonus = 0;
  if (bonusSign === '+') {
    bonus = bonusValue;
  } else if (bonusSign === '-') {
    bonus = -bonusValue;
  }
  
  // Roll dice
  let total = bonus;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  
  // Apply negative if needed
  return isNegative ? -total : total;
}

/**
 * Check if a value is a dice formula
 */
export function isDiceFormula(value: any): boolean {
  return typeof value === 'string' && DICE_PATTERN.test(value);
}

/**
 * Detect modifiers with dice formula values (requiring player to roll)
 */
export function detectDiceModifiers(modifiers: any[] | undefined): any[] {
  if (!modifiers) return [];
  return modifiers
    .map((m, index) => ({ ...m, originalIndex: index }))
    .filter(m => typeof m.value === 'string' && DICE_PATTERN.test(m.value));
}

/**
 * Detect dice formulas in stateChanges (requiring player to roll)
 * Returns array of { key: string, formula: string } objects
 */
export function detectStateChangeDice(stateChanges: Record<string, any> | undefined): { key: string; formula: string }[] {
  if (!stateChanges) return [];
  
  return Object.entries(stateChanges)
    .filter(([_, value]) => typeof value === 'string' && DICE_PATTERN.test(value))
    .map(([key, formula]) => ({ key, formula }));
}

/**
 * Evaluate a dice formula to a numeric value
 * Used as fallback when UI hasn't pre-rolled
 */
export function evaluateDiceFormula(formula: string): number {
  // For now, just parse simple dice formulas like "1d4" or return 0
  const match = formula.match(/^(-?)(\d+)d(\d+)([+-]\d+)?$/);
  if (match) {
    const isNegative = match[1] === '-';
    const numDice = parseInt(match[2]);
    const diceSides = parseInt(match[3]);
    const modifier = match[4] ? parseInt(match[4]) : 0;
    
    // Roll the dice (simple random)
    let total = modifier;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * diceSides) + 1;
    }
    
    const result = isNegative ? -total : total;
    console.log(`🎲 [DiceRollingService] Rolled ${formula}: ${result}`);
    return result;
  }
  
  // If it's not a dice formula, try parsing as a number
  const num = parseInt(formula, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Get dice pattern for validation
 */
export function getDicePattern(): RegExp {
  return DICE_PATTERN;
}
