package kingdom.lite.ui.components

import org.w3c.dom.HTMLElement

/**
 * Settlements content component
 * Manages settlements, buildings, and urban development
 */
object ContentSettlements : ContentComponent {
    override fun render(): String = """
        <div class="settlements-content">
            <h3>Settlements</h3>
            <p>No settlements established yet.</p>
        </div>
    """
    
    override fun attachListeners(container: HTMLElement) {
        // Settlements will have its own buttons and interactions here in the future
        // For now, no specific listeners needed
    }
}
