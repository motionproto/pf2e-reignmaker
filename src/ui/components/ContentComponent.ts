// Base interface for content components in PF2e Kingdom Lite
// Ensures each component can render itself and attach its own event listeners

/**
 * Base interface for all content components
 * Ensures each component can render itself and attach its own event listeners
 */
export interface ContentComponent {
    /**
     * Renders the HTML content for this component
     */
    render(): string;
    
    /**
     * Attaches any event listeners this component needs
     * @param container The HTML element containing this component's rendered content
     */
    attachListeners?(container: HTMLElement): void;
}
