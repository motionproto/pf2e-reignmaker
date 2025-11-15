/**
 * UnifiedCheckHandler.ts
 *
 * Central coordinator for all check resolution (actions, events, incidents).
 * Orchestrates the 9-step unified pipeline.
 *
 * TO USE: Copy this file to src/services/UnifiedCheckHandler.ts
 *
 * NOTE: TypeScript errors about '../types/*' and '../controllers/*' not found are EXPECTED
 * in this template directory. These imports will work once the file is copied to src/services/
 */

import type { CheckPipeline, CheckType, OutcomeType } from '../types/CheckPipeline';
import type { CheckContext, CheckMetadata, ResolutionData } from '../types/CheckContext';
import type { PreviewData, SpecialEffect } from '../types/PreviewData';
import { createEmptyMetadata, createEmptyResolutionData } from '../types/CheckContext';
import { createEmptyPreviewData } from '../types/PreviewData';

// Import existing services (work once copied to src/)
import { executeRoll } from '../controllers/shared/ExecutionHelpers';
import { hexSelectorService } from './hex-selector';
import { updateKingdom, getKingdomActor } from '../stores/KingdomStore';
import { CheckInstanceService } from './CheckInstanceService';
import { showEntitySelectionDialog, showTextInputDialog, showConfirmationDialog } from './InteractionDialogs';

/**
 * Main unified check handler service
 */
export class UnifiedCheckHandler {
  private pipelines = new Map<string, CheckPipeline>();
  private checkInstanceService: CheckInstanceService;

  constructor() {
    console.log('🔧 [UnifiedCheckHandler] Initializing');
    this.checkInstanceService = new CheckInstanceService();
  }

  /**
   * Register a check pipeline configuration
   */
  registerCheck(id: string, pipeline: CheckPipeline): void {
    if (this.pipelines.has(id)) {
      console.warn(`[UnifiedCheckHandler] Overwriting existing pipeline: ${id}`);
    }

    // Validate pipeline
    this.validatePipeline(pipeline);

    this.pipelines.set(id, pipeline);
    console.log(`✅ [UnifiedCheckHandler] Registered ${pipeline.checkType}: ${id} (total: ${this.pipelines.size})`);
  }

  /**
   * Get a registered pipeline
   */
  getCheck(id: string): CheckPipeline | undefined {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) {
      console.warn(`[UnifiedCheckHandler] Pipeline '${id}' not found. Available: [${Array.from(this.pipelines.keys()).join(', ')}]`);
    }
    return pipeline;
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

    console.log(`🎯 [UnifiedCheckHandler] Executing pre-roll interactions for ${checkId}`);

    const metadata: CheckMetadata = createEmptyMetadata();

    // Execute each interaction sequentially
    for (const interaction of pipeline.preRollInteractions) {
      // Check condition if defined
      if (interaction.condition) {
        const tempContext: any = { kingdom, metadata };
        if (!interaction.condition(tempContext)) {
          console.log(`⏭️ [UnifiedCheckHandler] Skipping interaction (condition false): ${interaction.type}`);
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

    console.log(`✅ [UnifiedCheckHandler] Pre-roll interactions complete:`, metadata);
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
        console.warn(`[UnifiedCheckHandler] Unknown interaction type: ${interaction.type}`);
        return null;
    }
  }

  /**
   * Execute entity selection interaction
   */
  private async executeEntitySelection(interaction: any, kingdom: any): Promise<any> {
    console.log(`📋 [UnifiedCheckHandler] Entity selection: ${interaction.entityType}`);

    const selectedId = await showEntitySelectionDialog(
      interaction.entityType,
      interaction.label,
      interaction.filter
    );

    if (!selectedId) {
      console.log(`⏭️ [UnifiedCheckHandler] Entity selection cancelled`);
      return null;
    }

    // Get entity details for metadata
    let entity: any = null;
    switch (interaction.entityType) {
      case 'settlement':
        entity = kingdom.settlements?.find((s: any) => s.id === selectedId);
        break;
      case 'army':
        entity = kingdom.armies?.find((a: any) => a.id === selectedId);
        break;
      case 'faction':
        entity = kingdom.factions?.find((f: any) => f.id === selectedId);
        break;
    }

    console.log(`✅ [UnifiedCheckHandler] Selected ${interaction.entityType}: ${entity?.name || selectedId}`);

    // Return both ID and name for metadata
    return {
      id: selectedId,
      name: entity?.name || 'Unknown'
    };
  }

  /**
   * Execute map selection interaction
   *
   * Delegates to existing HexSelectorService
   */
  private async executeMapSelection(interaction: any, kingdom: any): Promise<any> {
    console.log(`🗺️ [UnifiedCheckHandler] Map selection: ${interaction.mode}`);

    try {
      // Use existing HexSelectorService
      const result = await hexSelectorService.selectHexes({
        title: interaction.title,
        count: interaction.count,
        colorType: interaction.colorType || 'claim',
        validationFn: interaction.validation,
        customSelector: interaction.customSelector  // ✅ Pass custom selector if provided
      });

      return result;
    } catch (error) {
      console.error(`❌ [UnifiedCheckHandler] Map selection failed:`, error);
      return null;
    }
  }

  /**
   * Execute configuration interaction
   *
   * TODO: Implement configuration dialog
   */
  private async executeConfiguration(interaction: any, kingdom: any): Promise<any> {
    console.log(`⚙️ [UnifiedCheckHandler] Configuration`);
    return null;  // Placeholder
  }

  /**
   * Execute text input interaction
   */
  private async executeTextInput(interaction: any): Promise<string | null> {
    console.log(`✏️ [UnifiedCheckHandler] Text input: ${interaction.label}`);

    const text = await showTextInputDialog(
      interaction.label || 'Enter text',
      interaction.defaultValue || ''
    );

    if (!text) {
      console.log(`⏭️ [UnifiedCheckHandler] Text input cancelled`);
      return null;
    }

    console.log(`✅ [UnifiedCheckHandler] Text input: ${text}`);
    return text;
  }

  /**
   * Execute skill check (delegates to existing ExecutionHelpers)
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

    console.log(`🎲 [UnifiedCheckHandler] Executing skill check: ${checkId} (${skill})`);

    // Use existing ExecutionHelpers.executeRoll()
    const context = {
      type: pipeline.checkType === 'action' ? 'action' as const : 'event' as const,
      id: checkId,
      skill,
      metadata
    };

    const config = {
      getDC: (level: number) => this.calculateDC(level, pipeline),
      onRollStart: () => console.log('[UnifiedCheckHandler] Roll started'),
      onRollCancel: () => console.log('[UnifiedCheckHandler] Roll cancelled')
    };

    await executeRoll(context, config);

    // TODO: Get actual instance ID from CheckInstanceService
    // For now, return placeholder - will be improved in Phase 1 implementation
    return 'instance-id-placeholder';
  }

  /**
   * Calculate DC based on character level and check tier
   */
  private calculateDC(characterLevel: number, pipeline: CheckPipeline): number {
    // Simple DC calculation - can be enhanced later
    const baseDC = 15;
    const tierAdjustment = (pipeline.tier || 1) * 2;
    return baseDC + tierAdjustment;
  }

  /**
   * Execute post-apply interactions
   *
   * Gets the check instance, retrieves the pipeline, and executes post-apply
   * interactions (AFTER Apply button clicked) based on the outcome.
   * Returns collected resolution data.
   *
   * @param instanceId - Check instance ID
   * @param outcome - Check outcome
   * @returns Resolution data with user inputs
   */
  async executePostApplyInteractions(
    instanceId: string,
    outcome: OutcomeType
  ): Promise<ResolutionData> {
    console.log(`🎯 [UnifiedCheckHandler] Executing post-apply interactions for ${instanceId} (${outcome})`);

    // Get the check instance
    const actor = getKingdomActor();
    if (!actor) {
      console.error('[UnifiedCheckHandler] No kingdom actor available');
      return createEmptyResolutionData();
    }

    const kingdom = actor.getKingdomData();
    if (!kingdom) {
      console.error('[UnifiedCheckHandler] No kingdom data available');
      return createEmptyResolutionData();
    }

    const instance = this.checkInstanceService.getInstance(instanceId, kingdom);
    if (!instance) {
      console.error(`[UnifiedCheckHandler] Instance not found: ${instanceId}`);
      return createEmptyResolutionData();
    }

    // Get the pipeline
    const pipeline = this.getCheck(instance.checkId);
    if (!pipeline) {
      console.error(`[UnifiedCheckHandler] Pipeline not found: ${instance.checkId}`);
      return createEmptyResolutionData();
    }

    // Check if there are post-apply interactions
    if (!pipeline.postApplyInteractions || pipeline.postApplyInteractions.length === 0) {
      console.log(`⏭️ [UnifiedCheckHandler] No post-apply interactions for ${instance.checkId}`);
      return createEmptyResolutionData();
    }

    // ✅ BUILD FULL CONTEXT WITH ACTOR DATA
    const context: CheckContext = {
      check: instance.checkData,
      outcome,
      kingdom,
      actor: instance.metadata?.actor,  // Actor context from instance metadata
      resolutionData: createEmptyResolutionData(),
      metadata: instance.metadata || {},
      instanceId
    };

    const resolutionData: ResolutionData = createEmptyResolutionData();

    // Execute each interaction sequentially
    for (const interaction of pipeline.postApplyInteractions) {
      // Check condition if defined
      if (interaction.condition) {
        const tempContext: any = {
          ...context,
          resolutionData
        };
        if (!interaction.condition(tempContext)) {
          console.log(`⏭️ [UnifiedCheckHandler] Skipping interaction (condition false): ${interaction.type}`);
          continue;
        }
      }

      // Adjust interaction parameters based on outcome if needed (with full context)
      const adjustedInteraction = this.adjustInteractionForOutcome(interaction, outcome, context);

      // Execute interaction based on type
      const result = await this.executeInteraction(adjustedInteraction, kingdom, instance.metadata || {});

      // ✅ NEW: Call onComplete handler if defined (executes custom logic with user selections)
      if (interaction.onComplete && result !== null && result !== undefined) {
        console.log(`🎯 [UnifiedCheckHandler] Calling onComplete handler for ${interaction.type}`);
        try {
          await interaction.onComplete(result, context);
        } catch (error) {
          console.error(`❌ [UnifiedCheckHandler] onComplete handler failed:`, error);
          throw error;
        }
      }

      // Store result in resolution data based on interaction type
      if (interaction.id && result !== null && result !== undefined) {
        switch (interaction.type) {
          case 'map-selection':
            // Map selection returns array of hex IDs
            if (!resolutionData.compoundData) {
              resolutionData.compoundData = {};
            }
            resolutionData.compoundData[interaction.id] = result;
            break;

          case 'entity-selection':
            // Entity selection returns { id, name }
            if (!resolutionData.customComponentData) {
              resolutionData.customComponentData = {};
            }
            resolutionData.customComponentData[interaction.id] = result.id;
            resolutionData.customComponentData[`${interaction.id}Name`] = result.name;
            break;

          case 'text-input':
            // Text input returns string
            if (!resolutionData.textInputs) {
              resolutionData.textInputs = {};
            }
            resolutionData.textInputs[interaction.id] = result;
            break;

          default:
            // Store in custom component data by default
            if (!resolutionData.customComponentData) {
              resolutionData.customComponentData = {};
            }
            resolutionData.customComponentData[interaction.id] = result;
        }
      }
    }

    console.log(`✅ [UnifiedCheckHandler] Post-roll interactions complete:`, resolutionData);
    return resolutionData;
  }

  /**
   * Adjust interaction parameters based on outcome
   *
   * For example, claim-hexes needs different hex counts based on outcome:
   * - criticalSuccess: proficiency-based count (2-4)
   * - success: 1 hex
   * - failure/criticalFailure: no interaction
   */
  private adjustInteractionForOutcome(
    interaction: any,
    outcome: OutcomeType,
    context: CheckContext  // ✅ CHANGED: Pass full context instead of instance
  ): any {
    // Clone interaction to avoid mutating the pipeline
    const adjusted = { ...interaction };

    // Special handling for map-selection interactions
    if (interaction.type === 'map-selection' && interaction.outcomeAdjustment) {
      const adjustment = interaction.outcomeAdjustment[outcome];
      if (adjustment) {
        // Apply outcome-specific adjustments
        if (adjustment.count !== undefined) {
          // ✅ NEW: Support function-based counts
          if (typeof adjustment.count === 'function') {
            adjusted.count = adjustment.count(context);
            console.log(`🔢 [UnifiedCheckHandler] Dynamic count evaluated: ${adjusted.count}`);
          } else {
            adjusted.count = adjustment.count;
          }
        }
        if (adjustment.title !== undefined) {
          adjusted.title = adjustment.title;
        }
      }
    }

    return adjusted;
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

    console.log(`🔍 [UnifiedCheckHandler] Calculating preview for ${checkId}`);

    // If preview is provided by interaction (map selection), skip calculation
    if (pipeline.preview.providedByInteraction) {
      console.log(`⏭️ [UnifiedCheckHandler] Preview provided by interaction`);
      return createEmptyPreviewData();
    }

    // Call custom preview calculation if defined
    if (pipeline.preview.calculate) {
      try {
        const preview = pipeline.preview.calculate(context);
        console.log(`✅ [UnifiedCheckHandler] Preview calculated:`, preview);
        return preview;
      } catch (error) {
        console.error(`❌ [UnifiedCheckHandler] Preview calculation failed:`, error);
        throw error;
      }
    }

    // Default: No preview
    console.warn(`⚠️ [UnifiedCheckHandler] No preview calculation defined for ${checkId}`);
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
        console.error(`❌ [UnifiedCheckHandler] Preview formatting failed:`, error);
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
   *
   * If pipeline has a custom execute function, uses that.
   * Otherwise, uses default behavior (resource changes + game commands).
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

    console.log(`⚡ [UnifiedCheckHandler] Executing check: ${checkId}`);

    try {
      // Check if pipeline has custom execute function
      if (pipeline.execute) {
        console.log(`🎯 [UnifiedCheckHandler] Using custom execute function`);
        const result = await pipeline.execute(context);
        
        if (!result.success) {
          throw new Error(result.error || 'Custom execution failed');
        }
        
        if (result.message) {
          console.log(`💬 [UnifiedCheckHandler] ${result.message}`);
        }
        
        console.log(`✅ [UnifiedCheckHandler] Custom execution succeeded`);
        return;
      }

      // Default execution path (no custom execute function)
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

      console.log(`✅ [UnifiedCheckHandler] Check executed successfully`);
    } catch (error) {
      console.error(`❌ [UnifiedCheckHandler] Check execution failed:`, error);
      throw error;
    }
  }

  /**
   * Apply resource changes from preview
   *
   * Uses existing updateKingdom() from KingdomStore
   */
  private async applyResourceChanges(
    changes: any[],
    kingdom: any
  ): Promise<void> {
    console.log(`💰 [UnifiedCheckHandler] Applying ${changes.length} resource changes`);

    if (changes.length === 0) return;

    await updateKingdom((k) => {
      for (const change of changes) {
        const resource = change.resource;
        const value = change.value;

        // Apply the change to the kingdom data (cast to any for dynamic key access)
        if (typeof (k as any)[resource] === 'number') {
          (k as any)[resource] += value;
        } else {
          console.warn(`[UnifiedCheckHandler] Unknown resource: ${resource}`);
        }
      }
    });
  }

  /**
   * Execute game commands
   *
   * TODO: Delegate to game command execution functions
   */
  private async executeGameCommands(
    commands: any[],
    context: CheckContext
  ): Promise<void> {
    console.log(`🎮 [UnifiedCheckHandler] Executing ${commands.length} game commands`);
  }

  /**
   * Handle check persistence (events/incidents)
   *
   * TODO: Update turnState to keep check active
   */
  private async handlePersistence(
    pipeline: CheckPipeline,
    context: CheckContext
  ): Promise<void> {
    const endsCheck = pipeline.endsCheck !== false;  // Default: true

    if (!endsCheck && pipeline.traits?.includes('ongoing')) {
      console.log(`🔁 [UnifiedCheckHandler] Check persists to next turn`);
    } else {
      console.log(`✅ [UnifiedCheckHandler] Check ends`);
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
