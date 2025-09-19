package kingdom.lite.ui.components

import org.w3c.dom.HTMLElement

/**
 * Base interface for all content components
 * Ensures each component can render itself and attach its own event listeners
 */
interface ContentComponent {
    /**
     * Renders the HTML content for this component
     */
    fun render(): String
    
    /**
     * Attaches any event listeners this component needs
     * @param container The HTML element containing this component's rendered content
     */
    fun attachListeners(container: HTMLElement) {
        // Default implementation does nothing
        // Components can override this to attach their specific listeners
    }
}
