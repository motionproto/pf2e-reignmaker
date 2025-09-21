// Auto-converted from ResolutionPhase.kt
// TODO: Review and fix TypeScript-specific issues


/**
 * Resolution Phase content for the Kingdom Sheet
 * Handles end of turn resolution and advancing to the next turn
 */
export const ResolutionPhase = {
    render(): string = buildString {
        append("""
            <div class="phase-step-container">
                <strong>End of Turn Resolution</strong>
            </div>
            <div class="phase-step-container">
                Resolve any end-of-turn effects
            </div>
            <div class="phase-step-container">
                Update kingdom statistics
            </div>
            <div class="phase-step-container">
                Check for victory or defeat conditions
            </div>
            <div class="phase-step-container">
                Advance to next kingdom turn
            </div>
        """)
    }
}
