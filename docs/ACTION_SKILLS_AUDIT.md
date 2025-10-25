# Action Skills Audit Report

**Date:** October 25, 2025  
**Auditor:** AI Assistant  
**Total Actions Reviewed:** 26  
**Issues Found:** 6 actions with questionable skill assignments  
**Success Rate:** ~77% have appropriate skills

---

## Executive Summary

This audit reviewed all 26 player actions in the pf2e-reignmaker module to assess whether the assigned skills for each action make thematic and mechanical sense. The majority of actions (20 out of 26) have well-chosen skill assignments. However, 6 actions had questionable skills that either didn't resonate thematically or seemed forced.

All identified issues have been corrected in the action JSON files.

---

## 🔴 Problematic Skills (Fixed)

### 1. **Build Structure** (`build-structure.json`)

**Issues:**
- ❌ **stealth** (discrete building) - Doesn't resonate. Why would construction need stealth?
- ❌ **acrobatics** (specialized construction) - Questionable. How does agility help build markets/temples?

**Resolution:**
- **Removed:** acrobatics, stealth
- **Added:** arcana (magically assisted construction)
- **Final Skills:** crafting, society, athletics, arcana

**Rationale:** Keeps the core construction skills (crafting/athletics) and organizational skill (society), while adding arcana for magical construction methods that fit the fantasy setting.

---

### 2. **Collect Stipend** (`collect-stipend.json`)

**Issue:**
- ❌ **acrobatics** (impressive service) - Very odd. Physical agility doesn't help collect taxes/stipend.

**Resolution:**
- **Removed:** acrobatics
- **Final Skills:** intimidation, deception, diplomacy, society, performance, thievery

**Rationale:** The action already has 6 strong skill options covering various approaches from formal (diplomacy/society) to corrupt (thievery/deception). Acrobatics was unnecessary.

---

### 3. **Deal with Unrest** (`deal-with-unrest.json`)

**Issue:**
- ⚠️ **acrobatics** (impressive physical feats) - Borderline. Could work for entertaining citizens, but feels stretched.

**Resolution:**
- **Removed:** acrobatics
- **Final Skills:** performance, religion, intimidation, diplomacy, arcana, medicine, occultism

**Rationale:** Acrobatics is redundant with performance (which already covers entertainment). The action still has 7 diverse approaches.

---

### 4. **Fortify Hex** (`fortify-hex.json`)

**Issue:**
- ⚠️ **thievery** (trap placement) - "Thievery" has negative connotations. Action is about defensive traps, not stealing.

**Resolution:**
- **Removed:** thievery
- **Added:** survival (wilderness defenses)
- **Final Skills:** crafting, athletics, intimidation, survival, warfare-lore

**Rationale:** Survival better represents building defensive positions in wilderness hexes. The trap concept is still covered by crafting and warfare-lore.

---

### 5. **Request Economic Aid** (`request-economic-aid.json`)

**Issue:**
- ❌ **thievery** (creative accounting) - You're REQUESTING aid, not stealing it. This implies fraud/embezzlement.

**Resolution:**
- **Removed:** thievery
- **Added:** deception (exaggerate need)
- **Final Skills:** diplomacy, society, performance, deception, medicine

**Rationale:** Deception is more appropriate for misleading allies about the severity of need, without implying outright theft from an ally.

---

### 6. **Sell Surplus** (`sell-surplus.json`)

**Issue:**
- ⚠️ **occultism** (mystical trade) - Strange fit. What's mystical about selling grain or lumber?

**Resolution:**
- **Removed:** occultism
- **Final Skills:** society, diplomacy, deception, performance, thievery, mercantile-lore

**Rationale:** The economy doesn't include magical resources as a trade good. Thievery (black market) remains as it's thematically appropriate for selling surplus goods through illicit channels.

---

## ✅ Well-Designed Actions

The following actions had excellent skill assignments and required no changes:

### **Expand Borders Category**
- **Build Roads**: crafting, survival, athletics, nature - Perfect for infrastructure development
- **Claim Hexes**: survival, exploration-lore, society, warfare-lore - Excellent mix

### **Uphold Stability Category**
- **Arrest Dissidents**: intimidation, society, stealth, deception, athletics - All appropriate

### **Military Category**
- **Deploy Army**: nature, survival, athletics, stealth, warfare-lore - All relevant
- **Disband Army**: intimidation, diplomacy, society, performance, warfare-lore - Good variety
- **Train Army**: intimidation, athletics, acrobatics, survival, warfare-lore - Makes sense
- **Recruit Unit**: diplomacy, intimidation, society, performance, athletics - Perfect
- **Recover Army**: medicine, performance, religion, nature, crafting, warfare-lore - Comprehensive
- **Outfit Army**: crafting, society, intimidation, thievery, warfare-lore - Good options

### **Foreign Affairs Category**
- **Hire Adventurers**: diplomacy, society, deception, performance, thievery - Great variety
- **Infiltration**: deception, stealth, thievery, society, arcana, acrobatics - Excellent thematic fit

### **Other Actions**
- **Create Worksite**: crafting, nature, survival, athletics, arcana, religion - Diverse approaches
- **Harvest Resources**: nature, survival, crafting, athletics, occultism, medicine - Good mix
- **Establish Settlement**: society, survival, diplomacy, religion, medicine - All appropriate
- **Upgrade Settlement**: crafting, society, performance, arcana, medicine - Makes sense
- **Repair Structure**: crafting, society, athletics - Simple and effective
- **Execute or Pardon Prisoners**: intimidation, society, diplomacy, religion, performance - Well thought out
- **Send Scouts**: stealth, survival, nature, society, athletics, acrobatics - Perfect for reconnaissance
- **Purchase Resources**: society, diplomacy, intimidation, deception, mercantile-lore - Excellent

---

## Changes Summary

| Action | Removed Skills | Added Skills |
|--------|---------------|--------------|
| Build Structure | acrobatics, stealth | arcana |
| Collect Stipend | acrobatics | - |
| Deal with Unrest | acrobatics | - |
| Fortify Hex | thievery | survival |
| Request Economic Aid | thievery | deception |
| Sell Surplus | occultism | - |

---

## Common Issues Identified

### 1. **Overuse of Acrobatics**
Three actions used acrobatics in forced/questionable ways. Acrobatics is a physical skill that doesn't naturally fit administrative or construction tasks.

### 2. **Misuse of Thievery**
Two actions used thievery where other skills were more appropriate:
- **Fortify Hex**: Trap building is engineering, not thievery
- **Request Economic Aid**: Asking for help shouldn't involve theft

### 3. **Niche Skills Without Clear Use Case**
- **Occultism** in Sell Surplus didn't make sense without magical trade goods
- **Stealth** in Build Structure was thematically inconsistent

---

## Recommendations for Future Actions

When designing skills for new actions, consider:

1. **Thematic Consistency**: Does the skill logically connect to the action's purpose?
2. **Avoid Forced Variety**: Don't add skills just to increase options if they don't make sense
3. **Clear Descriptions**: The skill description should make it immediately obvious how it applies
4. **Overlap is OK**: Some actions naturally have fewer skill options, and that's fine
5. **Consider Player Fantasy**: Does using this skill create a compelling narrative moment?

---

## Conclusion

The skill assignments in pf2e-reignmaker are generally well-designed, with 77% of actions having appropriate skills. The issues identified were primarily edge cases where skills were added for variety without strong thematic justification. All identified issues have been corrected, resulting in more coherent and thematically consistent action options.
