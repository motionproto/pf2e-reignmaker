# Border Color Audit - Hardcoded Values

## Summary
Found 300+ instances of hardcoded border colors across the codebase.

---

## ✅ Can Map to Existing System (Primary - Crimson/Red)

### Crimson/Red Borders (hue 0-10°)
**Can map to:** `--border-primary-*` variants

- `rgba(139, 0, 0, ...)` - Dark maroon → `--border-primary-faint` or `--border-primary-subtle`
- `rgba(239, 68, 68, ...)` - Red → `--border-primary` or `--border-primary-medium`
- `rgba(220, 53, 69, ...)` - Red → `--border-primary`
- `rgba(255, 107, 107, ...)` - Light red → `--border-primary-medium` or `--border-primary-strong`

**Files affected:** ~30 files including:
- BaseCheckCard.svelte
- EventCard.svelte
- OutcomeDisplay components
- SettlementDetails.svelte
- Various dialogs

---

## ✅ Can Map to Existing System (Accent - Amber/Orange)

### Amber/Orange/Yellow Borders (hue 35-50°)
**Can map to:** `--border-accent-*` variants

- `rgba(251, 191, 36, ...)` - Amber → `--border-accent`
- `rgba(245, 158, 11, ...)` - Amber/Orange → `--border-accent-subtle` or `--border-accent`
- `rgba(255, 191, 0, ...)` - Gold → `--border-accent-medium`
- `rgba(234, 179, 8, ...)` - Yellow → `--border-accent` or `--border-accent-medium`
- `rgba(251, 146, 60, ...)` - Orange → `--border-accent-medium`
- `rgba(249, 115, 22, ...)` - Orange → `--border-accent-medium`

**Files affected:** ~40 files including:
- StatusPhase.svelte
- UpkeepPhase.svelte
- SettlementStatus.svelte
- Various outcome display components
- Structure-related components

---

## ✅ Can Map to Existing System (Neutral - Gray/White)

### Gray/White Borders (achromatic)
**Can map to:** `--border-faint`, `--border-subtle`, `--border-default`, `--border-medium`, `--border-strong`

- `rgba(255, 255, 255, 0.05)` → `--border-faint`
- `rgba(255, 255, 255, 0.1)` → `--border-subtle`
- `rgba(255, 255, 255, 0.2)` → `--border-default`
- `rgba(255, 255, 255, 0.3)` → `--border-medium`
- `rgba(255, 255, 255, 0.4-0.6)` → `--border-strong`
- `rgba(128, 128, 128, ...)` - Gray → equivalent neutral border
- `rgba(100, 116, 139, ...)` - Slate gray → `--border-default` or `--border-medium`
- `rgba(120, 120, 120, ...)` - Gray → `--border-subtle` or `--border-default`

**Files affected:** ~100+ files (most common pattern)

---

## ❌ NOT COVERED - Need New Border Variables

### Blue Borders (hue 210-220°) - Info/Success States
**Would need:** `--border-info-*` variants (5-point scale)

- `rgba(59, 130, 246, ...)` - Blue → Common for info states
- `rgba(96, 165, 250, ...)` - Light blue
- `rgba(100, 149, 237, ...)` - Cornflower blue
- `rgba(100, 200, 255, ...)` - Light blue
- `rgba(100, 100, 255, ...)` - Blue

**Files affected:** ~25 files including:
- EventCard.svelte (aid states)
- BaseCheckCard.svelte (aid buttons)
- FactionTokenInput.svelte
- PurchaseResourceSelector.svelte
- RollBreakdown.svelte
- SettlementsList.svelte (in-progress states)

**Suggested variables:**
```css
--border-info-faint: hsla(217, 100%, 80%, 0.15);
--border-info-subtle: hsla(217, 100%, 80%, 0.35);
--border-info: var(--color-blue);
--border-info-medium: hsla(217, 100%, 85%, 1);
--border-info-strong: hsla(217, 100%, 90%, 1);
```

---

### Green Borders (hue 120-140°) - Success States
**Would need:** `--border-success-*` variants (5-point scale)

- `rgba(34, 197, 94, ...)` - Green → Common for success states
- `rgba(0, 255, 0, ...)` - Pure green

**Files affected:** ~20 files including:
- OutcomeDisplay.svelte
- DebugResultSelector.svelte
- StateChanges.svelte
- ResourceChoiceSelector.svelte
- SettlementStructureManager.svelte
- Various outcome components

**Suggested variables:**
```css
--border-success-faint: hsla(142, 71%, 45%, 0.15);
--border-success-subtle: hsla(142, 71%, 45%, 0.35);
--border-success: var(--color-green);
--border-success-medium: hsla(142, 71%, 55%, 1);
--border-success-strong: hsla(142, 71%, 65%, 1);
```

---

### Purple Borders (hue 270°) - Special/Debug States
**Would need:** `--border-purple-*` or `--border-special-*` variants

- `rgba(139, 92, 246, ...)` - Purple/Violet → Debug/special UI
- `rgba(128, 0, 128, ...)` - Purple
- `rgba(150, 80, 255, ...)` - Purple

**Files affected:** ~8 files including:
- DebugEventSelector.svelte
- FactionDetailView.svelte (GM area)
- ManualEffects.svelte
- CollectStipendResolution.svelte

**Suggested variables:**
```css
--border-purple-faint: hsla(258, 90%, 66%, 0.15);
--border-purple-subtle: hsla(258, 90%, 66%, 0.35);
--border-purple: hsl(258, 90%, 66%);
--border-purple-medium: hsla(258, 90%, 75%, 1);
--border-purple-strong: hsla(258, 90%, 85%, 1);
```

---

### Brown/Tan Borders (hue 25-35°) - Resource-specific
**Would need:** Consider if needed

- `rgba(139, 69, 19, ...)` - Brown (food resource)

**Files affected:** ~2 files
- TerritoryTab.svelte (resource type badges)

**Note:** Rare usage, could potentially use `--border-accent-*` variants

---

## Implementation Priority

### Phase 1 - High Impact (Map to existing)
1. **Neutral borders** (~100+ instances) → Existing `--border-*` scale
2. **Amber/Orange** (~40 instances) → Existing `--border-accent-*`
3. **Crimson/Red** (~30 instances) → Existing `--border-primary-*`

### Phase 2 - New Variables Needed
4. **Blue/Info** (~25 instances) → New `--border-info-*` scale
5. **Green/Success** (~20 instances) → New `--border-success-*` scale
6. **Purple/Special** (~8 instances) → New `--border-purple-*` scale

---

## Recommended Approach

1. **Start with Phase 1** - Replace ~170 instances with existing variables
2. **Evaluate Phase 2 need** - Decide if info/success/purple border scales are worth adding
3. **Edge cases** - Brown borders are rare enough to handle individually

Would you like me to proceed with Phase 1 replacements?
