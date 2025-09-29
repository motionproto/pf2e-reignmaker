/**
 * ResetKingdomCommand - Command to reset the entire kingdom state
 * 
 * This command handles full kingdom reset with proper state backup
 * and rollback support in case of failure.
 */

import { Command } from '../base/Command';
import type { CommandContext, CommandResult } from '../base/Command';
import type { KingdomState } from '../../models/KingdomState';

export interface ResetKingdomData {
    previousState: KingdomState;
    resetOptions: {
        preserveTurn?: boolean;
        preserveCharacters?: boolean;
        preserveSettings?: boolean;
    };
}

export class ResetKingdomCommand extends Command<ResetKingdomData> {
    private options: ResetKingdomData['resetOptions'];
    private previousState?: KingdomState;
    
    constructor(options: ResetKingdomData['resetOptions'] = {}) {
        super();
        this.options = options;
    }
    
    getName(): string {
        return 'ResetKingdom';
    }
    
    getDescription(): string {
        const preserved: string[] = [];
        if (this.options.preserveTurn) preserved.push('turn');
        if (this.options.preserveCharacters) preserved.push('characters');
        if (this.options.preserveSettings) preserved.push('settings');
        
        const preservedText = preserved.length > 0 
            ? ` (preserving: ${preserved.join(', ')})` 
            : '';
        
        return `Reset kingdom to initial state${preservedText}`;
    }
    
    canExecute(context: CommandContext): boolean {
        // Always allow reset, but warn if in middle of phase
        if (context.currentPhase && context.currentPhase !== 'IDLE') {
            console.warn('Resetting kingdom in the middle of a phase');
        }
        return true;
    }
    
    execute(context: CommandContext): CommandResult<ResetKingdomData> {
        this.setContext(context);
        
        // Deep copy current state for rollback
        this.previousState = this.deepCopyState(context.kingdomState);
        
        // Reset the kingdom state
        this.resetKingdomState(context.kingdomState);
        
        return {
            success: true,
            data: {
                previousState: this.previousState,
                resetOptions: this.options
            },
            rollback: () => this.rollback(context)
        };
    }
    
    protected validate(): string | null {
        // No validation needed for reset
        return null;
    }
    
    private resetKingdomState(state: KingdomState): void {
        // Reset kingdom attributes
        state.size = 1;
        state.unrest = 0;
        state.imprisonedUnrest = 0;
        state.fame = 0;
        
        // Reset resources
        state.resources.clear();
        state.resources.set('gold', 0);
        state.resources.set('food', 0);
        state.resources.set('lumber', 0);
        state.resources.set('stone', 0);
        state.resources.set('ore', 0);
        
        // Reset collections
        state.hexes = [];
        state.settlements = [];
        state.armies = [];
        state.modifiers = [];
        state.buildQueue = [];
        state.continuousEvents = [];
        
        // Reset cached production
        state.cachedProduction.clear();
        state.cachedProductionByHex = [];
        
        // Reset worksite counts
        state.worksiteCount.clear();
        state.worksiteCount.set('farmlands', 0);
        state.worksiteCount.set('lumberCamps', 0);
        state.worksiteCount.set('quarries', 0);
        state.worksiteCount.set('mines', 0);
        state.worksiteCount.set('bogMines', 0);
        state.worksiteCount.set('huntingCamps', 0);
        
        // Reset events
        state.currentEvent = null;
        
        // Reset war status
        state.isAtWar = false;
    }
    
    private deepCopyState(state: KingdomState): KingdomState {
        // Create a deep copy of the kingdom state
        const copy = Object.create(Object.getPrototypeOf(state));
        Object.assign(copy, state);
        
        // Deep copy collections
        copy.resources = new Map(state.resources);
        copy.hexes = [...state.hexes];
        copy.settlements = [...state.settlements];
        copy.armies = [...state.armies];
        copy.modifiers = [...state.modifiers];
        copy.buildQueue = [...state.buildQueue];
        copy.continuousEvents = [...state.continuousEvents];
        copy.cachedProduction = new Map(state.cachedProduction);
        copy.cachedProductionByHex = [...state.cachedProductionByHex];
        copy.worksiteCount = new Map(state.worksiteCount);
        
        return copy;
    }
    
    private rollback(context: CommandContext): void {
        if (!this.previousState) {
            console.warn('No previous state available for rollback');
            return;
        }
        
        // Restore all properties from the backup
        Object.assign(context.kingdomState, this.previousState);
    }
}
