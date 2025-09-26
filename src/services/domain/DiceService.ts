/**
 * DiceService - Centralized dice rolling and RNG operations
 * 
 * This service handles all random number generation for the kingdom game,
 * providing consistent dice rolling mechanics and supporting various dice types.
 */

export interface DiceRoll {
    result: number;
    dice: string;
    modifier: number;
    total: number;
    rolls: number[];
}

export interface D20Result {
    roll: number;
    modifier: number;
    total: number;
    criticalSuccess: boolean;
    criticalFailure: boolean;
}

export class DiceService {
    /**
     * Roll a single d20
     */
    rollD20(): number {
        return Math.floor(Math.random() * 20) + 1;
    }

    /**
     * Roll a d20 with modifiers and DC check
     */
    rollD20Check(modifier: number = 0, dc: number): D20Result {
        const roll = this.rollD20();
        const total = roll + modifier;
        
        return {
            roll,
            modifier,
            total,
            criticalSuccess: roll === 20 || total >= dc + 10,
            criticalFailure: roll === 1 || total <= dc - 10
        };
    }

    /**
     * Roll a d100 (percentile dice)
     */
    rollD100(): number {
        return Math.floor(Math.random() * 100) + 1;
    }

    /**
     * Roll a d6
     */
    rollD6(): number {
        return Math.floor(Math.random() * 6) + 1;
    }

    /**
     * Roll a d4
     */
    rollD4(): number {
        return Math.floor(Math.random() * 4) + 1;
    }

    /**
     * Roll multiple dice of the same type
     */
    rollMultiple(count: number, sides: number): number[] {
        const rolls: number[] = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
        return rolls;
    }

    /**
     * Roll dice notation (e.g., "3d6+2", "1d20-5")
     */
    rollDiceNotation(notation: string): DiceRoll {
        const regex = /^(\d+)d(\d+)([+-]?\d+)?$/;
        const match = notation.match(regex);
        
        if (!match) {
            throw new Error(`Invalid dice notation: ${notation}`);
        }
        
        const count = parseInt(match[1], 10);
        const sides = parseInt(match[2], 10);
        const modifier = match[3] ? parseInt(match[3], 10) : 0;
        
        const rolls = this.rollMultiple(count, sides);
        const result = rolls.reduce((sum, roll) => sum + roll, 0);
        const total = result + modifier;
        
        return {
            result,
            dice: `${count}d${sides}`,
            modifier,
            total,
            rolls
        };
    }

    /**
     * Roll within a range (inclusive)
     */
    rollInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Get a random element from an array
     */
    randomElement<T>(array: T[]): T | undefined {
        if (array.length === 0) return undefined;
        const index = Math.floor(Math.random() * array.length);
        return array[index];
    }

    /**
     * Shuffle an array (Fisher-Yates algorithm)
     */
    shuffle<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Roll with advantage (roll twice, take higher)
     */
    rollWithAdvantage(sides: number = 20): number {
        const roll1 = Math.floor(Math.random() * sides) + 1;
        const roll2 = Math.floor(Math.random() * sides) + 1;
        return Math.max(roll1, roll2);
    }

    /**
     * Roll with disadvantage (roll twice, take lower)
     */
    rollWithDisadvantage(sides: number = 20): number {
        const roll1 = Math.floor(Math.random() * sides) + 1;
        const roll2 = Math.floor(Math.random() * sides) + 1;
        return Math.min(roll1, roll2);
    }

    /**
     * Calculate success degree for Pathfinder 2e
     */
    calculateSuccessDegree(
        total: number, 
        dc: number, 
        naturalRoll: number
    ): 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure' {
        const difference = total - dc;
        
        // Natural 20 upgrades success
        if (naturalRoll === 20) {
            if (difference >= 0) return 'criticalSuccess';
            if (difference >= -9) return 'success';
            return 'failure';
        }
        
        // Natural 1 downgrades success
        if (naturalRoll === 1) {
            if (difference >= 10) return 'success';
            if (difference >= 0) return 'failure';
            return 'criticalFailure';
        }
        
        // Standard success calculation
        if (difference >= 10) return 'criticalSuccess';
        if (difference >= 0) return 'success';
        if (difference > -10) return 'failure';
        return 'criticalFailure';
    }
}

// Export singleton instance
export const diceService = new DiceService();
