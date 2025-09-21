// Settlements content component for PF2e Kingdom Lite
// Manages settlements, buildings, and urban development

import { ContentComponent } from './ContentComponent';

/**
 * Settlements content component
 * Manages settlements, buildings, and urban development
 */
export class ContentSettlements implements ContentComponent {
    render(): string {
        return `
            <div class="settlements-content">
                <h3>Settlements</h3>
                <p>No settlements established yet.</p>
            </div>
        `;
    }
    
    attachListeners(container: HTMLElement): void {
        // Settlements will have its own buttons and interactions here in the future
        // For now, no specific listeners needed
    }
}
