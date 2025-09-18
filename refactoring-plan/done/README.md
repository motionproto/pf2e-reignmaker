# Reignmaker-lite Implementation Plan

## The Plan: Incremental Refactoring (7 weeks)

Follow **[FINAL-recommendation.md](FINAL-recommendation.md)** for the strategy.

**[detailed-implementation-steps.md](detailed-implementation-steps.md)** contains the complete implementation guide with code examples.

## Quick Summary

### Weeks 1-2: Add New Features First
- **Fame System** - Auto-gain 1 per turn, spend for rerolls
- **Unrest Incidents** - Tiered incident tables
- Add these WITHOUT touching existing code

### Weeks 3-4: Extract Action Handlers
- Pull out 100+ actions from KingdomSheet.kt
- Keep Kingmaker integration intact

### Weeks 5-6: Add Diplomatic Relations
- New faction relationship system
- Trade implications and capacity

### Week 7: Testing & Polish

## Why This Approach?

1. **Preserves Kingmaker integration** (6+ weeks of work)
2. **New features immediately** (no waiting)
3. **Lower risk** (everything keeps working)
4. **Fastest path** (7 weeks vs 10-12)

## Next Steps

1. Start implementing Fame system
2. Add Unrest Incidents
3. Then refactor incrementally

---

See [FINAL-recommendation.md](FINAL-recommendation.md) for full details.
