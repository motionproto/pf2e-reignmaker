package kingdom.lite.ui.components

/**
 * Kingdom Statistics sidebar component
 * Displays the core kingdom statistics including Fame, Unrest, Gold, Resources, etc.
 */
object KingdomStats {
    fun render(): String = buildString {
        append("""
            <div class="kingdom-stats">
                <h3>Kingdom Statistics</h3>
                
                ${renderCoreTrackers()}
                ${renderKingdomSize()}
                ${renderResources()}
                ${renderQuickSummary()}
            </div>
        """)
    }
    
    private fun renderCoreTrackers(): String = """
        <div class="stat-group">
            <h4>Core Trackers</h4>
            <div class="stat-item">
                <label>Fame:</label>
                <span class="stat-value">
                    <span class="fame-boxes">
                        <i class="far fa-square"></i>
                        <i class="far fa-square"></i>
                        <i class="far fa-square"></i>
                    </span>
                </span>
            </div>
            <div class="stat-item">
                <label>Unrest:</label>
                <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
                <label>Gold:</label>
                <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
                <label>Event DC:</label>
                <span class="stat-value">14</span>
            </div>
            <div class="stat-item">
                <label>War Status:</label>
                <span class="stat-value">Peace</span>
            </div>
        </div>
    """
    
    private fun renderKingdomSize(): String = """
        <div class="stat-group">
            <h4>Kingdom Size</h4>
            <div class="stat-item">
                <label>Hexes Claimed:</label>
                <span class="stat-value">1</span>
            </div>
            <div class="stat-item">
                <label>Unrest from Size:</label>
                <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
                <label>Metropolises:</label>
                <span class="stat-value">0</span>
            </div>
        </div>
    """
    
    private fun renderResources(): String = """
        <div class="stat-group">
            <h4>Resources</h4>
            <div class="resource-section">
                <div class="resource-header">Food</div>
                <div class="stat-item">
                    <label>On Hand:</label>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <label>Capacity:</label>
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-item">
                    <label>Production:</label>
                    <span class="stat-value">0/turn</span>
                </div>
                <div class="stat-item">
                    <label>Consumption:</label>
                    <span class="stat-value">0/turn</span>
                </div>
                <div class="stat-item">
                    <label>Net:</label>
                    <span class="stat-value">0</span>
                </div>
            </div>
            <div class="resource-section">
                <div class="resource-header">Trade Resources</div>
                <div class="resource-grid">
                    <div class="resource-item">
                        <label>Lumber:</label>
                        <span>0</span>
                    </div>
                    <div class="resource-item">
                        <label>Stone:</label>
                        <span>0</span>
                    </div>
                    <div class="resource-item">
                        <label>Ore:</label>
                        <span>0</span>
                    </div>
                </div>
            </div>
        </div>
    """
    
    private fun renderQuickSummary(): String = """
        <div class="stat-group">
            <h4>Quick Summary</h4>
            <div class="stat-item">
                <label>Settlements:</label>
                <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
                <label>Worksites:</label>
                <span class="stat-value">0</span>
            </div>
            <div class="stat-item">
                <label>Armies:</label>
                <span class="stat-value">0</span>
            </div>
        </div>
    """
}
