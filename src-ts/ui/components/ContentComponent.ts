// Auto-converted from ContentComponent.kt
// TODO: Review and fix TypeScript-specific issues


// TODO: Review import - import org.w3c.dom.HTMLElement

/**
 * Base interface for all content components
 * Ensures each component can render itself and attach its own event listeners
 */
interface ContentComponent {
    /**
     * Renders the HTML content for this component
     */
    render(): string
    
    /**
     * Attaches any event listeners this component needs
     *  container The HTML element containing this component's rendered content
     */
    function attachListeners(container: HTMLElement {
        // Default implementation does nothing
        // Components can this to attach their specific listeners
    ) }
}
