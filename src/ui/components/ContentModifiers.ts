// Modifiers content component for PF2e Kingdom Lite
// Displays and manages kingdom modifiers, bonuses, and penalties

import { ContentComponent } from './ContentComponent';

/**
 * Modifiers content component
 * Displays and manages kingdom modifiers, bonuses, and penalties
 */
export class ContentModifiers implements ContentComponent {
    render(): string {
        return `
            <div class="modifiers-content">
                <h3>Kingdom Modifiers</h3>
                <p>No active modifiers.</p>
            </div>
        `;
    }
    
    attachListeners(container: HTMLElement): void {
        // Modifiers will have its own interactions here in the future
        // For now, no specific listeners needed
    }
}
