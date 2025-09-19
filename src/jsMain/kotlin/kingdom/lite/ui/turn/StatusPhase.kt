package kingdom.lite.ui.turn

/**
 * Status Phase content for the Kingdom Sheet
 * Handles Step 1: Gain Fame and Step 2: Apply Ongoing Modifiers
 */
object StatusPhase {
    fun render(): String = buildString {
        append("""
            <div class="phase-step-container">
                <strong>Step 1: Gain Fame</strong> - Earn recognition for kingdom achievements
            </div>
            <div class="phase-step-container">
                <strong>Step 2: Apply Ongoing Modifiers</strong> - Process all active effects and conditions
            </div>
        """)
    }
}
