package at.kmlite.pfrpg2e.kingdom.modifiers.expressions

import at.kmlite.pfrpg2e.takeIfInstance

data class In(val needle: Any?, val haystack: Any) : Expression<Boolean> {
    override fun evaluate(context: ExpressionContext): Boolean {
        val stack = context.evaluateExpression(haystack)
            ?.takeIfInstance<Collection<*>>()
            ?.map { context.evaluateExpression(it) }
            .orEmpty()
        return stack.contains(context.evaluateExpression(needle))
    }
}