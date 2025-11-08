import type { PlayerAction, PlayerActionJson, SkillOption, ActionEffect } from './action-types';
import actionsData from '../../data-compiled/player-actions.json';
import { logger } from '../../utils/Logger';

/**
 * Service for loading player actions from JSON data
 * Pure data access - no business logic (Repository pattern)
 * 
 * Mirrors architecture from event-loader.ts and incident-loader.ts
 */
export class ActionLoader {
    private actions: Map<string, PlayerAction> = new Map();
    private actionsLoaded: boolean = false;

    /**
     * Load actions from imported JSON data
     */
    loadActions(): void {
        if (this.actionsLoaded) {

            return;
        }

        try {
            // Load actions from the imported JSON data
            const rawActionsList = actionsData as PlayerActionJson[];
            
            // Convert raw data to typed actions, filtering out disabled actions
            const actionsList: PlayerAction[] = rawActionsList
                .filter(raw => !(raw as any).disabled)  // Filter out disabled actions
                .map(raw => ({
                    id: raw.id,
                    name: raw.name,
                    category: raw.category,
                    brief: raw.brief,
                    description: raw.description,
                    skills: raw.skills,
                    criticalSuccess: {
                        description: raw.effects.criticalSuccess?.description || '',
                        modifiers: raw.effects.criticalSuccess?.modifiers,
                        gameCommands: raw.effects.criticalSuccess?.gameCommands,
                        choices: raw.effects.criticalSuccess?.choices
                    },
                    success: {
                        description: raw.effects.success?.description || '',
                        modifiers: raw.effects.success?.modifiers,
                        gameCommands: raw.effects.success?.gameCommands,
                        choices: raw.effects.success?.choices
                    },
                    failure: {
                        description: raw.effects.failure?.description || '',
                        modifiers: raw.effects.failure?.modifiers,
                        gameCommands: raw.effects.failure?.gameCommands,
                        choices: raw.effects.failure?.choices
                    },
                    criticalFailure: {
                        description: raw.effects.criticalFailure?.description || '',
                        modifiers: raw.effects.criticalFailure?.modifiers,
                        gameCommands: raw.effects.criticalFailure?.gameCommands,
                        choices: raw.effects.criticalFailure?.choices
                    },
                    proficiencyScaling: raw.proficiencyScaling 
                        ? new Map(Object.entries(raw.proficiencyScaling))
                        : null,
                    special: raw.special || null,
                    cost: (raw as any).cost 
                        ? new Map(Object.entries((raw as any).cost))
                        : null,
                    failureCausesUnrest: raw.failureCausesUnrest,
                    requirements: raw.requirements
                }));
            
            // Add all actions to the map
            for (const action of actionsList) {
                this.actions.set(action.id, action);
            }
            
            this.actionsLoaded = true;

            // Log action counts by category for verification
            const categoryCounts = this.getActionCountsByCategory();

        } catch (error) {
            logger.error('Failed to load actions:', error);
            // Fallback to empty map
            this.actions = new Map();
        }
    }

    /**
     * Get a specific action by ID
     */
    getActionById(actionId: string): PlayerAction | null {
        return this.actions.get(actionId) || null;
    }

    /**
     * Get all actions for a specific category
     */
    getActionsByCategory(category: string): PlayerAction[] {
        return Array.from(this.actions.values()).filter(
            action => action.category === category
        );
    }

    /**
     * Get skills for an action
     */
    getActionSkills(action: PlayerAction): SkillOption[] {
        return action.skills || [];
    }

    /**
     * Get outcome for a specific result
     */
    getActionOutcome(
        action: PlayerAction, 
        result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): ActionEffect | null {
        return action[result] || null;
    }

    /**
     * Apply action outcome effects
     */
    applyActionOutcome(
        action: PlayerAction, 
        result: 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'
    ): Record<string, number> {
        const outcome = action[result];
        if (!outcome) {
            return {};
        }

        const appliedEffects: Record<string, number> = {};

        // Process modifiers if present
        if (outcome.modifiers) {
            // Handle different modifier formats (object or Map)
            const modifiers = outcome.modifiers instanceof Map 
                ? Object.fromEntries(outcome.modifiers)
                : outcome.modifiers;
            
            for (const [key, value] of Object.entries(modifiers)) {
                if (typeof value === 'number') {
                    appliedEffects[key] = (appliedEffects[key] || 0) + value;
                }
            }
        }

        return appliedEffects;
    }

    /**
     * Get action counts by category (for debugging)
     */
    getActionCountsByCategory(): Record<string, number> {
        const counts: Record<string, number> = {};
        
        for (const action of this.actions.values()) {
            const category = action.category || 'unknown';
            counts[category] = (counts[category] || 0) + 1;
        }
        
        return counts;
    }

    /**
     * Check if an action can be performed with a given skill
     */
    canPerformWithSkill(action: PlayerAction, skill: string): boolean {
        if (!action.skills) {
            return false;
        }

        return action.skills.some(s => s.skill.toLowerCase() === skill.toLowerCase());
    }

    /**
     * Export actions for debugging
     */
    exportActions(): PlayerAction[] {
        return Array.from(this.actions.values());
    }

    /**
     * Get all available actions
     */
    getAllActions(): PlayerAction[] {
        return Array.from(this.actions.values());
    }

    /**
     * Get actions that have resource costs
     */
    getActionsWithCosts(): PlayerAction[] {
        return Array.from(this.actions.values()).filter(
            action => action.cost && action.cost.size > 0
        );
    }

    /**
     * Get actions that cause unrest on failure
     */
    getActionsWithUnrestRisk(): PlayerAction[] {
        return Array.from(this.actions.values()).filter(
            action => action.failureCausesUnrest === true
        );
    }

    /**
     * Get all unique categories
     */
    getAllCategories(): string[] {
        const categories = new Set<string>();
        for (const action of this.actions.values()) {
            if (action.category) {
                categories.add(action.category);
            }
        }
        return Array.from(categories).sort();
    }
}

// Export singleton instance
export const actionLoader = new ActionLoader();

// Initialize actions on module load
if (typeof window !== 'undefined') {
    actionLoader.loadActions();
}
