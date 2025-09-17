# Handler Inventory for KingdomSheet Refactoring

## Instructions
- Mark handlers to keep with ✓ 
- Mark handlers to remove with X
- Add notes for any special considerations

## Handler Status Table

| Handler Name |  | Status | Description |
|--------------|-------------|---------|-------|
| **Turn Management** | | | |
| `gain-fame` | ✓ | Not Started | Gain 1 fame at turn start |
| `gain-fame-critical` | ✓ | Not Started | Gain fame from critical success |
| `use-fame-reroll` | ✓ | Not Started | Use fame point for reroll |
| `collect-resources` | ✓ | ✅ Completed | Collect resources during income phase |
| `pay-consumption` | ✓ | ✅ Completed | Pay consumption during upkeep |
| `end-turn` | ✓ | ✅ Completed | End turn processing |
| `skip-collect-taxes` | X | Not Started | Skip collecting taxes to reduce unrest |
| **XP & Level Management** | | | |
| `gain-xp` | X | ✅ Completed | Gain XP from button click |
| `hex-xp` | X | Not Started | Gain XP from claimed hexes |
| `structure-xp` | X | Not Started | Gain XP from structures |
| `rp-xp` | X | Not Started | Convert RP to XP |
| `solution-xp` | X | Not Started | Gain XP from solutions |
| `level-up` | X | ✅ Completed | Level up the kingdom |
| **Unrest Management** | | | |
| `adjust-unrest` | X | Not Started | Adjust unrest value |
| `check-unrest-incident` | ✓ | Not Started | Check for unrest incidents |
| **Leadership & Characters** | | | |
| `clear-leader` | X | Not Started | Remove a leader |
| `open-leader` | X | Not Started | Open leader character sheet |
| `show-players` | ✓ | Not Started | Show kingdom sheet to players |
| `inspect-leader-skills` | X | Not Started | View leader skill configuration |
| `inspect-kingdom-skills` | X | Not Started | View kingdom skill configuration |
| **Settlement Management** | | | |
| `create-settlement` | ✓ | Not Started | Create new settlement |
| `create-capital` | ✓ | Not Started | Create capital settlement |
| `add-settlement` | ✓ | Not Started | Add existing scene as settlement |
| `delete-settlement` | ✓ | Not Started | Remove settlement |
| `view-settlement` | ✓ | Not Started | View settlement scene |
| `activate-settlement` | ✓ | Not Started | Activate settlement scene |
| `inspect-settlement` | ✓ | Not Started | Open settlement details dialog |
| **Event Management** | | | |
| `check-cult-event` | X | Not Started | Check for cult event |
| `check-event` | ✓ | Not Started | Check for kingdom event |
| `roll-cult-event` | X | Not Started | Roll on cult event table |
| `roll-event` | ✓ | Not Started | Roll on kingdom event table |
| `delete-event` | ✓ | Not Started | Remove ongoing event |
| `add-event` | ✓ | Not Started | Add new event |
| `change-event-stage` | ✓ | Not Started | Change event stage |
| `handle-event` | ✓ | Not Started | Handle event resolution |
| `toggle-continuous` | ✓ | Not Started | Toggle event continuous status |
| **Bonus & Modifiers** | | | |
| `add-bonus-feat` | X | Not Started | Add bonus feat |
| `delete-bonus-feat` | X | Not Started | Remove bonus feat |
| `add-modifier` | X | Not Started | Add kingdom modifier |
| `delete-modifier` | X | Not Started | Remove kingdom modifier |
| `add-group` | ✓ | Not Started | Add diplomatic group |
| `delete-group` | ✓ | Not Started | Remove diplomatic group |
| **Configuration Dialogs** | | | |
| `configure-activities` | ✓ | Not Started | Open activities management |
| `configure-events` | ✓ | Not Started | Open events management |
| `configure-milestones` | X | Not Started | Open milestones management |
| `configure-charters` | X | Not Started | Open charters management |
| `configure-governments` | X | Not Started | Open governments management |
| `configure-heartlands` | X | Not Started | Open heartlands management |
| `configure-feats` | X | Not Started | Open feats management |
| `settings` | ✓ | Not Started | Open kingdom settings |
| **Skill Checks & Activities** | | | |
| `roll-skill-check` | ✓ | Not Started | Roll kingdom skill check |
| `perform-activity` | ✓ | Not Started | Perform kingdom activity |
| **Special Actions** | | | |
| `claimed-refuge` | X | Not Started | Claim refuge bonus |
| `claimed-landmark` | X | Not Started | Claim landmark bonus |
| **Navigation** | | | |
| `change-nav` | ✓ | Not Started | Change main navigation tab |
| `change-kingdom-section-nav` | ✓ | Not Started | Change kingdom section |
| `scroll-to` | ✓ | Not Started | Scroll to element |
| **Info & Help** | | | |
| `quickstart` | ✓ | Not Started | Open quickstart guide |
| `help` | ✓ | Not Started | Open help documentation |
| `settlement-size-info` | ✓ | Not Started | Show settlement size help |
| `kingdom-size-info` | ✓ | Not Started | Show kingdom size help |
| `consumption-breakdown` | ✓ | Not Started | Show consumption breakdown |
| **Import/Export** | | | |
| `structures-import` | ✓ | Not Started | Import structures |

## Summary Statistics

- **Total Handlers**: 47
- **Completed**: 5 (11%)
- **Not Started**: 42 (89%)
- **To Keep**: 32 (68%)
- **To Remove**: 15 (32%)

### Handlers to Keep (32)
**Already Completed (3)**:
- `collect-resources` ✅
- `pay-consumption` ✅
- `end-turn` ✅

**Still Needed (29)**:
- Turn: `gain-fame`, `gain-fame-critical`, `use-fame-reroll`
- Unrest: `check-unrest-incident`
- Leadership: `show-players`
- Settlement (7): All settlement handlers
- Event (7): `check-event`, `roll-event`, `delete-event`, `add-event`, `change-event-stage`, `handle-event`, `toggle-continuous`
- Groups: `add-group`, `delete-group`
- Config: `configure-activities`, `configure-events`, `settings`
- Activities: `roll-skill-check`, `perform-activity`
- Navigation (3): All navigation handlers
- Help (5): All help/info handlers
- Import: `structures-import`

### Handlers to Remove (15)
**Already Completed but No Longer Needed (2)**:
- `gain-xp` ✅ (XP system removed)
- `level-up` ✅ (Level system removed)

**Not Started and Not Needed (13)**:
- Turn: `skip-collect-taxes`
- XP: `hex-xp`, `structure-xp`, `rp-xp`, `solution-xp`
- Unrest: `adjust-unrest`
- Leadership: `clear-leader`, `open-leader`, `inspect-leader-skills`, `inspect-kingdom-skills`
- Event: `check-cult-event`, `roll-cult-event`
- Bonus: `add-bonus-feat`, `delete-bonus-feat`, `add-modifier`, `delete-modifier`
- Config: `configure-milestones`, `configure-charters`, `configure-governments`, `configure-heartlands`, `configure-feats`
- Special: `claimed-refuge`, `claimed-landmark`

## Categories Breakdown

| Category | Total | Completed | Not Started |
|----------|-------|-----------|-------------|
| Turn Management | 7 | 3 | 4 |
| XP & Level Management | 6 | 2 | 4 |
| Unrest Management | 2 | 0 | 2 |
| Leadership & Characters | 5 | 0 | 5 |
| Settlement Management | 7 | 0 | 7 |
| Event Management | 9 | 0 | 9 |
| Bonus & Modifiers | 6 | 0 | 6 |
| Configuration Dialogs | 8 | 0 | 8 |
| Skill Checks & Activities | 2 | 0 | 2 |
| Special Actions | 2 | 0 | 2 |
| Navigation | 3 | 0 | 3 |
| Info & Help | 5 | 0 | 5 |
| Import/Export | 1 | 0 | 1 |

## Notes Section

_Add any general notes or observations about the handlers here_

---

**Please review this list and:**
1. Mark handlers to keep with ✓ in the Keep/Remove column
2. Mark handlers to remove with X in the Keep/Remove column
3. Add any notes about specific handlers or requirements
4. Let me know which handlers need special attention or discussion
