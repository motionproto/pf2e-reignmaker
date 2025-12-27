# Doctrine Army Abilities Reference

This document lists all effects that are automatically applied to army actors based on doctrine tier.

**Application Rules:**
- Tier 2 abilities are applied automatically when ANY doctrine reaches Moderate (40 pts)
- Tier 3 abilities are applied automatically when a doctrine reaches Major (80 pts) AND is Dominant

---

## Source Packs

| Pack | Path | Item Type |
|------|------|-----------|
| Bestiary Effects | `_pf2e/packs/bestiary-effects/` | `type: "effect"` |
| Custom Abilities | `src/data/abilities/` | `type: "action"` |

---

## IDEALIST Abilities

*Theme: Protection, Healing, Resilience, Inspiration*

| Tier | Ability | Source | ID | Mechanic | Dominant? |
|------|---------|--------|-----|----------|-----------|
| 2 | **Effect: Inspiring Aura** | bestiary-effects | `lM0swBGK6CfkMb6E` | +1 status to initiative and saves vs fear | No |
| 3 | **Effect: Aura of Righteousness** | bestiary-effects | `I5Fd4TkIKRJT6WXf` | +2 status AC vs unholy, +2 status damage vs unholy | **Yes** |

---

## RUTHLESS Abilities

*Theme: Fear, Aggression, Damage, Intimidation*

| Tier | Ability | Source | ID | Mechanic | Dominant? |
|------|---------|--------|-----|----------|-----------|
| 2 | **Effect: No Quarter!** | bestiary-effects | `TjRZbd52qWPjTbNT` | +1 status to attack and damage rolls | No |
| 3 | **Effect: Despair** | bestiary-effects | `1bOSJ2LbEC28aI9f` | Frightened 1 aura (can't naturally recover while in area) | **Yes** |

---

## PRACTICAL Abilities

*Theme: Tactics, Terrain, Efficiency, Command*

| Tier | Ability | Source | ID | Mechanic | Dominant? |
|------|---------|--------|-----|----------|-----------|
| 2 | **Effect: Rally** | bestiary-effects | `TrCwynU02vy5rdJr` | +1 circumstance to AC and saving throws | No |
| 3 | **Rigorous Discipline** | custom | `ReignmakerRigorousDiscipline` | Reaction: DC 17 flat check to downgrade critical hit to normal hit | **Yes** |

---

## Summary

| Doctrine | Tier 2 (Moderate 40pts) | Tier 3 (Major 80pts, Dominant) |
|----------|------------------------|-------------------------------|
| Idealist | Inspiring Aura | Aura of Righteousness |
| Ruthless | No Quarter! | Despair |
| Practical | Rally | Rigorous Discipline |

**Total: 6 abilities** (3 require dominant)
