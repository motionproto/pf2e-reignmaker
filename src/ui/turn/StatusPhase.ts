// Status Phase content for the Kingdom Sheet
// Phase I: Handles gaining Fame and applying ongoing modifiers

import { KingdomState } from '../../models/KingdomState';
import { TurnManager } from '../../models/TurnManager';

/**
 * Status Phase content for the Kingdom Sheet
 * Phase I: Handles gaining Fame and applying ongoing modifiers
 */
export class StatusPhase {
    private static readonly MAX_FAME = 3;
    // Use the same yellow color as in the kingdom name
    private static readonly FAME_COLOR = "#fecb21";
    
    constructor(
        private readonly kingdomState: KingdomState,
        private readonly turnManager: TurnManager
    ) {}
    
    private renderFameStars(currentFame: number): string {
        // Clamp fame to 0-3 range for display safety
        const safeFame = Math.min(Math.max(currentFame, 0), StatusPhase.MAX_FAME);
        
        let html = '<div style="display: flex; gap: 10px; justify-content: center; align-items: center;">';
        
        for (let i = 1; i <= StatusPhase.MAX_FAME; i++) {
            const isFilled = i <= safeFame;
            html += `
                <i class="${isFilled ? 'fas' : 'far'} fa-star" 
                   style="font-size: 48px; 
                          color: ${isFilled ? StatusPhase.FAME_COLOR : '#cccccc'};
                          ${isFilled ? '-webkit-text-stroke: 2px #3d2f00; text-shadow: 0 2px 4px rgba(0,0,0,0.3);' : ''}
                          transition: color 0.3s ease;">
                </i>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    render(): string {
        const fameAtMax = this.kingdomState.fame >= StatusPhase.MAX_FAME;
        
        let html = `
            <div class="phase-step-container">
                <strong>Step 1: Gain Fame</strong> - Earn recognition for kingdom achievements
                <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                    <div style="margin: 15px 0;">
                        ${this.renderFameStars(this.kingdomState.fame)}
                    </div>
        `;
        
        if (fameAtMax) {
            html += `
                <button class="turn-action-button" disabled style="opacity: 0.5; cursor: not-allowed;">
                    <i class="fas fa-star"></i>Fame at Maximum
                </button>
            `;
        } else {
            html += `
                <button class="turn-action-button" onclick="window.executePhaseI()">
                    <i class="fas fa-star"></i>Gain 1 Fame
                </button>
            `;
        }
        
        html += `
                </div>
            </div>
            <div class="phase-step-container">
                <strong>Step 2: Apply Ongoing Modifiers</strong> - Process all active effects and conditions
        `;
        
        if (!this.kingdomState.ongoingModifiers || this.kingdomState.ongoingModifiers.length === 0) {
            html += '<div style="margin-top: 10px; color: #666; font-style: italic;">No ongoing modifiers currently active</div>';
        } else {
            html += '<ul style="margin-top: 10px;">';
            for (const modifier of this.kingdomState.ongoingModifiers) {
                html += `<li><strong>${modifier.name}</strong>: ${modifier.description}`;
                if (modifier.duration > 0) {
                    html += ` (${modifier.remainingTurns} turns remaining)`;
                }
                html += '</li>';
            }
            html += '</ul>';
        }
        
        html += '</div>';
        return html;
    }
}

// Register a simpler function for Phase I execution
export function initPhaseHandlers(): void {
    (window as any).executePhaseI = () => {
        const state = (window as any).currentKingdomState as KingdomState | null;
        const manager = (window as any).currentTurnManager as TurnManager | null;
        
        if (state != null && manager != null) {
            manager.executeCurrentPhase();
            // Update the display
            const contentArea = document.querySelector('.phase-content');
            if (contentArea != null) {
                const phase = new StatusPhase(state, manager);
                contentArea.innerHTML = phase.render();
            }
        }
    };
}
