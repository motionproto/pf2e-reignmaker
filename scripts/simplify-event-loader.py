#!/usr/bin/env python3
"""
Simplify event-loader.ts to remove references to deleted fields.
The new simplified approach:
- No 'name' field (use getEventDisplayName)
- No 'ifUnresolved' logic (just apply failure effect)
- No 'modifier' field (use level-based DCs)
"""

import re

# Read the current file
with open('src/controllers/events/event-loader.ts', 'r') as f:
    content = f.read()

# Remove UnresolvedEvent interface (no longer used)
content = re.sub(
    r'/\*\*\n \* Unresolved event configuration.*?\n \*/\nexport interface UnresolvedEvent \{[^}]+\}[^}]+\}[^}]+\}[^}]+\}\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Fix logging to use getEventDisplayName
content = content.replace(
    "const eventNames = Array.from(this.events.values()).map(e => e.name);",
    "const eventNames = Array.from(this.events.values()).map(e => getEventDisplayName(e));"
)

content = content.replace(
    "console.log(`Selected event: ${selectedEvent.name} (${selectedEvent.id})`);",
    "console.log(`Selected event: ${getEventDisplayName(selectedEvent)} (${selectedEvent.id})`);"
)

# Remove handleUnresolvedEvent method (no longer needed)
content = re.sub(
    r'    /\*\*\n     \* Handle an unresolved event.*?\n     \*/\n    handleUnresolvedEvent\([^{]+\{[^}]+(\{[^}]+\}[^}]+)*return null;\n    \}\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Remove createModifierFromEvent method (no longer needed)
content = re.sub(
    r'    /\*\*\n     \* Create a modifier from an unresolved event.*?\n     \*/\n    private createModifierFromEvent\([^{]+\{[^}]+(\{[^}]+\}[^}]+)*return modifier;\n    \}\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Remove convertEffectsToEventModifiers method (no longer needed)
content = re.sub(
    r'    /\*\*\n     \* Convert event effects to EventModifier array format.*?\n     \*/\n    private convertEffectsToEventModifiers\([^{]+\{[^}]+(\{[^}]+\}[^}]+)*return modifiers;\n    \}\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Remove getContinuousEvents method (no longer needed)
content = re.sub(
    r'    /\*\*\n     \* Get all events that can become continuous modifiers.*?\n     \*/\n    getContinuousEvents\(\)[^{]+\{[^}]+\}\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Remove getExpiringEvents method (no longer needed)
content = re.sub(
    r'    /\*\*\n     \* Get all events that expire.*?\n     \*/\n    getExpiringEvents\(\)[^{]+\{[^}]+\}\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Remove getResolutionDC method (use level-based DCs instead)
content = re.sub(
    r'    /\*\*\n     \* Get resolution DC for an event.*?\n     \*/\n    getResolutionDC\([^{]+\{[^}]+(\{[^}]+\}[^}]+)*return [^;]+;\n    \}\n\n',
    '',
    content,
    flags=re.DOTALL
)

# Fix the applyEventOutcome to handle both number and string values
content = content.replace(
    "appliedEffects[modifier.resource] = (appliedEffects[modifier.resource] || 0) + modifier.value;",
    """// Handle both numeric and string (dice formula) values
                    const value = typeof modifier.value === 'number' ? modifier.value : 0;
                    appliedEffects[modifier.resource] = (appliedEffects[modifier.resource] || 0) + value;"""
)

# Update EventData tier type to match KingdomEvent
content = content.replace(
    "tier: string | number;  // 'event' or tier number",
    "tier: 'event' | 'minor' | 'moderate' | 'major' | number;"
)

# Write the updated file
with open('src/controllers/events/event-loader.ts', 'w') as f:
    f.write(content)

print("✅ Simplified event-loader.ts")
print("   - Removed UnresolvedEvent interface")
print("   - Removed handleUnresolvedEvent method")
print("   - Removed createModifierFromEvent method")  
print("   - Removed convertEffectsToEventModifiers method")
print("   - Removed getContinuousEvents method")
print("   - Removed getExpiringEvents method")
print("   - Removed getResolutionDC method")
print("   - Fixed logging to use getEventDisplayName")
print("   - Fixed tier type to match KingdomEvent")
print("   - Fixed value handling for string/number types")
