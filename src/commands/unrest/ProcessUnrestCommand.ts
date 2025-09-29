/**
 * ProcessUnrestCommand - Command to process unrest generation and modification
 * 
 * This command handles unrest changes with proper validation, tier calculation,
 * and rollback support. It also handles imprisoned unrest mechanics.
 */

import { Command } from '../base/Command';
import type { CommandContext, CommandResult } from '../base/Command';
import type { KingdomState } from '../../models/KingdomState';
import { unrestService } from '../../services/domain/UnrestService';
import type { UnrestStatus } from '../../services/domain/UnrestService';

export interface UnrestChange {
    type: 'generate' | 'reduce' | 'imprison' | 'release';
    amount: number;
    source: string;
}

export interface ProcessUnrestData {
    changes: UnrestChange[];
    previousUnrest: number;
    previousImprisoned: number;
    previousTier: string;
    newUnrest: number;
    newImprisoned: number;
    newTier: string;
    totalGenerated: number;
    totalReduced: number;
}

export class ProcessUnrestCommand extends Command<ProcessUnrestData> {
    private changes: UnrestChange[];
    private previousUnrest: number = 0;
    private previousImprisoned: number = 0;
    
    constructor(changes: UnrestChange[] | number, source?: string) {
        super();
        // Convert simple number to UnrestChange array
        if (typeof changes === 'number') {
            this.changes = [{
                type: changes >= 0 ? 'generate' : 'reduce',
                amount: Math.abs(changes),
                source: source || 'unknown'
            }];
        } else {
            this.changes = changes;
        }
    }
    
    getName(): string {
        const types = [...new Set(this.changes.map(c => c.type))].join(',');
        return `ProcessUnrest:${types}`;
    }
    
    getDescription(): string {
        const descriptions = this.changes.map(c => {
            switch (c.type) {
                case 'generate':
                    return `+${c.amount} unrest (${c.source})`;
                case 'reduce':
                    return `-${c.amount} unrest (${c.source})`;
                case 'imprison':
                    return `Imprison ${c.amount} unrest`;
                case 'release':
                    return `Release ${c.amount} imprisoned unrest`;
                default:
                    return `Unknown unrest change`;
            }
        });
        return `Process unrest: ${descriptions.join(', ')}`;
    }
    
    canExecute(context: CommandContext): boolean {
        const validation = this.validate();
        if (validation) {
            console.warn(`Cannot execute: ${validation}`);
            return false;
        }
        
        // Check if we can reduce/imprison that much unrest
        for (const change of this.changes) {
            if (change.type === 'reduce') {
                const currentUnrest = context.kingdomState.unrest;
                if (change.amount > currentUnrest) {
                    console.warn(`Cannot reduce ${change.amount} unrest, only ${currentUnrest} available`);
                    return false;
                }
            }
            
            if (change.type === 'imprison') {
                const currentUnrest = context.kingdomState.unrest;
                if (change.amount > currentUnrest) {
                    console.warn(`Cannot imprison ${change.amount} unrest, only ${currentUnrest} available`);
                    return false;
                }
            }
            
            if (change.type === 'release') {
                const imprisoned = context.kingdomState.imprisonedUnrest || 0;
                if (change.amount > imprisoned) {
                    console.warn(`Cannot release ${change.amount} unrest, only ${imprisoned} imprisoned`);
                    return false;
                }
            }
        }
        
        return true;
    }
    
    execute(context: CommandContext): CommandResult<ProcessUnrestData> {
        this.setContext(context);
        
        // Store previous values
        this.previousUnrest = context.kingdomState.unrest;
        this.previousImprisoned = context.kingdomState.imprisonedUnrest || 0;
        const previousStatus = unrestService.getUnrestStatus(context.kingdomState);
        
        // Track totals
        let totalGenerated = 0;
        let totalReduced = 0;
        
        // Apply each change
        for (const change of this.changes) {
            switch (change.type) {
                case 'generate':
                    context.kingdomState.unrest += change.amount;
                    totalGenerated += change.amount;
                    break;
                    
                case 'reduce':
                    context.kingdomState.unrest = Math.max(0, context.kingdomState.unrest - change.amount);
                    totalReduced += change.amount;
                    break;
                    
                case 'imprison':
                    // Move unrest from active to imprisoned
                    const toImprison = Math.min(change.amount, context.kingdomState.unrest);
                    context.kingdomState.unrest -= toImprison;
                    context.kingdomState.imprisonedUnrest = (context.kingdomState.imprisonedUnrest || 0) + toImprison;
                    break;
                    
                case 'release':
                    // Move unrest from imprisoned to active
                    const toRelease = Math.min(change.amount, context.kingdomState.imprisonedUnrest || 0);
                    context.kingdomState.imprisonedUnrest = Math.max(0, (context.kingdomState.imprisonedUnrest || 0) - toRelease);
                    context.kingdomState.unrest += toRelease;
                    break;
            }
        }
        
        // Get new status
        const newStatus = unrestService.getUnrestStatus(context.kingdomState);
        
        return {
            success: true,
            data: {
                changes: this.changes,
                previousUnrest: this.previousUnrest,
                previousImprisoned: this.previousImprisoned,
                previousTier: String(previousStatus.tier),
                newUnrest: context.kingdomState.unrest,
                newImprisoned: context.kingdomState.imprisonedUnrest || 0,
                newTier: String(newStatus.tier),
                totalGenerated,
                totalReduced
            },
            rollback: () => this.rollback(context)
        };
    }
    
    protected validate(): string | null {
        if (!this.changes || this.changes.length === 0) {
            return 'No unrest changes provided';
        }
        
        for (const change of this.changes) {
            if (!change.type) {
                return 'Change type is required';
            }
            
            const validTypes = ['generate', 'reduce', 'imprison', 'release'];
            if (!validTypes.includes(change.type)) {
                return `Invalid change type: ${change.type}`;
            }
            
            if (typeof change.amount !== 'number' || change.amount < 0) {
                return `Invalid amount for ${change.type}: ${change.amount}`;
            }
            
            if (!change.source) {
                return 'Change source is required';
            }
        }
        
        return null;
    }
    
    private rollback(context: CommandContext): void {
        // Restore previous values
        context.kingdomState.unrest = this.previousUnrest;
        context.kingdomState.imprisonedUnrest = this.previousImprisoned;
    }
    
    /**
     * Helper method to create a command for generating unrest
     */
    static generate(amount: number, source: string): ProcessUnrestCommand {
        return new ProcessUnrestCommand([{
            type: 'generate',
            amount,
            source
        }]);
    }
    
    /**
     * Helper method to create a command for reducing unrest
     */
    static reduce(amount: number, source: string): ProcessUnrestCommand {
        return new ProcessUnrestCommand([{
            type: 'reduce',
            amount,
            source
        }]);
    }
    
    /**
     * Helper method to create a command for imprisoning unrest
     */
    static imprison(amount: number): ProcessUnrestCommand {
        return new ProcessUnrestCommand([{
            type: 'imprison',
            amount,
            source: 'imprisonment'
        }]);
    }
    
    /**
     * Helper method to create a command for releasing imprisoned unrest
     */
    static release(amount: number): ProcessUnrestCommand {
        return new ProcessUnrestCommand([{
            type: 'release',
            amount,
            source: 'release'
        }]);
    }
}
