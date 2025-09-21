// Notes content component for PF2e Kingdom Lite
// Manages kingdom notes, journal entries, and custom annotations

import { ContentComponent } from './ContentComponent';

/**
 * Notes content component
 * Manages kingdom notes, journal entries, and custom annotations
 */
export class ContentNotes implements ContentComponent {
    private notesContent: string = "";
    
    render(): string {
        return `
            <div class="notes-content">
                <h3>Kingdom Notes</h3>
                <div class="notes-editor">
                    <textarea class="notes-textarea" placeholder="Enter your kingdom notes here...">${this.notesContent}</textarea>
                </div>
            </div>
        `;
    }
    
    attachListeners(container: HTMLElement): void {
        // Attach listener to save notes as they're typed
        const textarea = container.querySelector(".notes-textarea") as HTMLTextAreaElement | null;
        if (textarea) {
            textarea.addEventListener("input", () => {
                this.notesContent = textarea.value;
                // In a real implementation, you might want to save this to local storage or the Foundry database
            });
        }
    }
}
