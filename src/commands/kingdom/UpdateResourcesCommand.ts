/**
 * UpdateResourcesCommand - Command to update kingdom resources with validation
 * 
 * This command handles generic resource updates with proper validation,
 * bounds checking, and rollback support.
 */

import { Command } from '../base/Command';
import type { CommandContext, CommandResult } from '../base/Command';
import type { KingdomState } from '../../models/KingdomState';

export interface ResourceUpdate {
    resource: string;
    amount: number;
    operation: 'set' | 'add' | 'subtract';
}

export interface UpdateResourcesData {
    updates: ResourceUpdate[];
    previousValues: Map<string, number>;
    appliedChanges: Map<string, number>;
}

export class UpdateResourcesCommand extends Command<UpdateResourcesData> {
    private updates: ResourceUpdate[];
    private previousValues: Map<string, number>;
    
    constructor(updates: ResourceUpdate[] | Map<string, number>) {
        super();
        // Convert Map to ResourceUpdate array if needed
        if (updates instanceof Map) {
            this.updates = Array.from(updates).map(([resource, amount]) => ({
                resource,
                amount,
                operation: 'add' as const
            }));
        } else {
            this.updates = updates;
        }
        this.previousValues = new Map();
    }
    
    getName(): string {
        const resources = this.updates.map(u => u.resource).join(',');
        return `UpdateResources:${resources}`;
    }
    
    getDescription(): string {
        const descriptions = this.updates.map(u => {
            const op = u.operation === 'set' ? '=' : u.operation === 'add' ? '+' : '-';
            return `${u.resource}${op}${u.amount}`;
        });
        return `Update resources: ${descriptions.join(', ')}`;
    }
    
    canExecute(context: CommandContext): boolean {
        const validation = this.validate();
        if (validation) {
            console.warn(`Cannot execute: ${validation}`);
            return false;
        }
        
        // Check if resources can go negative
        for (const update of this.updates) {
            if (update.operation === 'subtract') {
                const current = this.getResourceValue(context.kingdomState, update.resource);
                if (current - update.amount < 0) {
                    console.warn(`Cannot execute: ${update.resource} would go negative`);
                    return false;
                }
            }
        }
        
        return true;
    }
    
    execute(context: CommandContext): CommandResult<UpdateResourcesData> {
        this.setContext(context);
        
        // Store previous values for rollback
        this.previousValues.clear();
        for (const update of this.updates) {
            const current = this.getResourceValue(context.kingdomState, update.resource);
            this.previousValues.set(update.resource, current);
        }
        
        // Apply updates
        const appliedChanges = new Map<string, number>();
        
        for (const update of this.updates) {
            const newValue = this.applyUpdate(context.kingdomState, update);
            const previous = this.previousValues.get(update.resource) || 0;
            appliedChanges.set(update.resource, newValue - previous);
        }
        
        return {
            success: true,
            data: {
                updates: this.updates,
                previousValues: new Map(this.previousValues),
                appliedChanges
            },
            rollback: () => this.rollback(context)
        };
    }
    
    protected validate(): string | null {
        if (!this.updates || this.updates.length === 0) {
            return 'No resource updates provided';
        }
        
        for (const update of this.updates) {
            if (!update.resource) {
                return 'Resource name is required';
            }
            
            if (typeof update.amount !== 'number') {
                return `Invalid amount for ${update.resource}`;
            }
            
            const validOperations = ['set', 'add', 'subtract'];
            if (!validOperations.includes(update.operation)) {
                return `Invalid operation: ${update.operation}`;
            }
        }
        
        return null;
    }
    
    private getResourceValue(state: KingdomState, resource: string): number {
        // Handle special resources
        switch (resource) {
            case 'unrest':
                return state.unrest;
            case 'fame':
                return state.fame;
            case 'imprisonedUnrest':
                return state.imprisonedUnrest || 0;
            default:
                // Regular resources from the map
                return state.resources.get(resource) || 0;
        }
    }
    
    private setResourceValue(state: KingdomState, resource: string, value: number): void {
        const boundedValue = Math.max(0, value);
        
        switch (resource) {
            case 'unrest':
                state.unrest = boundedValue;
                break;
            case 'fame':
                // Fame has a max of 3
                state.fame = Math.min(3, boundedValue);
                break;
            case 'imprisonedUnrest':
                state.imprisonedUnrest = boundedValue;
                break;
            default:
                // Regular resources
                state.resources.set(resource, boundedValue);
                break;
        }
    }
    
    private applyUpdate(state: KingdomState, update: ResourceUpdate): number {
        const current = this.getResourceValue(state, update.resource);
        let newValue: number;
        
        switch (update.operation) {
            case 'set':
                newValue = update.amount;
                break;
            case 'add':
                newValue = current + update.amount;
                break;
            case 'subtract':
                newValue = current - update.amount;
                break;
            default:
                newValue = current;
        }
        
        this.setResourceValue(state, update.resource, newValue);
        return newValue;
    }
    
    private rollback(context: CommandContext): void {
        if (!this.previousValues || this.previousValues.size === 0) {
            console.warn('No previous values available for rollback');
            return;
        }
        
        // Restore all previous values
        for (const [resource, value] of this.previousValues) {
            this.setResourceValue(context.kingdomState, resource, value);
        }
    }
}
