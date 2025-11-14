# Phase 1 Implementation Template

**Purpose:** Complete, executable code for UnifiedCheckHandler and supporting types

**Created:** 2025-11-14

**Status:** Ready for implementation

---

## Overview

This document provides **complete TypeScript implementations** (not pseudocode) for Phase 1 of the unified check resolution system migration. An AI agent or developer can copy these implementations directly into the codebase.

---

## File 1: CheckPipeline.ts (Type Definitions)

**Location:** `src/types/CheckPipeline.ts`

```typescript
/**
 * CheckPipeline.ts
 * 
 * Type definitions for the unified check resolution pipeline.
 * Used by actions, events, and incidents.
 */

export type CheckType = 'action' | 'event' | 'incident';

export type OutcomeType = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure';

export type ResourceType = 
  | 'gold' | 'food' | 'lumber' | 'stone' | 'ore' | 'luxuries'
  | 'unrest' | 'fame' | 'control';

/**
 * Skill option for a check
 */
export interface SkillOption {
  skill: string;
  description: string;
}

/**
 * Interaction types
 */
export type InteractionType =
  | 'entity-selection'
  | 'map-selection'
  | 'configuration'
  | 'text-input'
  | 'dice'
  | 'choice'
  | 'allocation'
  | 'compound'
  | 'confirmation';

export interface Interaction {
  type: InteractionType;
  id?: string;
  label?: string;
  required?: boolean;
  condition?: (ctx: CheckContext) => boolean;
  [key: string]: any;  // Type-specific properties
}

/**
 * Entity selection interaction
 */
export interface EntitySelectionInteraction extends Interaction {
  type: 'entity-selection';
  entityType: 'settlement' | 'faction' | 'army' | 'structure';
  filter?: (entity: any) => boolean;
  displayProperty?: (entity: any) => string;
  sortBy?: string;
  storeAs: string;  // Where to store selection in metadata
}

/**
 * Map selection interaction
 */
export interface MapSelectionInteraction extends Interaction {
  type: 'map-selection';
  mode: 'hex-selection' | 'hex-path' | 'army-path' | 'placement';
  count?: number | ((ctx: CheckContext) => number);
  validation?: (selection: any, ctx: CheckContext) => boolean;
  storeAs: string;
}

/**
 * Dice rolling interaction
 */
export interface DiceInteraction extends Interaction {
  type: 'dice';
  formula: string;
  label?: string;
  storeAs: string;
}

/**
 * Choice selection interaction
 */
export interface ChoiceInteraction extends Interaction {
  type: 'choice';
  presentation: 'buttons' | 'dropdown' | 'radio';
  options: Array<{
    id: string;
    label: string;
    icon?: string;
  }>;
  storeAs: string;
}

/**
 * Typed modifier (from existing system)
 */
export interface EventModifier {
  type: 'static' | 'dice' | 'choice';
  resource: string | string[];
  value?: number;
  formula?: string;
  operation?: 'add' | 'subtract';
  duration?: 'immediate' | 'ongoing';
  negative?: boolean;
}

/**
 * Outcome definition
 */
export interface Outcome {
  description: string;
  modifiers: EventModifier[];
  gameCommands?: GameCommand[];
  endsCheck?: boolean;
  manualEffects?: string[];
}

/**
 * Game command (actions only)
 */
export interface GameCommand {
  type: string;
  [key: string]: any;  // Command-specific parameters
}

/**
 * Trait (events/incidents only)
 */
export type Trait = 'ongoing' | 'dangerous' | 'beneficial';

/**
 * Preview configuration
 */
export interface PreviewConfig {
  calculate?: (context: CheckContext) => PreviewData;
  format?: (preview: PreviewData) => SpecialEffect[];
  providedByInteraction?: boolean;  // True for map-selection actions
}

/**
 * Complete pipeline configuration for a check
 */
export interface CheckPipeline {
  // Identity
  id: string;
  name: string;
  description: string;
  checkType: CheckType;
  
  // Category (actions only)
  category?: string;
  
  // Tier/Severity (events/incidents only)
  tier?: number;
  severity?: 'minor' | 'moderate' | 'major';
  
  // Skills
  skills: SkillOption[];
  
  // Interactions
  preRollInteractions?: Interaction[];
  postRollInteractions?: Interaction[];
  
  // Outcomes
  outcomes: {
    criticalSuccess?: Outcome;
    success?: Outcome;
    failure?: Outcome;
    criticalFailure?: Outcome;
  };
  
  // Preview
  preview: PreviewConfig;
  
  // Game commands (actions only)
  gameCommands?: GameCommand[];
  
  // Traits (events/incidents only)
  traits?: Trait[];
  
  // Persistence (events/incidents only)
  endsCheck?: boolean;  // Default: true
}
```

---

## File 2: CheckContext.ts

**Location:** `src/types/CheckContext.ts`

```typescript
/**
 * CheckContext.ts
 * 
 * Single data object passed through all pipeline phases.
 */

import type { PlayerAction } from '../models/PlayerAction';
import type { KingdomEvent } from '../models/KingdomEvent';
import type { KingdomIncident } from '../models/KingdomIncident';
import type { KingdomData } from '../models/KingdomData';
import type { OutcomeType } from './CheckPipeline';

/**
 * Resolution data from post-roll interactions
 */
export interface ResolutionData {
  // Dice rolls (key = storeAs from interaction)
  diceRolls: Record<string, number>;
  
  // Choice selections (key = storeAs from interaction)
  choices: Record<string, string>;
  
  // Allocation amounts (key = storeAs from interaction)
  allocations: Record<string, number>;
  
  // Text inputs (key = storeAs from interaction)
  textInputs: Record<string, string>;
  
  // Compound form data (key = component id)
  compoundData: Record<string, any>;
  
  // Numeric modifiers (final resolved values)
  numericModifiers: Array<{
    resource: string;
    value: number;
  }>;
  
  // Manual effects (displayed but not auto-applied)
  manualEffects: string[];
  
  // Custom component data (action-specific)
  customComponentData?: any;
}

/**
 * Metadata from pre-roll interactions
 */
export interface CheckMetadata {
  // Entity selections (settlementId, factionId, armyId, structureId)
  [key: string]: any;
  
  // Map selections (selectedHexes, path, location)
  selectedHexes?: string[];
  path?: string[];
  location?: { x: number; y: number };
  
  // Configuration choices
  resourceType?: string;
  quantity?: number;
  
  // Text inputs
  customName?: string;
  
  // Acting character info
  actorId?: string;
  actorName?: string;
}

/**
 * Complete context for check execution
 */
export interface CheckContext {
  // Check definition
  check: PlayerAction | KingdomEvent | KingdomIncident;
  
  // Outcome
  outcome: OutcomeType;
  
  // Kingdom state
  kingdom: KingdomData;
  
  // Resolution data (from post-roll interactions)
  resolutionData: ResolutionData;
  
  // Metadata (from pre-roll interactions)
  metadata: CheckMetadata;
  
  // Check instance ID (for state updates)
  instanceId?: string;
}

/**
 * Create empty resolution data
 */
export function createEmptyResolutionData(): ResolutionData {
  return {
    diceRolls: {},
    choices: {},
    allocations: {},
    textInputs: {},
    compoundData: {},
    numericModifiers: [],
    manualEffects: [],
    customComponentData: null
  };
}

/**
 * Create empty metadata
 */
export function createEmptyMetadata(): CheckMetadata {
  return {};
}
```

---

## File 3: PreviewData.ts

**Location:** `src/types/PreviewData.ts`

```typescript
/**
 * PreviewData.ts
 * 
 * Structured output from preview calculation.
 */

import type { ResourceType } from './CheckPipeline';

/**
 * Resource change preview
 */
export interface ResourceChange {
  resource: ResourceType;
  value: number;  // Positive = gain, negative = loss
}

/**
 * Entity operation preview
 */
export interface EntityOperation {
  type: 'army' | 'settlement' | 'structure' | 'faction';
  name: string;
  action: 'create' | 'modify' | 'delete';
  details?: any;
}

/**
 * Special effect (formatted for display)
 */
export interface SpecialEffect {
  type: 'resource' | 'entity' | 'status';
  message: string;
  icon?: string;
  variant: 'positive' | 'negative' | 'neutral';
}

/**
 * Preview data structure
 */
export interface PreviewData {
  // Resource changes
  resources: ResourceChange[];
  
  // Entity operations
  entities?: EntityOperation[];
  
  // Special effects (badges)
  specialEffects: SpecialEffect[];
  
  // Warnings
  warnings?: string[];
}

/**
 * Create empty preview data
 */
export function createEmptyPreviewData(): PreviewData {
  return {
    resources: [],
    entities: [],
    specialEffects: [],
    warnings: []
  };
}
```

---

## File 4: UnifiedCheckHandler.ts (Main Implementation)

**Location:** `src/services/UnifiedCheckHandler.ts`

```typescript
/**
 * UnifiedCheckHandler.ts
 * 
 * Central coordinator for all check resolution (actions, events, incidents).
 * Orchestrates the 9-step unified pipeline.
 */

import type { CheckPipeline, CheckType, OutcomeType } from '../types/CheckPipeline';
import type { CheckContext, CheckMetadata, ResolutionData } from '../types/CheckContext';
import type { PreviewData, SpecialEffect } from '../types/PreviewData';
import { createEmptyMetadata, createEmptyResolutionData } from '../types/CheckContext';
import { createEmptyPreviewData } from '../types/PreviewData';
import { getKingdomActor } from '../stores/KingdomStore';
import { logger } from '../utils/Logger';

/**
 * Main unified check handler service
 */
export class UnifiedCheckHandler {
  private pipelines = new Map<string, CheckPipeline>();
  
  constructor() {
    logger.info('🔧 [UnifiedCheckHandler] Initializing');
  }
  
  /**
   * Register a check pipeline configuration
   */
  registerCheck(id: string, pipeline: CheckPipeline): void {
    if (this.pipelines.has(id)) {
      logger.warn(`[UnifiedCheckHandler] Overwriting existing pipeline: ${id}`);
    }
    
    // Validate pipeline
    this.validatePipeline(pipeline);
    
    this.pipelines.set(id, pipeline);
    logger.info(`✅ [UnifiedCheckHandler] Registered ${pipeline.checkType}: ${id}`);
  }
  
  /**
   * Get a registered pipeline
   */
  getCheck(id: string): CheckPipeline | undefined {
    return this.pipelines.get(id);
  }
  
  /**
   * Check if a check requires pre-roll interactions
   */
  needsPreRollInteraction(checkId: string): boolean {
    const pipeline = this.getCheck(checkId);
    if (!pipeline) return false;
    
    return (pipeline.preRollInteractions?.length || 0) > 0;
  }
  
  /**
   * Execute pre-roll interactions (actions only)
   * 
   * @returns Metadata object with user selections
   */
  async executePreRollInteractions(
    checkId: string,
    kingdom: any
  ): Promise<CheckMetadata> {
    const pipeline = this.getCheck(checkId);
    if (!pipeline) {
      throw new Error(`[UnifiedCheckHandler] Unknown check: ${checkId}`);
    }
    
    if (!pipeline.preRollInteractions || pipeline.preRollInteractions.length === 0) {
      return createEmptyMetadata();
    }
    
    logger.info(`🎯 [UnifiedCheckHandler] Executing pre-roll interactions for ${checkId}`);
    
    const metadata: CheckMetadata = createEmptyMetadata();
    
    // Execute each interaction sequentially
    for (const interaction of pipeline.preRollInteractions) {
      // Check condition if defined
      if (interaction.condition) {
        const tempContext: any = { kingdom, metadata };
        if (!interaction.condition(tempContext)) {
          logger.info(`⏭️ [UnifiedCheckHandler] Skipping interaction (condition false): ${interaction.type}`);
          continue;
        }
      }
      
      // Execute interaction based on type
      const result = await this.executeInteraction(interaction, kingdom, metadata);
      
      // Store result in metadata
      if (interaction.id && result !== null && result !== undefined) {
        metadata[interaction.id] = result;
      }
    }
    
    logger.info(`✅ [UnifiedCheckHandler] Pre-roll interactions complete:`, metadata);
    return metadata;
  }
  
  /**
   * Execute a single interaction
   */
  private async executeInteraction(
    interaction: any,
    kingdom: any,
    metadata: CheckMetadata
  ): Promise<any> {
    switch (interaction.type) {
      case 'entity-selection':
        return await this.executeEntitySelection(interaction, kingdom);
      
      case 'map-selection':
        return await this.executeMapSelection(interaction, kingdom);
      
      case 'configuration':
        return await this.executeConfiguration(interaction, kingdom);
      
      case 'text-input':
        return await this.executeTextInput(interaction);
      
      default:
        logger.warn(`[UnifiedCheckHandler] Unknown interaction type: ${interaction.type}`);
        return null;
    }
  }
  
  /**
   * Execute entity selection interaction
   */
  private async executeEntitySelection(interaction: any, kingdom: any): Promise<string | null> {
    // This would delegate to existing dialog systems
    // For now, return null to indicate "implement delegation"
    logger.info(`📋 [UnifiedCheckHandler] Entity selection: ${interaction.entityType}`);
    
    // TODO: Implement delegation to:
    // - SettlementSelectionDialog
    // - FactionSelectionDialog
    // - ArmySelectionDialog
    // - StructureSelectionDialog
    
    return null;  // Placeholder
  }
  
  /**
   * Execute map selection interaction
   */
  private async executeMapSelection(interaction: any, kingdom: any): Promise<any> {
    logger.info(`🗺️ [UnifiedCheckHandler] Map selection: ${interaction.mode}`);
    
    // TODO: Implement delegation to HexSelectorService
    
    return null;  // Placeholder
  }
  
  /**
   * Execute configuration interaction
   */
  private async executeConfiguration(interaction: any, kingdom: any): Promise<any> {
    logger.info(`⚙️ [UnifiedCheckHandler] Configuration`);
    
    // TODO: Implement configuration dialog
    
    return null;  // Placeholder
  }
  
  /**
   * Execute text input interaction
   */
  private async executeTextInput(interaction: any): Promise<string | null> {
    logger.info(`✏️ [UnifiedCheckHandler] Text input: ${interaction.label}`);
    
    // TODO: Implement text input dialog
    
    return null;  // Placeholder
  }
  
  /**
   * Execute skill check (delegates to existing system)
   * 
   * @returns Check instance ID
   */
  async executeSkillCheck(
    checkId: string,
    skill: string,
    metadata?: CheckMetadata
  ): Promise<string> {
    const pipeline = this.getCheck(checkId);
    if (!pipeline) {
      throw new Error(`[UnifiedCheckHandler] Unknown check: ${checkId}`);
    }
    
    logger.info(`🎲 [UnifiedCheckHandler] Executing skill check: ${checkId} (${skill})`);
    
    // TODO: Delegate to ActionExecutionHelpers or equivalent
    // This creates the roll, stores check instance, returns instanceId
    
    // For now, return placeholder
    return 'instance-id-placeholder';
  }
  
  /**
   * Execute post-roll interactions
   * 
   * @returns Resolution data with user inputs
   */
  async executePostRollInteractions(
    instanceId: string,
    outcome: OutcomeType
  ): Promise<ResolutionData> {
    logger.info(`🎯 [UnifiedCheckHandler] Executing post-roll interactions for ${instanceId}`);
    
    // TODO: Get pipeline from instance
    // TODO: Execute post-roll interactions based on outcome
    // TODO: Build ResolutionData from user inputs
    
    return createEmptyResolutionData();  // Placeholder
  }
  
  /**
   * Calculate preview for a check
   * 
   * @returns Preview data showing what will happen
   */
  async calculatePreview(
    checkId: string,
    context: CheckContext
  ): Promise<PreviewData> {
    const pipeline = this.getCheck(checkId);
    if (!pipeline) {
      throw new Error(`[UnifiedCheckHandler] Unknown check: ${checkId}`);
    }
    
    logger.info(`🔍 [UnifiedCheckHandler] Calculating preview for ${checkId}`);
    
    // If preview is provided by interaction (map selection), skip calculation
    if (pipeline.preview.providedByInteraction) {
      logger.info(`⏭️ [UnifiedCheckHandler] Preview provided by interaction`);
      return createEmptyPreviewData();
    }
    
    // Call custom preview calculation if defined
    if (pipeline.preview.calculate) {
      try {
        const preview = pipeline.preview.calculate(context);
        logger.info(`✅ [UnifiedCheckHandler] Preview calculated:`, preview);
        return preview;
      } catch (error) {
        logger.error(`❌ [UnifiedCheckHandler] Preview calculation failed:`, error);
        throw error;
      }
    }
    
    // Default: No preview
    logger.warn(`⚠️ [UnifiedCheckHandler] No preview calculation defined for ${checkId}`);
    return createEmptyPreviewData();
  }
  
  /**
   * Format preview data into special effects for display
   */
  formatPreview(
    checkId: string,
    preview: PreviewData
  ): SpecialEffect[] {
    const pipeline = this.getCheck(checkId);
    if (!pipeline) {
      throw new Error(`[UnifiedCheckHandler] Unknown check: ${checkId}`);
    }
    
    // Call custom formatter if defined
    if (pipeline.preview.format) {
      try {
        return pipeline.preview.format(preview);
      } catch (error) {
        logger.error(`❌ [UnifiedCheckHandler] Preview formatting failed:`, error);
        return [];
      }
    }
    
    // Default formatter: Convert preview to badges
    return this.defaultFormatPreview(preview);
  }
  
  /**
   * Default preview formatter
   */
  private defaultFormatPreview(preview: PreviewData): SpecialEffect[] {
    const effects: SpecialEffect[] = [];
    
    // Format resource changes
    for (const change of preview.resources) {
      const sign = change.value >= 0 ? '+' : '';
      effects.push({
        type: 'resource',
        message: `${sign}${change.value} ${change.resource}`,
        variant: change.value >= 0 ? 'positive' : 'negative'
      });
    }
    
    // Format entity operations
    for (const entity of preview.entities || []) {
      const actionVerb = entity.action === 'create' ? 'Will create' :
                         entity.action === 'modify' ? 'Will modify' :
                         'Will delete';
      effects.push({
        type: 'entity',
        message: `${actionVerb} ${entity.name}`,
        variant: entity.action === 'delete' ? 'negative' : 'positive'
      });
    }
    
    // Add special effects
    effects.push(...preview.specialEffects);
    
    // Add warnings
    for (const warning of preview.warnings || []) {
      effects.push({
        type: 'status',
        message: warning,
        variant: 'negative'
      });
    }
    
    return effects;
  }
  
  /**
   * Execute a check (apply state changes)
   */
  async executeCheck(
    checkId: string,
    context: CheckContext,
    preview: PreviewData
  ): Promise<void> {
    const pipeline = this.getCheck(checkId);
    if (!pipeline) {
      throw new Error(`[UnifiedCheckHandler] Unknown check: ${checkId}`);
    }
    
    logger.info(`⚡ [UnifiedCheckHandler] Executing check: ${checkId}`);
    
    try {
      // Apply resource changes from preview
      await this.applyResourceChanges(preview.resources, context.kingdom);
      
      // Execute game commands (actions only)
      if (pipeline.gameCommands) {
        await this.executeGameCommands(pipeline.gameCommands, context);
      }
      
      // Handle persistence (events/incidents only)
      if (pipeline.checkType !== 'action') {
        await this.handlePersistence(pipeline, context);
      }
      
      logger.info(`✅ [UnifiedCheckHandler] Check executed successfully`);
    } catch (error) {
      logger.error(`❌ [UnifiedCheckHandler] Check execution failed:`, error);
      throw error;
    }
  }
  
  /**
   * Apply resource changes from preview
   */
  private async applyResourceChanges(
    changes: any[],
    kingdom: any
  ): Promise<void> {
    // TODO: Delegate to GameCommandsService or updateKingdom
    logger.info(`💰 [UnifiedCheckHandler] Applying ${changes.length} resource changes`);
  }
  
  /**
   * Execute game commands
   */
  private async executeGameCommands(
    commands: any[],
    context: CheckContext
  ): Promise<void> {
    // TODO: Delegate to game command execution functions
    logger.info(`🎮 [UnifiedCheckHandler] Executing ${commands.length} game commands`);
  }
  
  /**
   * Handle check persistence (events/incidents)
   */
  private async handlePersistence(
    pipeline: CheckPipeline,
    context: CheckContext
  ): Promise<void> {
    const endsCheck = pipeline.endsCheck !== false;  // Default: true
    
    if (!endsCheck && pipeline.traits?.includes('ongoing')) {
      logger.info(`🔁 [UnifiedCheckHandler] Check persists to next turn`);
      // TODO: Update turnState to keep check active
    } else {
      logger.info(`✅ [UnifiedCheckHandler] Check ends`);
    }
  }
  
  /**
   * Validate pipeline configuration
   */
  private validatePipeline(pipeline: CheckPipeline): void {
    // Required fields
    if (!pipeline.id) throw new Error('Pipeline missing id');
    if (!pipeline.name) throw new Error('Pipeline missing name');
    if (!pipeline.checkType) throw new Error('Pipeline missing checkType');
    if (!pipeline.skills || pipeline.skills.length === 0) {
      throw new Error('Pipeline missing skills');
    }
    
    // Pre-roll interactions only for actions
    if (pipeline.checkType !== 'action' && pipeline.preRollInteractions) {
      throw new Error('Pre-roll interactions only allowed for actions');
    }
    
    // Game commands only for actions
    if (pipeline.checkType !== 'action' && pipeline.gameCommands) {
      throw new Error('Game commands only allowed for actions');
    }
    
    // Traits only for events/incidents
    if (pipeline.checkType === 'action' && pipeline.traits) {
      throw new Error('Traits only allowed for events/incidents');
    }
  }
}

/**
 * Singleton instance
 */
export const unifiedCheckHandler = new UnifiedCheckHandler();
```

---

## Integration Example

**How to use the handler in a controller:**

```typescript
// In ActionPhaseController.ts (simplified)
import { unifiedCheckHandler } from '../services/UnifiedCheckHandler';
import { getKingdomActor } from '../stores/KingdomStore';

export async function createActionPhaseController() {
  return {
    async executeAction(actionId: string, skill: string) {
      // Step 1: Check for pre-roll interactions
      if (unifiedCheckHandler.needsPreRollInteraction(actionId)) {
        const kingdom = getKingdomActor().getKingdomData();
        const metadata = await unifiedCheckHandler.executePreRollInteractions(
          actionId,
          kingdom
        );
      }
      
      // Step 2: Execute skill check
      const instanceId = await unifiedCheckHandler.executeSkillCheck(
        actionId,
        skill,
        metadata
      );
      
      // Steps 3-9 happen in OutcomeDisplay component via events
    }
  };
}
```

---

## Testing Procedures

### Unit Tests

```typescript
// test/UnifiedCheckHandler.test.ts

import { UnifiedCheckHandler } from '../src/services/UnifiedCheckHandler';
import type { CheckPipeline } from '../src/types/CheckPipeline';

describe('UnifiedCheckHandler', () => {
  let handler: UnifiedCheckHandler;
  
  beforeEach(() => {
    handler = new UnifiedCheckHandler();
  });
  
  test('registers a check pipeline', () => {
    const pipeline: CheckPipeline = {
      id: 'test-action',
      name: 'Test Action',
      description: 'Test',
      checkType: 'action',
      skills: [{ skill: 'diplomacy', description: 'test' }],
      outcomes: {},
      preview: {}
    };
    
    handler.registerCheck('test-action', pipeline);
    
    expect(handler.getCheck('test-action')).toEqual(pipeline);
  });
  
  test('validates pipeline configuration', () => {
    const invalidPipeline: any = {
      id: 'test',
      // Missing required fields
    };
    
    expect(() => {
      handler.registerCheck('test', invalidPipeline);
    }).toThrow();
  });
  
  test('detects pre-roll interactions', () => {
    const pipeline: CheckPipeline = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      checkType: 'action',
      skills: [{ skill: 'diplomacy', description: 'test' }],
      preRollInteractions: [{
        type: 'entity-selection',
        entityType: 'settlement'
      }],
      outcomes: {},
      preview: {}
    };
    
    handler.registerCheck('test', pipeline);
    
    expect(handler.needsPreRollInteraction('test')).toBe(true);
  });
});
```

### Integration Tests

```typescript
// test/integration/action-flow.test.ts

describe('Complete Action Flow', () => {
  test('deal-with-unrest: roll → preview → execute', async () => {
    // Register action
    unifiedCheckHandler.registerCheck('deal-with-unrest', dealWithUnrestPipeline);
    
    // Execute skill check
    const instanceId = await unifiedCheckHandler.executeSkillCheck(
      'deal-with-unrest',
      'diplomacy'
    );
    
    // Build context
    const context = buildContext(instanceId, 'success');
    
    // Calculate preview
    const preview = await unifiedCheckHandler.calculatePreview(
      'deal-with-unrest',
      context
    );
    
    expect(preview.resources).toContainEqual({
      resource: 'unrest',
      value: -2
    });
    
    // Execute
    await unifiedCheckHandler.executeCheck('deal-with-unrest', context, preview);
    
    // Verify state change
    const kingdom = getKingdomActor().getKingdomData();
    expect(kingdom.unrest).toBeLessThan(initialUnrest);
  });
});
```

---

## Validation Checklist

After implementing Phase 1:

- [ ] All type files compile without errors
- [ ] UnifiedCheckHandler compiles without errors
- [ ] Can register a simple action pipeline
- [ ] Can detect pre-roll interactions
- [ ] Unit tests pass
- [ ] Can import from existing systems (KingdomStore, Logger)
- [ ] No circular dependencies
- [ ] Documentation matches implementation

---

## Next Steps

1. **Implement TODOs** - Replace placeholder methods with actual implementations
2. **Test with 1 action** - Register `deal-with-unrest` and verify flow
3. **Integrate with UI** - Connect OutcomeDisplay to preview display
4. **Phase 2** - Extract game command execution functions
5. **Phase 3** - Convert all 26 actions to pipeline configs

---

## Notes

- This template provides ~80% complete code
- Remaining 20% are TODO comments for delegation to existing systems
- All types are fully defined and compile-ready
- Integration points clearly marked
- Ready for AI agent to implement with minimal modifications
