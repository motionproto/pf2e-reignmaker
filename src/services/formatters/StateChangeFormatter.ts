/**
 * StateChangeFormatter - Handles formatting of state changes for display
 * 
 * This service provides consistent formatting of resource changes,
 * state updates, and other game mechanics for UI display.
 */

export type ChangeType = 'positive' | 'negative' | 'neutral';

export interface FormattedStateChange {
    label: string;
    value: string;
    type: ChangeType;
    icon?: string;
}

export class StateChangeFormatter {
    /**
     * Format a state change label for display
     */
    formatLabel(key: string): string {
        const labels: Record<string, string> = {
            'gold': 'Gold',
            'unrest': 'Unrest',
            'fame': 'Fame',
            'food': 'Food',
            'wood': 'Wood',
            'lumber': 'Lumber',
            'stone': 'Stone',
            'metal': 'Metal',
            'ore': 'Ore',
            'luxuries': 'Luxuries',
            'resources': 'Resources',
            'hexesClaimed': 'Hexes Claimed',
            'structuresBuilt': 'Structures Built',
            'roadsBuilt': 'Roads Built',
            'armyRecruited': 'Army Recruited',
            'structureCostReduction': 'Structure Cost',
            'imprisonedUnrest': 'Imprisoned Unrest',
            'imprisonedUnrestRemoved': 'Prisoners Released',
            'settlementFounded': 'Settlement Founded',
            'armyLevel': 'Army Level',
            'armyMorale': 'Army Morale',
            'armyCapacity': 'Army Capacity',
            'meta': 'Next Action Bonus',
            'currentUnrest': 'Current Unrest',
            'infamy': 'Infamy'
        };
        
        return labels[key] || this.humanizeKey(key);
    }
    
    /**
     * Convert camelCase key to human-readable format
     */
    private humanizeKey(key: string): string {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    
    /**
     * Format a state change value for display
     */
    formatValue(value: any): string {
        if (value === null || value === undefined) {
            return '—';
        }
        
        if (typeof value === 'number') {
            return value > 0 ? `+${value}` : `${value}`;
        }
        
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        
        if (typeof value === 'object' && value !== null) {
            // Handle meta object for coordinated action
            if ('nextActionBonus' in value) {
                const bonus = value.nextActionBonus;
                return bonus > 0 ? `+${bonus}` : `${bonus}`;
            }
            
            // Handle from/to changes
            if ('from' in value && 'to' in value) {
                return `${value.from} → ${value.to}`;
            }
            
            // Handle added/removed
            if ('added' in value) {
                return `+${value.added}`;
            }
            if ('removed' in value) {
                return `-${value.removed}`;
            }
        }
        
        return String(value);
    }
    
    /**
     * Determine the type of change (positive/negative/neutral)
     */
    getChangeType(value: any, key: string): ChangeType {
        // Context-aware determination based on the key
        const negativeBenefitKeys = [
            'unrest', 'cost', 'damage', 'imprisoned',
            'penalty', 'shortage', 'infamy'
        ];
        
        const isNegativeBenefit = negativeBenefitKeys.some(
            k => key.toLowerCase().includes(k)
        );
        
        if (typeof value === 'number') {
            if (isNegativeBenefit) {
                // For things like unrest, negative is good
                return value < 0 ? 'positive' : value > 0 ? 'negative' : 'neutral';
            }
            // For most resources, positive is good
            return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
        }
        
        if (typeof value === 'boolean') {
            // Boolean true is generally positive unless it's a negative thing
            if (isNegativeBenefit) {
                return value ? 'negative' : 'neutral';
            }
            return value ? 'positive' : 'neutral';
        }
        
        if (typeof value === 'string') {
            if (value.includes('+') || value.includes('extra') || value.includes('double')) {
                return 'positive';
            }
            if (value.includes('half') || value.includes('50%')) {
                return key && key.includes('Cost') ? 'positive' : 'neutral';
            }
            if (value === 'all' || value === '1d4') {
                return key && key.includes('Removed') ? 'positive' : 'neutral';
            }
        }
        
        if (typeof value === 'object' && value !== null) {
            // Handle meta object for coordinated action
            if ('nextActionBonus' in value) {
                const bonus = value.nextActionBonus;
                return bonus > 0 ? 'positive' : bonus < 0 ? 'negative' : 'neutral';
            }
            if ('to' in value && 'from' in value) {
                return value.to > value.from ? 'positive' : 
                       value.to < value.from ? 'negative' : 'neutral';
            }
            if ('added' in value) return 'positive';
            if ('removed' in value) return 'negative';
        }
        
        return 'neutral';
    }
    
    /**
     * Get an icon for a resource or state type
     */
    getIcon(key: string): string {
        const icons: Record<string, string> = {
            'gold': 'fas fa-coins',
            'unrest': 'fas fa-fire',
            'fame': 'fas fa-star',
            'infamy': 'fas fa-skull',
            'food': 'fas fa-wheat-awn',
            'lumber': 'fas fa-tree',
            'wood': 'fas fa-tree',
            'stone': 'fas fa-cube',
            'ore': 'fas fa-gem',
            'metal': 'fas fa-hammer',
            'luxuries': 'fas fa-crown',
            'resources': 'fas fa-boxes-stacked',
            'hexesClaimed': 'fas fa-map-marked-alt',
            'structuresBuilt': 'fas fa-building',
            'roadsBuilt': 'fas fa-road',
            'armyRecruited': 'fas fa-shield-halved',
            'armyLevel': 'fas fa-ranking-star',
            'armyMorale': 'fas fa-heart',
            'armyCapacity': 'fas fa-users',
            'imprisonedUnrest': 'fas fa-lock',
            'settlementFounded': 'fas fa-city',
            'meta': 'fas fa-plus-circle'
        };
        
        return icons[key] || 'fas fa-circle';
    }
    
    /**
     * Format a complete state change for display
     */
    formatStateChange(key: string, value: any): FormattedStateChange {
        return {
            label: this.formatLabel(key),
            value: this.formatValue(value),
            type: this.getChangeType(value, key),
            icon: this.getIcon(key)
        };
    }
    
    /**
     * Format multiple state changes
     */
    formatStateChanges(changes: Map<string, any> | Record<string, any>): FormattedStateChange[] {
        const formatted: FormattedStateChange[] = [];
        
        const entries = changes instanceof Map 
            ? Array.from(changes.entries())
            : Object.entries(changes);
        
        for (const [key, value] of entries) {
            if (value !== undefined && value !== null) {
                formatted.push(this.formatStateChange(key, value));
            }
        }
        
        return formatted;
    }
    
    /**
     * Format resource list for display
     */
    formatResourceList(resources: Map<string, number>): string[] {
        const formatted: string[] = [];
        
        for (const [resource, amount] of resources) {
            if (amount !== 0) {
                const label = this.formatLabel(resource);
                const value = this.formatValue(amount);
                formatted.push(`${value} ${label}`);
            }
        }
        
        return formatted;
    }
    
    /**
     * Format a duration for display
     */
    formatDuration(duration: number | string): string {
        if (typeof duration === 'number') {
            return duration === 1 ? '1 turn' : `${duration} turns`;
        }
        
        switch (duration) {
            case 'permanent':
                return 'Permanent';
            case 'until-resolved':
                return 'Until Resolved';
            case 'until-cancelled':
                return 'Until Cancelled';
            default:
                return String(duration);
        }
    }
    
    /**
     * Format a modifier severity for display
     */
    formatSeverity(severity: string): { label: string; className: string } {
        const severityMap: Record<string, { label: string; className: string }> = {
            'beneficial': { label: 'Beneficial', className: 'severity-beneficial' },
            'neutral': { label: 'Neutral', className: 'severity-neutral' },
            'dangerous': { label: 'Dangerous', className: 'severity-dangerous' },
            'critical': { label: 'Critical', className: 'severity-critical' }
        };
        
        return severityMap[severity] || { label: severity, className: 'severity-neutral' };
    }
    
    /**
     * Format outcome type for display
     */
    formatOutcome(outcome: string): { label: string; className: string; icon: string } {
        const outcomes: Record<string, { label: string; className: string; icon: string }> = {
            'criticalSuccess': {
                label: 'Critical Success',
                className: 'outcome-critical-success',
                icon: 'fas fa-trophy'
            },
            'success': {
                label: 'Success',
                className: 'outcome-success',
                icon: 'fas fa-check-circle'
            },
            'failure': {
                label: 'Failure',
                className: 'outcome-failure',
                icon: 'fas fa-times-circle'
            },
            'criticalFailure': {
                label: 'Critical Failure',
                className: 'outcome-critical-failure',
                icon: 'fas fa-skull'
            }
        };
        
        return outcomes[outcome] || {
            label: outcome,
            className: 'outcome-neutral',
            icon: 'fas fa-circle'
        };
    }
}

// Export singleton instance
export const stateChangeFormatter = new StateChangeFormatter();
