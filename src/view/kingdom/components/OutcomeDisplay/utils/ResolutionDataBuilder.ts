/**
 * Resolution Data Builder
 * 
 * Computes complete resolution data from outcome state.
 * This is the single source of truth for what gets applied to the kingdom.
 */

/**
 * Build resolution data from outcome state
 * 
 * @param options - All the state needed to compute resolution
 * @returns Complete resolution data ready to apply
 */
export function buildResolutionData(options: {
  selectedChoice: number | null;
  componentResolutionData: { effect: string; stateChanges: Record<string, any> } | null;
  modifiers: any[] | undefined;
  resolvedDice: Map<number | string, number>;
  selectedResources: Map<number, string>;
  customComponentData: any;
  customSelectionData: Record<string, any> | null;
  manualEffects: string[] | undefined;
  outcomeBadges?: any[] | undefined;
  kingdomResources?: Record<string, number>;  // ✨ NEW: Current kingdom resources for shortfall detection
}): any {
  const {
    selectedChoice,
    componentResolutionData,
    modifiers,
    resolvedDice,
    selectedResources,
    customComponentData,
    customSelectionData,
    manualEffects,
    outcomeBadges
  } = options;

  const numericModifiers: Array<{ resource: string; value: number }> = [];

  // ✨ Track which modifier types have been processed via badges to prevent double-counting
  // When modifiers are converted to badges (by convertModifiersToBadges), we process them
  // here from badges. We must NOT also process the original modifiers in Case 1/3 below.
  const processedFromBadges = { dice: false, static: false };

  // ✨ AUTO-CONVERT OUTCOME BADGES: Extract resource from badge template
  // This allows badges to work without manually creating matching modifiers
  // Handles both dice badges (after rolling) and static badges
  if (outcomeBadges && outcomeBadges.length > 0) {
    for (let i = 0; i < outcomeBadges.length; i++) {
      const badge = outcomeBadges[i];

      // Skip badges without values
      if (!badge.value) continue;

      // Skip fame badges (handled separately by critical success bonus)
      if ((badge as any)._isFame) continue;

      // Extract resource from template using multiple patterns
      // Pattern 1: "Lose/Gain/Remove/Reduce {{value}} [resource]"
      // Pattern 2: "Reduce [resource] by {{value}}"
      let templateMatch = badge.template?.match(/(?:Lose|Gain|Remove|Reduce)\s+\{\{value\}\}\s+(\w+)/i);
      if (!templateMatch) {
        templateMatch = badge.template?.match(/(?:Reduce)\s+(\w+)\s+by\s+\{\{value\}\}/i);
      }

      if (!templateMatch) continue;

      // Get resource name (lowercase)
      let resource = templateMatch[1].toLowerCase();

      // Determine if negative based on template text ONLY
      // "Lose", "Reduce", "Remove" = subtract the value
      // "Gain" = add the value
      // Note: badge.variant is for UI styling only (whether outcome is good/bad for player),
      // NOT for determining the sign. e.g., "Gain Unrest" has variant='negative' (bad for player)
      // but should ADD unrest, not subtract it.
      const templateLower = badge.template?.toLowerCase() || '';
      const isNegative = templateLower.includes('lose') ||
                         templateLower.includes('reduce') ||
                         templateLower.includes('remove');

      // Handle dice badges (need rolled value)
      if (badge.value.type === 'dice') {
        const badgeIndex = (badge as any)._modifierIndex ?? i;
        const rolledValue = resolvedDice.get(badgeIndex);

        // Skip if not rolled yet
        if (rolledValue === undefined) continue;

        const finalValue = isNegative ? -Math.abs(rolledValue) : rolledValue;
        numericModifiers.push({ resource, value: finalValue });
        processedFromBadges.dice = true;
        console.log(`✨ [ResolutionDataBuilder] Auto-converted dice badge: ${resource} = ${finalValue}`);
      }
      // Handle static badges (use amount directly)
      else if (badge.value.type === 'static') {
        const amount = badge.value.amount;
        const finalValue = isNegative ? -Math.abs(amount) : amount;
        numericModifiers.push({ resource, value: finalValue });
        processedFromBadges.static = true;
        console.log(`✨ [ResolutionDataBuilder] Auto-converted static badge: ${resource} = ${finalValue}`);
      }
    }
  }
  
  // Case 1: Choice was made (resource arrays are replaced by choice)
  if (selectedChoice !== null && componentResolutionData?.stateChanges) {
    // Add non-resource-array modifiers (e.g., gold penalty in Trade War)
    if (modifiers) {
      for (let i = 0; i < modifiers.length; i++) {
        const mod = modifiers[i] as any;

        // ⚠️ SKIP MODIFIERS ALREADY PROCESSED FROM BADGES
        // Dice and static modifiers are converted to badges by convertModifiersToBadges(),
        // then processed above. Skip them here to prevent double-counting.
        if (mod.type === 'dice' && mod.formula && processedFromBadges.dice) {
          continue;
        }
        if (mod.type === 'static' && processedFromBadges.static) {
          continue;
        }

        // Skip resource arrays (they're replaced by the choice)
        if (Array.isArray(mod.resources)) {
          continue;
        }

        // Get rolled value or use static value
        const value = resolvedDice.get(i) ?? mod.value;

        if (typeof value === 'number') {
          numericModifiers.push({ resource: mod.resource as string, value });
        }
      }
    }
    
    // Add choice modifiers (already rolled in ChoiceButtons)
    for (const [resource, value] of Object.entries(componentResolutionData.stateChanges)) {
      numericModifiers.push({ resource: resource as string, value: value as number });
    }
  }
  // Case 2: Custom component made a selection (e.g., HarvestResourcesAction)
  else if (componentResolutionData?.stateChanges && Object.keys(componentResolutionData.stateChanges).length > 0) {
    // Add modifiers from custom component selection
    for (const [resource, value] of Object.entries(componentResolutionData.stateChanges)) {
      numericModifiers.push({ resource: resource as string, value: value as number });
    }
  }
  // Case 3: No choices, apply all modifiers
  else {
    console.log('📊 [ResolutionDataBuilder] Case 3: Processing all modifiers', { modifiersLength: modifiers?.length, processedFromBadges });
    if (modifiers) {
      for (let i = 0; i < modifiers.length; i++) {
        const mod = modifiers[i] as any;
        console.log(`📊 [ResolutionDataBuilder] Processing modifier ${i}:`, mod);

        // ⚠️ SKIP MODIFIERS ALREADY PROCESSED FROM BADGES
        // Dice and static modifiers are converted to badges by convertModifiersToBadges(),
        // then processed above. Skip them here to prevent double-counting.
        if (mod.type === 'dice' && mod.formula && processedFromBadges.dice) {
          console.log(`📊 [ResolutionDataBuilder] Skipping dice modifier ${i} (already processed from badges)`);
          continue;
        }
        if (mod.type === 'static' && processedFromBadges.static) {
          console.log(`📊 [ResolutionDataBuilder] Skipping static modifier ${i} (already processed from badges)`);
          continue;
        }

        // Handle ChoiceModifiers (type: "choice-dropdown" with resources array)
        if (mod.type === 'choice-dropdown' && Array.isArray(mod.resources)) {
          const selectedResource = selectedResources.get(i);
          if (selectedResource) {
            numericModifiers.push({
              resource: selectedResource as string,
              value: mod.value as number
            });
            console.log(`📊 [ResolutionDataBuilder] Added choice modifier: ${selectedResource} = ${mod.value}`);
          }
          continue;
        }

        // Skip resource arrays if no choice (shouldn't happen, but safety)
        if (Array.isArray(mod.resources)) {
          console.log(`📊 [ResolutionDataBuilder] Skipping resource array modifier ${i}`);
          continue;
        }

        // Get rolled value or use static value
        let value = resolvedDice.get(i) ?? resolvedDice.get(`state:${mod.resource}`) ?? mod.value;
        console.log(`📊 [ResolutionDataBuilder] Modifier ${i} value resolution:`, {
          rolledAtIndex: resolvedDice.get(i),
          rolledAtState: resolvedDice.get(`state:${mod.resource}`),
          staticValue: mod.value,
          finalValue: value
        });

        if (typeof value === 'number') {
          // Apply negative flag for static modifiers
          const finalValue = mod.negative ? -Math.abs(value) : value;
          numericModifiers.push({ resource: mod.resource as string, value: finalValue });
          console.log(`📊 [ResolutionDataBuilder] Added static modifier: ${mod.resource} = ${finalValue} (negative=${mod.negative})`);
        }
      }
    }
  }
  
  // ✨ PRE-CALCULATE SHORTFALL PENALTIES (Short Fly Rule)
  // If resource losses would go negative, add +1 unrest per shortfall resource
  // This way the UI shows the correct total unrest BEFORE the user clicks Apply
  if (options.kingdomResources) {
    console.log('📊 [ResolutionDataBuilder] Detecting shortfalls with kingdom resources:', options.kingdomResources);
    
    // Step 1: Accumulate modifiers by resource type
    const accumulated = new Map<string, number>();
    for (const { resource, value } of numericModifiers) {
      const current = accumulated.get(resource) || 0;
      accumulated.set(resource, current + value);
    }
    console.log('📊 [ResolutionDataBuilder] Accumulated modifiers:', Array.from(accumulated.entries()));
    
    // Step 2: Detect shortfalls for standard resources (not unrest, fame, imprisonedUnrest)
    const shortfallCount = Array.from(accumulated.entries()).filter(([resource, value]) => {
      // Only check standard resources
      if (resource === 'unrest' || resource === 'fame' || resource === 'imprisonedUnrest') {
        return false;
      }
      
      const currentValue = options.kingdomResources![resource] || 0;
      const targetValue = currentValue + value;
      const hasShortfall = value < 0 && targetValue < 0;
      
      if (hasShortfall) {
        console.log(`  ⚠️ [ResolutionDataBuilder] Shortfall detected: ${resource} (current=${currentValue}, change=${value}, target=${targetValue})`);
      }
      
      return hasShortfall;
    }).length;
    
    // Step 3: Add shortfall penalties to numericModifiers
    if (shortfallCount > 0) {
      console.log(`📊 [ResolutionDataBuilder] Adding +${shortfallCount} unrest from shortfalls`);
      
      // Find existing unrest modifier and add to it, or create new one
      const existingUnrestIndex = numericModifiers.findIndex(m => m.resource === 'unrest');
      if (existingUnrestIndex !== -1) {
        // Add to existing unrest modifier
        numericModifiers[existingUnrestIndex].value += shortfallCount;
        console.log(`  ✅ Updated existing unrest modifier: ${numericModifiers[existingUnrestIndex].value}`);
      } else {
        // Create new unrest modifier
        numericModifiers.push({ resource: 'unrest', value: shortfallCount });
        console.log(`  ✅ Added new unrest modifier: +${shortfallCount}`);
      }
    }
  }
  
  // Build complete resolution data
  // For custom components: merge persisted selectedResource with local selection data
  const mergedCustomData = customSelectionData ? {
    ...customComponentData,  // selectedResource from instance
    ...customSelectionData  // Contains the full selection (selectedAmount, goldCost, etc.)
  } : customComponentData;
  
  console.log('📊 [ResolutionDataBuilder] Final numericModifiers:', numericModifiers);
  
  return {
    numericModifiers,
    manualEffects: manualEffects || [],
    complexActions: [], // Phase 3 will add support for this
    customComponentData: mergedCustomData  // Merged custom component data
  };
}
