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
  specialEffects: any[] | undefined;
  outcomeBadges?: any[] | undefined;
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
    specialEffects,
    outcomeBadges
  } = options;

  const numericModifiers: Array<{ resource: string; value: number }> = [];
  
  // ✨ AUTO-CONVERT OUTCOME BADGES: Extract resource from badge template
  // This allows badges to work without manually creating matching modifiers
  if (outcomeBadges && outcomeBadges.length > 0) {
    for (let i = 0; i < outcomeBadges.length; i++) {
      const badge = outcomeBadges[i];
      
      // Skip badges without dice values
      if (!badge.value || badge.value.type !== 'dice') continue;
      
      // Skip fame badges (handled separately)
      if ((badge as any)._isFame) continue;
      
      // Get badge index for rolled value lookup
      const badgeIndex = (badge as any)._modifierIndex ?? i;
      const rolledValue = resolvedDice.get(badgeIndex);
      
      // Skip if not rolled yet
      if (rolledValue === undefined) continue;
      
      // Extract resource from template (e.g., "Lose {{value}} Lumber" -> "lumber")
      const templateMatch = badge.template?.match(/(?:Lose|Gain)\s+\{\{value\}\}\s+(\w+)/i);
      if (!templateMatch) continue;
      
      const resource = templateMatch[1].toLowerCase();
      
      // Determine if negative (lose vs gain)
      const isNegative = badge.template?.toLowerCase().includes('lose') || 
                         badge.variant === 'negative';
      
      const finalValue = isNegative ? -Math.abs(rolledValue) : rolledValue;
      
      numericModifiers.push({ resource, value: finalValue });
      console.log(`✨ [ResolutionDataBuilder] Auto-converted badge: ${resource} = ${finalValue}`);
    }
  }
  
  // Case 1: Choice was made (resource arrays are replaced by choice)
  if (selectedChoice !== null && componentResolutionData?.stateChanges) {
    // Add non-resource-array modifiers (e.g., gold penalty in Trade War)
    if (modifiers) {
      for (let i = 0; i < modifiers.length; i++) {
        const mod = modifiers[i] as any;
        
        // ⚠️ SKIP DICE MODIFIERS: Already converted from outcomeBadges above (lines 47-75)
        if (mod.type === 'dice' && mod.formula) {
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
    if (modifiers) {
      for (let i = 0; i < modifiers.length; i++) {
        const mod = modifiers[i] as any;

        // ⚠️ SKIP DICE MODIFIERS: Already converted from outcomeBadges above (lines 47-75)
        // This prevents double-application of penalties/bonuses
        if (mod.type === 'dice' && mod.formula) {
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
          }
          continue;
        }

        // Skip resource arrays if no choice (shouldn't happen, but safety)
        if (Array.isArray(mod.resources)) {
          continue;
        }
        
        // Get rolled value or use static value
        let value = resolvedDice.get(i) ?? resolvedDice.get(`state:${mod.resource}`) ?? mod.value;

        if (typeof value === 'number') {
          // Apply negative flag for static modifiers
          const finalValue = mod.negative ? -Math.abs(value) : value;
          numericModifiers.push({ resource: mod.resource as string, value: finalValue });
        }
      }
    }
  }
  
  // Build complete resolution data
  // For custom components: merge persisted selectedResource with local selection data
  const mergedCustomData = customSelectionData ? {
    ...customComponentData,  // selectedResource from instance
    ...customSelectionData  // Contains the full selection (selectedAmount, goldCost, etc.)
  } : customComponentData;
  
  return {
    numericModifiers,
    manualEffects: manualEffects || [],
    specialEffects: specialEffects || [],  // Include special effects (PreparedCommand pattern)
    complexActions: [], // Phase 3 will add support for this
    customComponentData: mergedCustomData  // Merged custom component data
  };
}
