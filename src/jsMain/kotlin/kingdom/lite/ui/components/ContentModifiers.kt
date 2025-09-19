package kingdom.lite.ui.components

import org.w3c.dom.HTMLElement

/**
 * Modifiers content component
 * Displays and manages kingdom modifiers, bonuses, and penalties
 */
object ContentModifiers : ContentComponent {
    override fun render(): String = """
        <div class="modifiers-content">
            <h3>Kingdom Modifiers</h3>
            <p>No active modifiers.</p>
        </div>
    """
    
    override fun attachListeners(container: HTMLElement) {
        // Modifiers will have its own interactions here in the future
        // For now, no specific listeners needed
    }
}
