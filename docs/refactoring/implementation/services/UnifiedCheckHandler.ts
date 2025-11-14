/**
 * UnifiedCheckHandler.ts
 * 
 * Central coordinator for all check resolution (actions, events, incidents).
 * Orchestrates the 9-step unified pipeline.
 * 
 * TO USE: Copy this file to src/services/UnifiedCheckHandler.ts
 */

import type { CheckPipeline, CheckType, OutcomeType } from '../types/CheckPipeline';
import type { CheckContext, CheckMetadata, ResolutionData } from '../types/CheckContext';
import type { PreviewData, SpecialEffect } from '../types/PreviewData';
import { createEmptyMetadata, createEmptyResolutionData } from '../types/CheckContext';
import { createEmptyPreviewData } from '../types/PreviewData';

/**
 * Main unified check handler service
 */
export class UnifiedCheckHandler {
  private pipelines = new Map<string, CheckPipeline>();
  
  constructor() {
    console.log('🔧 [UnifiedCheckHandler] Initializing');
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
    console.log(`✅ [UnifiedCheckHandler] Registered ${pipeline.checkType}: ${id}`);
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
   * 
   * TODO: Delegate to existing dialog systems:
   * - SettlementSelectionDialog
   * - FactionSelectionDialog
   * - ArmySelectionDialog
   * - StructureSelectionDialog
   */
  private async executeEntitySelection(interaction: any, kingdom: any): Promise<string | null> {
    console.log(`📋 [UnifiedCheckHandler] Entity selection: ${interaction.entityType}`);
    return null;  // Placeholder
  }
  
  /**
   * Execute map selection interaction
   * 
   * TODO: Delegate to HexSelectorService
   */
  private async executeMapSelection(interaction: any, kingdom: any): Promise<any> {
    console.log(`🗺️ [UnifiedCheckHandler] Map selection: ${interaction.mode}`);
    return null;  // Placeholder
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
   * 
   * TODO: Implement text input dialog
   */
  private async executeTextInput(interaction: any): Promise<string | null> {
    console.log(`✏️ [UnifiedCheckHandler] Text input: ${interaction.label}`);
    return null;  // Placeholder
  }
  
  /**
   * Execute skill check (delegates to existing system)
   * 
   * TODO: Delegate to ActionExecutionHelpers or equivalent
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
    
    // TODO: Delegate to ActionExecutionHelpers
    // This creates the roll, stores check instance, returns instanceId
    
    return 'instance-id-placeholder';
  }
  
  /**
   * Execute post-roll interactions
   * 
   * TODO: Get pipeline from instance
   * TODO: Execute post-roll interactions based on outcome
   * TODO: Build ResolutionData from user inputs
   * 
   * @returns Resolution data with user inputs
   */
  async executePostRollInteractions(
    instanceId: string,
    outcome: OutcomeType
  ): Promise<ResolutionData> {
    console.log(`🎯 [UnifiedCheckHandler] Executing post-roll interactions for ${instanceId}`);
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
   * TODO: Implement resource change application
   * TODO: Implement game command execution
   * TODO: Implement persistence handling
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
   * TODO: Delegate to GameCommandsService or updateKingdom
   */
  private async applyResourceChanges(
    changes: any[],
    kingdom: any
  ): Promise<void> {
    console.log(`💰 [UnifiedCheckHandler] Applying ${changes.length} resource changes`);
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
