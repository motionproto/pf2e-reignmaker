# Stipend vs Earn Income Analysis

## Mathematical Relationship

The Kingdom stipend table is based on the PF2e Earn Income action, with the following relationships:

### Base Pattern: ~10 Days of Earn Income

The stipend represents approximately **10 days** of Earn Income at different proficiency levels:

#### T2 (Counting House) ≈ Trained Earn Income × 10

| Level | T2 Stipend | Trained Earn Income | Multiplier |
|-------|-----------|---------------------|------------|
| 2     | 3 gp      | 3 sp                | ×10        |
| 3     | 5 gp      | 5 sp                | ×10        |
| 4     | 7 gp      | 7 sp                | ×10        |
| 5     | 9 gp      | 9 sp                | ×10        |
| 6     | 15 gp     | 1 gp 5 sp           | ×10        |
| 7     | 20 gp     | 2 gp                | ×10        |
| 8-20  | ...       | ...                 | ×10        |

**Pattern:** T2 = Trained × 10 (consistent silver→gold conversion)

#### T3 (Treasury) ≈ Expert Earn Income × 10-16

| Level | T3 Stipend | Expert Earn Income | Multiplier |
|-------|-----------|-------------------|------------|
| 5     | 18 gp     | 1 gp              | ×18        |
| 10    | 80 gp     | 5 gp              | ×16        |
| 15    | 200 gp    | 20 gp             | ×10        |
| 20    | 800 gp    | 75 gp             | ×10.67     |

**Pattern:** T3 starts at ~15-18× at low levels, converges to ~10× at high levels

#### T4 (Exchequer) ≈ Master Earn Income × 10-25

| Level | T4 Stipend | Master Earn Income | Multiplier |
|-------|-----------|-------------------|------------|
| 10    | 160 gp    | 6 gp              | ×26.67     |
| 15    | 400 gp    | 28 gp             | ×14.29     |
| 20    | 1600 gp   | 150 gp            | ×10.67     |

**Pattern:** T4 starts at ~25× at low levels, converges to ~10-11× at high levels

## Design Intent

The stipend represents roughly **10 days of Earn Income work** at the proficiency level matching the taxation structure tier:

- **T2 (Counting House)** = 10 days of Trained-level work
- **T3 (Treasury)** = 10 days of Expert-level work  
- **T4 (Exchequer)** = 10 days of Master-level work

The higher multipliers at lower levels compensate for the fact that Expert/Master work becomes available before settlements reach those levels, creating a reward for investing in better taxation infrastructure early.

## Implementation Notes

The current `INCOME_TABLE` in `CollectStipendAction.ts` accurately represents this relationship. The stipend is meant to be a **once-per-downtime** windfall representing accumulated personal income from kingdom taxation duties, not a daily rate.
