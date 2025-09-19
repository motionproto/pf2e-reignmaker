package kingdom.lite.ui.turn

/**
 * Actions Phase content for the Kingdom Sheet
 * Handles all kingdom actions that players can perform during their turn
 */
object ActionsPhase {
    fun render(): String = buildString {
        append("""
            <div class="phase-step-container">
                <strong>Perform Kingdom Actions (4 PC actions total)</strong>
            </div>
            
            ${renderUpholdStability()}
            ${renderMilitaryOperations()}
            ${renderExpandBorders()}
            ${renderUrbanPlanning()}
            ${renderForeignAffairs()}
            ${renderEconomicActions()}
        """)
    }
    
    private fun renderUpholdStability(): String = """
        <div class="phase-step-container">
            <h4>Uphold Stability</h4>
            <p class="category-desc">Maintain the kingdom's cohesion by resolving crises and quelling unrest.</p>
            <ul>
                <li><strong>Coordinated Effort:</strong> Two PCs work together on a single action with a bonus</li>
                <li><strong>Resolve a Kingdom Event:</strong> Rise to meet disasters, uprisings, or opportunities</li>
                <li><strong>Arrest Dissidents:</strong> Convert unrest into imprisoned unrest</li>
                <li><strong>Execute or Pardon Prisoners:</strong> Deal with imprisoned unrest through justice</li>
                <li><strong>Deal with Unrest:</strong> Directly reduce unrest by 1-3 based on success</li>
            </ul>
        </div>
    """
    
    private fun renderMilitaryOperations(): String = """
        <div class="phase-step-container">
            <h4>Military Operations</h4>
            <p class="category-desc">War must be waged with steel and strategy.</p>
            <ul>
                <li><strong>Recruit a Unit:</strong> Raise new troops for your armies</li>
                <li><strong>Outfit Army:</strong> Equip troops with armor, weapons, runes, or equipment</li>
                <li><strong>Deploy Army:</strong> Move troops to strategic positions</li>
                <li><strong>Recover Army:</strong> Heal and restore damaged units</li>
                <li><strong>Train Army:</strong> Improve unit levels up to party level</li>
                <li><strong>Disband Army:</strong> Decommission troops and return soldiers home</li>
            </ul>
        </div>
    """
    
    private fun renderExpandBorders(): String = """
        <div class="phase-step-container">
            <h4>Expand the Borders</h4>
            <p class="category-desc">Seize new territory to grow your influence and resources.</p>
            <ul>
                <li><strong>Claim Hexes:</strong> Add new territory to your kingdom</li>
                <li><strong>Build Roads:</strong> Connect your territory with infrastructure</li>
                <li><strong>Send Scouts:</strong> Learn about unexplored hexes</li>
                <li><strong>Fortify Hex:</strong> Strengthen defensive positions</li>
                <li><strong>Create Worksite:</strong> Establish farms, mines, quarries, or lumber camps</li>
            </ul>
        </div>
    """
    
    private fun renderUrbanPlanning(): String = """
        <div class="phase-step-container">
            <h4>Urban Planning</h4>
            <p class="category-desc">Your people need places to live, work, trade, and worship.</p>
            <ul>
                <li><strong>Establish a Settlement:</strong> Found a new village</li>
                <li><strong>Upgrade a Settlement:</strong> Advance settlement tiers</li>
                <li><strong>Build Structure:</strong> Add markets, temples, barracks, and other structures</li>
                <li><strong>Repair Structure:</strong> Fix damaged structures</li>
            </ul>
        </div>
    """
    
    private fun renderForeignAffairs(): String = """
        <div class="phase-step-container">
            <h4>Foreign Affairs</h4>
            <p class="category-desc">No kingdom stands alone.</p>
            <ul>
                <li><strong>Establish Diplomatic Relations:</strong> Form alliances with other nations</li>
                <li><strong>Request Economic Aid:</strong> Ask allies for resources or gold</li>
                <li><strong>Request Military Aid:</strong> Call for allied troops in battle</li>
                <li><strong>Infiltration:</strong> Gather intelligence through espionage</li>
                <li><strong>Hire Adventurers:</strong> Pay gold to resolve events (2 Gold cost)</li>
            </ul>
        </div>
    """
    
    private fun renderEconomicActions(): String = """
        <div class="phase-step-container">
            <h4>Economic Actions</h4>
            <p class="category-desc">Manage trade and personal wealth.</p>
            <ul>
                <li><strong>Sell Surplus:</strong> Trade resources for gold</li>
                <li><strong>Purchase Resources:</strong> Spend gold for resources</li>
                <li><strong>Create Worksite:</strong> Establish resource extraction sites</li>
                <li><strong>Collect Resources:</strong> Gather from hexes with or without worksites</li>
                <li><strong>Collect Stipend:</strong> Extract personal income (requires Counting House)</li>
            </ul>
        </div>
    """
}
