package kingdom.lite.ui.components

import org.w3c.dom.HTMLElement

/**
 * Factions content component
 * Manages faction relationships and interactions
 */
object ContentFactions : ContentComponent {
    override fun render(): String = """
        <div class="factions-content">
            <h3>Factions</h3>
            <p>No factions encountered yet.</p>
        </div>
    """
    
    override fun attachListeners(container: HTMLElement) {
        // Factions will have its own interactions here in the future
        // For now, no specific listeners needed
    }
}
