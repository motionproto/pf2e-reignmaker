// Content selector component for PF2e Kingdom Lite
// Manages switching between different content views

import { ContentComponent } from './ContentComponent';

/**
 * Content selector component
 * Provides buttons to switch between different kingdom management views
 */
export class ContentSelector implements ContentComponent {
    private onContentSwitch: (contentId: string) => void;
    
    constructor(onContentSwitch: (contentId: string) => void) {
        this.onContentSwitch = onContentSwitch;
    }
    
    render(): string {
        return `
            <div class="content-selector">
                <button data-content="turn" class="active">Turn</button>
                <button data-content="settlements">Settlements</button>
                <button data-content="factions">Factions</button>
                <button data-content="modifiers">Modifiers</button>
                <button data-content="notes">Notes</button>
                <button data-content="settings">Settings</button>
            </div>
        `;
    }
    
    attachListeners(container: HTMLElement): void {
        const buttons = container.querySelectorAll('.content-selector button');
        buttons.forEach(button => {
            button.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;
                const contentId = target.getAttribute('data-content');
                
                // Update active button
                buttons.forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                
                // Switch content
                if (contentId && this.onContentSwitch) {
                    this.onContentSwitch(contentId);
                }
            });
        });
    }
}
