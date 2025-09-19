package kingdom.lite.ui.components

/**
 * Events tab content component
 * Displays kingdom events history and event management
 */
object ContentEvents {
    fun render(): String = """
        <div class="events-content">
            <h3>Kingdom Events</h3>
            <p>No events recorded yet.</p>
            <button class="btn">Roll for Event</button>
        </div>
    """
}
