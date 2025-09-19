package kingdom.lite.ui.components

import org.w3c.dom.HTMLElement
import org.w3c.dom.HTMLTextAreaElement

/**
 * Notes content component
 * Manages kingdom notes, journal entries, and custom annotations
 */
object ContentNotes : ContentComponent {
    private var notesContent: String = ""
    
    override fun render(): String = """
        <div class="notes-content">
            <h3>Kingdom Notes</h3>
            <div class="notes-editor">
                <textarea class="notes-textarea" placeholder="Enter your kingdom notes here...">${notesContent}</textarea>
            </div>
        </div>
    """
    
    override fun attachListeners(container: HTMLElement) {
        // Attach listener to save notes as they're typed
        val textarea = container.querySelector(".notes-textarea") as? HTMLTextAreaElement
        textarea?.addEventListener("input", {
            notesContent = textarea.value
            // In a real implementation, you might want to save this to local storage or the Foundry database
        })
    }
}
