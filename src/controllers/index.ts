/**
 * Simplified Controller Factory
 * 
 * Creates and manages simple controllers without complex registry patterns.
 * Focus on direct instantiation and simple validation.
 */

import { TurnManager } from '../models/TurnManager';

/**
 * Factory for creating controller components
 */
export class ControllerFactory {
    
    /**
     * Create a new TurnManager (simple turn progression only)
     */
    static createTurnManager(): TurnManager {
        console.log('[ControllerFactory] Creating simplified TurnManager');
        return new TurnManager();
    }
    
    /**
     * Validate basic system health
     */
    static validateSystem(): { valid: boolean; issues: string[] } {
        const issues: string[] = [];
        
        try {
            // Basic validation - can we create a TurnManager?
            const testManager = new TurnManager();
            if (!testManager) {
                issues.push('Failed to create TurnManager');
            }
        } catch (error) {
            issues.push(`TurnManager creation failed: ${error}`);
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }
    
    /**
     * Get system status summary
     */
    static getSystemStatus(): {
        turnManagerAvailable: boolean;
        systemValid: boolean;
        issues: string[];
    } {
        const validation = this.validateSystem();
        
        return {
            turnManagerAvailable: true, // Simple - we can always create one
            systemValid: validation.valid,
            issues: validation.issues
        };
    }
}

// Export factory for easy access
export { ControllerFactory as default };

/**
 * Quick factory function for common use case
 */
export function createTurnManager(): TurnManager {
    return ControllerFactory.createTurnManager();
}
