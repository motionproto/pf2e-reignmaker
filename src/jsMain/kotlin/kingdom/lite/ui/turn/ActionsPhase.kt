package kingdom.lite.ui.turn

import kingdom.lite.ui.components.ActionListItem
import kingdom.lite.model.PlayerActionsData
import kingdom.lite.model.PlayerAction

/**
 * Actions Phase content for the Kingdom Sheet
 * Handles all kingdom actions that players can perform during their turn
 */
object ActionsPhase {
    init {
        // Initialize event handlers when module loads
        js("""
            if (typeof window !== 'undefined') {
                window.initActionHandlers = function() {
                    if (window.actionsPhaseListenersAttached) return;
                    window.actionsPhaseListenersAttached = true;
                    
                    console.log('Initializing action handlers from Kotlin');
                    
                    document.addEventListener('click', function(e) {
                        var toggleable = e.target.closest('.action-toggleable');
                        if (toggleable) {
                            console.log('Toggle clicked');
                            e.preventDefault();
                            
                            var itemId = toggleable.getAttribute('data-item-id');
                            if (itemId) {
                                var item = document.getElementById(itemId);
                                if (item) {
                                    var expandedContent = item.querySelector('.action-expanded-content');
                                    var chevron = item.querySelector('.fa-chevron-right, .fa-chevron-down');
                                    
                                    if (expandedContent) {
                                        if (expandedContent.style.display === 'none' || expandedContent.style.display === '') {
                                            expandedContent.style.display = 'block';
                                            if (chevron) chevron.className = 'fas fa-chevron-down';
                                        } else {
                                            expandedContent.style.display = 'none';
                                            if (chevron) chevron.className = 'fas fa-chevron-right';
                                        }
                                    }
                                }
                            }
                        }
                        
                        var skillBtn = e.target.closest('.skill-perform-btn');
                        if (skillBtn) {
                            e.preventDefault();
                            var actionId = skillBtn.getAttribute('data-action-id');
                            var skillName = skillBtn.getAttribute('data-skill-name');
                            console.log('Skill button clicked:', actionId, skillName);
                            
                            var selector = '[data-action-id="' + actionId + '"] .action-title-line strong';
                            var actionElement = document.querySelector(selector);
                            if (actionElement) {
                                alert('Performing: ' + actionElement.textContent + '\nUsing skill: ' + skillName);
                            }
                        }
                    });
                };
                
                // Try to init immediately and after DOM ready
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    window.initActionHandlers();
                } else {
                    document.addEventListener('DOMContentLoaded', window.initActionHandlers);
                }
            }
        """)
    }
    
    fun render(): String = buildString {
        append("""
            <div class="phase-step-container">
                <strong>Perform Kingdom Actions (4 PC actions total)</strong>
            </div>
            
            <div class="actions-phase-content" id="kingdom-actions-content">
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
                // Call init function if it exists
                if (typeof window.initActionHandlers === 'function') {
                    setTimeout(function() { window.initActionHandlers(); }, 0);
                }
            </script>
        """)
    }
    
    private fun renderCategory(categoryId: String, actions: List<PlayerAction>): String = buildString {
        val categoryName = PlayerActionsData.categoryNames[categoryId] ?: categoryId
        val categoryDesc = PlayerActionsData.categoryDescriptions[categoryId] ?: ""
        
        append("""
            <div class="phase-step-container">
                <h4>$categoryName</h4>
                <p class="category-desc">$categoryDesc</p>
                <ul>
        """)
        
        // Render each action as a list item
        actions.forEach { action ->
            val item = ActionListItem(action)
            append(item.render(false))
        }
        
        append("""
                </ul>
            </div>
        """)
    }
    
}
