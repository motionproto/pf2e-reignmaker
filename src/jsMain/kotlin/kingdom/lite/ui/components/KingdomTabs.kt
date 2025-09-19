package kingdom.lite.ui.components

/**
 * Tab navigation component for the Kingdom Sheet
 * Manages the main navigation tabs at the top of the sheet
 */
object KingdomTabs {
    data class Tab(val id: String, val label: String)
    
    val tabs = listOf(
        Tab("turn", "Turn"),
        Tab("factions", "Factions"),
        Tab("events", "Events")
    )
    
    fun render(activeTab: String): String = buildString {
        append("""<nav class="kingdom-tabs">""")
        tabs.forEach { tab ->
            val activeClass = if (tab.id == activeTab) "active" else ""
            append("""
                <button class="kingdom-tab $activeClass" data-tab="${tab.id}">
                    ${tab.label}
                </button>
            """)
        }
        append("""</nav>""")
    }
}
