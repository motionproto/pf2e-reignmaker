// Auto-converted and fixed from ActionListItem.kt
// Simple expandable list item component for displaying player actions

import type { PlayerAction, SkillOption, ActionEffect } from '../../models/PlayerActions';

/**
 * Simple expandable list item component for displaying player actions
 */
export class ActionListItem {
    private readonly itemId: string;
    
    constructor(
        private readonly action: PlayerAction,
        private readonly onPerform?: (action: PlayerAction) => void
    ) {
        this.itemId = `action-item-${action.id}-${Date.now()}`;
    }
    
    render(isExpanded?: boolean): string {
        let result = '';
        result += `
            <li class="action-list-item" id="${this.itemId}" data-action-id="${this.action.id}" style="list-style: none; margin-bottom: 4px;">
                <div class="action-header-row action-toggleable" data-item-id="${this.itemId}" style="cursor: pointer;">
                    <span class="action-title-line">
                        <i class="fas fa-chevron-${isExpanded ? "down" : "right"}" style="font-size: 10px; margin-right: 6px; color: #8B4513;"></i>
                        <strong>${this.action.name}:</strong> ${this.action.description}
                    </span>
                </div>
                
                <div class="action-expanded-content" style="display: ${isExpanded ? "block" : "none"}">
                    <div class="action-full-description">
                        ${this.action.description}
                    </div>
                    
                    ${this.action.skills && this.action.skills.length > 0 ? this.renderSkills() : ""}
                    
                    <div class="action-outcomes">
                        <strong>Outcomes:</strong>
                        <table class="outcomes-table">
                            ${this.renderOutcomesTable()}
                        </table>
                    </div>
                    
                    ${this.renderSpecialConditions()}
                </div>
            </li>
        `;
        return result;
    }
    
    private renderSkills(): string {
        let result = '';
        result += `
            <div class="action-skills-section">
                <strong>Skills:</strong>
                <div class="skills-button-list">
        `;
        
        this.action.skills.forEach((skill) => {
            result += `
                <div class="skill-item">
                    <button class="skill-perform-btn" data-action-id="${this.action.id}" data-skill-name="${skill.skill}">
                        ${skill.skill}
                    </button>
                    <span class="skill-desc">- ${skill.description}</span>
                </div>
            `;
        });
        
        result += `
                </div>
            </div>
        `;
        
        return result;
    }
    
    private renderOutcomesTable(): string {
        let result = '';
        
        // Critical Success
        if (this.action.criticalSuccess.description && 
            this.action.criticalSuccess.description !== this.action.success.description) {
            result += `
                <tr>
                    <td class="outcome-level critical-success">Critical Success</td>
                    <td>${this.action.criticalSuccess.description}</td>
                </tr>
            `;
        }
        
        // Success
        result += `
            <tr>
                <td class="outcome-level success">Success</td>
                <td>${this.action.success.description}</td>
            </tr>
        `;
        
        // Failure
        result += `
            <tr>
                <td class="outcome-level failure">Failure</td>
                <td>${this.action.failure.description}</td>
            </tr>
        `;
        
        // Critical Failure
        if (this.action.criticalFailure.description && 
            this.action.criticalFailure.description !== this.action.failure.description) {
            result += `
                <tr>
                    <td class="outcome-level critical-failure">Critical Failure</td>
                    <td>${this.action.criticalFailure.description}</td>
                </tr>
            `;
        }
        
        return result;
    }
    
    private renderSpecialConditions(): string {
        let result = '';
        
        // Special conditions
        if (this.action.special) {
            result += `
                <div class="action-special-conditions">
                    <strong>Special:</strong> ${this.action.special}
                </div>
            `;
        }
        
        // Proficiency scaling
        if (this.action.proficiencyScaling) {
            result += `
                <div class="action-proficiency">
                    <strong>Proficiency Scaling:</strong>
                    <span class="proficiency-values">
            `;
            
            const scaling: string[] = [];
            this.action.proficiencyScaling.forEach((value, level) => {
                scaling.push(`${level.charAt(0).toUpperCase() + level.slice(1)}: ${value} hexes`);
            });
            
            result += scaling.join(', ');
            result += `
                    </span>
                </div>
            `;
        }
        
        // Cost if any
        if (this.action.cost) {
            result += `
                <div class="action-cost">
                    <strong>Cost:</strong>
            `;
            
            const costs: string[] = [];
            this.action.cost.forEach((amount, resource) => {
                costs.push(`${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`);
            });
            
            result += costs.join(', ');
            result += `
                </div>
            `;
        }
        
        return result;
    }
}
