package kingdom.lite.ui.turn

import kingdom.lite.ui.components.ActionCard
import kingdom.lite.model.PlayerActionsData
import kingdom.lite.model.PlayerAction

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
            
            <div class="actions-phase-content">
        """)
        
        // Render categories in order with their actions
        val categories = listOf(
            "uphold-stability",
            "military-operations", 
            "expand-borders",
            "urban-planning",
            "foreign-affairs",
            "economic-actions"
        )
        
        categories.forEach { category ->
            val categoryActions = PlayerActionsData.getActionsByCategory(category)
            if (categoryActions.isNotEmpty()) {
                append(renderCategory(category, categoryActions))
            }
        }
        
        append("""
            </div>
            
            <script>
                // Setup action card handlers when the phase loads
                if (typeof toggleActionCard === 'undefined') {
                    ${getActionHandlerScript()}
                }
            </script>
        """)
    }
    
    private fun renderCategory(categoryId: String, actions: List<PlayerAction>): String = buildString {
        val categoryName = PlayerActionsData.categoryNames[categoryId] ?: categoryId
        val categoryDesc = PlayerActionsData.categoryDescriptions[categoryId] ?: ""
        
        append("""
            <div class="action-category">
                <div class="action-category-header">
                    <div class="action-category-title">$categoryName</div>
                    <div class="action-category-desc">$categoryDesc</div>
                </div>
                <div class="action-category-list">
        """)
        
        // Render each action as an ActionCard
        actions.forEach { action ->
            val card = ActionCard(action)
            append(card.render(false))
        }
        
        append("""
                </div>
            </div>
        """)
    }
    
    private fun getActionHandlerScript(): String = """
        // Toggle action card expand/collapse
        window.toggleActionCard = function(cardId) {
            const card = document.getElementById(cardId);
            if (card) {
                const isExpanded = card.classList.contains('expanded');
                
                if (isExpanded) {
                    card.classList.remove('expanded');
                    // Update chevron
                    const chevron = card.querySelector('.action-chevron i');
                    if (chevron) chevron.className = 'fas fa-chevron-right';
                    // Hide details
                    const details = card.querySelector('.action-details');
                    if (details) details.style.display = 'none';
                } else {
                    card.classList.add('expanded');
                    // Update chevron
                    const chevron = card.querySelector('.action-chevron i');
                    if (chevron) chevron.className = 'fas fa-chevron-down';
                    // Show details
                    const details = card.querySelector('.action-details');
                    if (details) details.style.display = 'block';
                }
            }
        };
        
        // Perform action handler
        window.performAction = function(actionId) {
            console.log('Performing action:', actionId);
            
            if (actionId === 'build-structure') {
                // Special handling for Build Structure action
                showBuildStructureDialog();
            } else {
                // TODO: Connect to actual game logic for other actions
                const actionName = document.querySelector(`[data-action-id="${'$'}{actionId}"] .action-title`).textContent;
                alert(`Performing: ${'$'}{actionName}\\n\\nThis will be connected to the game logic.`);
            }
        };
        
        // Show build structure dialog
        window.showBuildStructureDialog = function() {
            // Check if we have settlements
            const settlementCount = window.kingdomState?.settlements?.length || 0;
            
            if (settlementCount === 0) {
                alert('You need at least one settlement to build structures.');
                return;
            }
            
            if (settlementCount === 1) {
                // Only one settlement, open picker directly
                const settlementName = window.kingdomState.settlements[0].name;
                const picker = document.getElementById('structure-picker-' + settlementName);
                if (picker) {
                    picker.style.display = 'flex';
                } else {
                    alert('Structure picker not available. Please ensure you are in the correct phase.');
                }
            } else {
                // Multiple settlements, show selection dialog
                showSettlementSelector();
            }
        };
        
        // Show settlement selector for multiple settlements
        window.showSettlementSelector = function() {
            // TODO: Implement settlement selector dialog
            alert('Please select a settlement (UI for multiple settlements coming soon)');
        };
    """
}
