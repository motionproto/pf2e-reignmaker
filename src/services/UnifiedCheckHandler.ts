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
import type { PreviewData } from '../types/PreviewData';
import { createEmptyMetadata, createEmptyResolutionData } from '../types/CheckContext';
import { createEmptyPreviewData } from '../types/PreviewData';
import type { ResourceType } from '../types/modifiers';

// Import existing services (work once copied to src/)
import { executeRoll } from '../controllers/shared/ExecutionHelpers';
import { hexSelectorService } from './hex-selector';
import { updateKingdom, getKingdomActor } from '../stores/KingdomStore';
import { OutcomePreviewService } from './OutcomePreviewService';
import { showEntitySelectionDialog, showTextInputDialog, showConfirmationDialog, showChoiceDialog } from './InteractionDialogs';
import { createGameCommandsService } from './GameCommandsService';

/**
 * Main unified check handler service
 */
export class UnifiedCheckHandler {
  private pipelines = new Map<string, CheckPipeline>();
  private checkInstanceService: OutcomePreviewService;

  constructor() {
    console.log('🔧 [UnifiedCheckHandler] Initializing');
    this.checkInstanceService = new OutcomePreviewService();
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
    if (!pipeline) {
      console.log(`❌ [UnifiedCheckHandler.needsPreRollInteraction] Pipeline not found: ${checkId}`);
      return false;
    }

    const hasInteractions = (pipeline.preRollInteractions?.length || 0) > 0;
    console.log(`🔍 [UnifiedCheckHandler.needsPreRollInteraction] ${checkId}: ${hasInteractions} (${pipeline.preRollInteractions?.length || 0} interactions)`);
    return hasInteractions;
  }

  /**
   * Execute pre-roll interactions (actions only)
   *
   * @param checkId - The action/check ID
   * @param kingdom - Kingdom data
   * @param initialMetadata - Optional initial metadata (e.g., for rerolls where selections are already made)
   * @returns Metadata object with user selections
   */
  async executePreRollInteractions(
    checkId: string,
    kingdom: any,
    initialMetadata?: CheckMetadata
  ): Promise<CheckMetadata> {
    const pipeline = this.getCheck(checkId);
    if (!pipeline) {
      throw new Error(`[UnifiedCheckHandler] Unknown check: ${checkId}`);
    }

    if (!pipeline.preRollInteractions || pipeline.preRollInteractions.length === 0) {
      return initialMetadata || createEmptyMetadata();
    }

    console.log(`🎯 [UnifiedCheckHandler] Executing pre-roll interactions for ${checkId}`);

    // Start with initial metadata if provided (allows skipping interactions for rerolls)
    const metadata: CheckMetadata = { ...createEmptyMetadata(), ...initialMetadata };

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

      // Check if user cancelled a required interaction
      if ((result === null || result === undefined) && interaction.required !== false) {
        console.log(`❌ [UnifiedCheckHandler] Required interaction cancelled by user: ${interaction.type}`);
        throw new Error('Action cancelled by user');
      }

      // Store result in metadata
      if (interaction.id && result !== null && result !== undefined) {
        metadata[interaction.id] = result;
      }

      // Call onComplete handler if defined (allows custom metadata processing)
      if (interaction.onComplete && result !== null && result !== undefined) {
        console.log(`🎯 [UnifiedCheckHandler] Calling onComplete handler for pre-roll interaction: ${interaction.id}`);
        try {
          // Create temp context for onComplete (metadata + kingdom)
          const tempContext: any = { metadata, kingdom };
          await interaction.onComplete(result, tempContext);
        } catch (error) {
          console.error(`❌ [UnifiedCheckHandler] onComplete handler failed:`, error);
          throw error;
        }
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
        return await this.executeEntitySelection(interaction, kingdom, metadata);

      case 'map-selection':
        return await this.executeMapSelection(interaction, kingdom, metadata);

      case 'configuration':
        return await this.executeConfiguration(interaction, kingdom, metadata);

      case 'text-input':
        return await this.executeTextInput(interaction);

      case 'choice':
        return await this.executeChoice(interaction);

      default:
        console.warn(`[UnifiedCheckHandler] Unknown interaction type: ${interaction.type}`);
        return null;
    }
  }

  /**
   * Execute entity selection interaction
   */
  private async executeEntitySelection(interaction: any, kingdom: any, metadata?: CheckMetadata): Promise<any> {
    console.log(`📋 [UnifiedCheckHandler] Entity selection: ${interaction.entityType}`);

    // ✅ REROLL OPTIMIZATION: Skip if metadata already has this interaction's data
    // This allows rerolls to preserve selections (e.g., settlement selection doesn't re-show)
    if (interaction.id && metadata && metadata[interaction.id]) {
      console.log(`⏭️ [UnifiedCheckHandler] Skipping entity selection (metadata already exists): ${interaction.id}`);
      return metadata[interaction.id];
    }

    const selectedId = await showEntitySelectionDialog(
      interaction.entityType,
      interaction.label,
      interaction.filter,
      kingdom,  // ✅ Pass kingdom data to filter
      interaction.getSupplementaryInfo  // ✅ Pass supplementary info function
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
   * Delegates to existing HexSelectorService or ArmyDeploymentPanel for hex-path mode
   */
  private async executeMapSelection(interaction: any, kingdom: any, metadata?: any): Promise<any> {
    console.log(`🗺️ [UnifiedCheckHandler] Map selection: ${interaction.mode || 'default'}`);

    // Build full context for function evaluation
    // CRITICAL: Get fresh kingdom data to ensure we have latest instance metadata
    // The instance was created/updated in previous pipeline steps, so we need fresh data
    const actor = getKingdomActor();
    const freshKingdom = actor?.getKingdomData() || kingdom;
    
    const context: any = {
      kingdom: freshKingdom,
      outcome: metadata?.outcome,
      metadata,
      instanceId: metadata?.instanceId
    };

    // Special case: hex-path mode uses ArmyDeploymentPanel for integrated UX
    // This provides the correct UX: army selection happens first, then path plotting
    if (interaction.mode === 'hex-path') {
      // Check if deployment data was already provided (e.g., for rerolls)
      // This allows skipping the panel when we already have the selection
      if (metadata?.deployment?.armyId && metadata?.deployment?.path?.length >= 2) {
        console.log(`✅ [UnifiedCheckHandler] Using existing deployment metadata (reroll case)`);
        return metadata.deployment;
      }
      
      try {
        const { armyDeploymentPanel } = await import('./army/ArmyDeploymentPanel');
        const { getKingdomData } = await import('../stores/KingdomStore');
        
        // Use ArmyDeploymentPanel to handle army selection + path plotting together
        // The panel shows army list, user selects army, then plots path
        return new Promise((resolve) => {
          let selectionResolved = false;
          
          // Create callback that intercepts the "Done" click
          // The callback receives armyId and path as parameters
          // Return selection data immediately but keep panel active to listen for roll completion
          const onSelectionComplete = async (skill: string, armyId: string, path: string[]) => {
            if (!armyId || !path || path.length < 2) {
              if (!selectionResolved) {
                selectionResolved = true;
                resolve(null);
              }
              return;
            }
            
            // Get army name
            const kingdom = getKingdomData();
            const army = kingdom?.armies?.find((a: any) => a.id === armyId);
            
            const result = {
              armyId: armyId,
              path: path,
              armyName: army?.name || 'Unknown'
            };
            
            if (!selectionResolved) {
              selectionResolved = true;
              
              // Deactivate movement mode (no longer needed for path plotting)
              // But DON'T clean up the panel - it needs to stay active to listen for roll completion
              try {
                const { armyMovementMode } = await import('./army/movementMode');
                if (armyMovementMode.isActive()) {
                  armyMovementMode.deactivate();
                }
              } catch (cleanupError) {
                console.warn('[UnifiedCheckHandler] Error during movement mode cleanup:', cleanupError);
              }
              
              // Resolve immediately with selection data so pipeline can proceed
              // Panel will remain active and update when roll completes
              resolve(result);
            }
          };
          
          // Start the panel with our callback
          // When user clicks "Done", onSelectionComplete will be called with armyId and path
          // We don't await the promise - it will resolve when callback is called
          armyDeploymentPanel.selectArmyAndPlotPath(
            'survival', // Skill doesn't matter - pipeline will handle the roll
            onSelectionComplete
          ).catch((error: any) => {
            if (!selectionResolved) {
              selectionResolved = true;
              console.error(`❌ [UnifiedCheckHandler] Army deployment failed:`, error);
              resolve(null);
            }
          });
        });
      } catch (error) {
        console.error(`❌ [UnifiedCheckHandler] Failed to import ArmyDeploymentPanel:`, error);
        return null;
      }
    }

    // Default: Use HexSelectorService for other modes
    try {
      // Evaluate functions that provide dynamic values
      const config: any = {
        title: typeof interaction.title === 'function' 
          ? interaction.title(context)
          : interaction.title,
        count: typeof interaction.count === 'function'
          ? interaction.count(context)
          : interaction.count,
        colorType: interaction.colorType || 'claim',
        mode: interaction.mode || 'select',  // Pass through mode (default: 'select')
        validateHex: interaction.validateHex,
        customSelector: interaction.customSelector,
        getHexInfo: interaction.getHexInfo
          ? (hexId: string) => interaction.getHexInfo(hexId, context)
          : undefined
      };
      
      // Add optional properties if defined
      if (interaction.existingHexes !== undefined) {
        config.existingHexes = typeof interaction.existingHexes === 'function'
          ? interaction.existingHexes(context)
          : interaction.existingHexes;
      }
      
      if (interaction.allowToggle !== undefined) {
        config.allowToggle = interaction.allowToggle;
      }
      
      console.log(`🗺️ [UnifiedCheckHandler] Hex selector config:`, {
        title: config.title,
        count: config.count,
        colorType: config.colorType,
        mode: config.mode,
        existingHexesCount: config.existingHexes?.length || 0,
        existingHexes: config.existingHexes,
        allowToggle: config.allowToggle
      });
      
      const result = await hexSelectorService.selectHexes(config);

      return result;
    } catch (error) {
      console.error(`❌ [UnifiedCheckHandler] Map selection failed:`, error);
      return null;
    }
  }

  /**
   * Execute configuration interaction
   *
   * Shows custom Svelte component dialog and waits for user input
   */
  private async executeConfiguration(interaction: any, kingdom: any, metadata?: CheckMetadata): Promise<any> {
    console.log(`⚙️ [UnifiedCheckHandler] Configuration: ${interaction.id || 'unknown'}`);
    
    // ✅ REROLL OPTIMIZATION: Skip if metadata already has this interaction's data
    // This allows rerolls to preserve selections (e.g., BuildStructureDialog doesn't re-show)
    if (interaction.id && metadata && metadata[interaction.id]) {
      console.log(`⏭️ [UnifiedCheckHandler] Skipping configuration (metadata already exists): ${interaction.id}`);
      return metadata[interaction.id];
    }
    
    // Check if component is provided
    if (!interaction.component) {
      console.error('[UnifiedCheckHandler] No component specified for configuration interaction');
      return null;
    }
    
    // Resolve component from registry if string provided
    let componentClass = interaction.component;
    if (typeof componentClass === 'string') {
      console.log(`🔍 [UnifiedCheckHandler] Resolving component from registry: ${componentClass}`);
      const { COMPONENT_REGISTRY } = await import('../view/kingdom/components/OutcomeDisplay/config/ComponentRegistry');
      componentClass = COMPONENT_REGISTRY[componentClass];
      
      if (!componentClass) {
        console.error(`[UnifiedCheckHandler] Component not found in registry: ${interaction.component}`);
        return null;
      }
      
      console.log(`✅ [UnifiedCheckHandler] Component resolved: ${interaction.component}`);
    }
    
    // Show configuration dialog with custom component
    const { showConfigurationDialog } = await import('./InteractionDialogs');
    const result = await showConfigurationDialog(componentClass, {
      instance: null,  // Not used in new pipeline system
      outcome: interaction.outcome || 'success',
      ...interaction.componentProps  // Additional props if provided
    });
    
    if (!result) {
      console.log('[UnifiedCheckHandler] Configuration cancelled by user');
      return null;
    }
    
    console.log('[UnifiedCheckHandler] Configuration complete:', result);
    return result;
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
   * Execute choice interaction
   */
  private async executeChoice(interaction: any): Promise<string | null> {
    console.log(`🎯 [UnifiedCheckHandler] Choice: ${interaction.label}`);

    const choice = await showChoiceDialog(
      interaction.label || 'Choose Option',
      interaction.options || []
    );

    if (!choice) {
      console.log(`⏭️ [UnifiedCheckHandler] Choice cancelled`);
      return null;
    }

    console.log(`✅ [UnifiedCheckHandler] Choice selected: ${choice}`);
    return choice;
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
      // Pass instance.metadata but add instanceId for function evaluation
      const metadataWithId = { ...instance.metadata, instanceId, outcome };
      const result = await this.executeInteraction(adjustedInteraction, kingdom, metadataWithId);

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
      if (result !== null && result !== undefined) {
        const storeKey = interaction.storeAs || interaction.id;
        
        switch (interaction.type) {
          case 'map-selection':
            // Map selection returns array of hex IDs
            if (!resolutionData.compoundData) {
              resolutionData.compoundData = {};
            }
            resolutionData.compoundData[storeKey] = result;
            break;

          case 'entity-selection':
            // Entity selection returns { id, name }
            if (!resolutionData.customComponentData) {
              resolutionData.customComponentData = {};
            }
            resolutionData.customComponentData[storeKey] = result.id;
            resolutionData.customComponentData[`${storeKey}Name`] = result.name;
            break;

          case 'text-input':
            // Text input returns string
            if (!resolutionData.textInputs) {
              resolutionData.textInputs = {};
            }
            resolutionData.textInputs[storeKey] = result;
            break;

          case 'choice':
            // Choice returns string (selected option)
            if (!resolutionData.choices) {
              resolutionData.choices = {};
            }
            resolutionData.choices[storeKey] = result;
            break;

          default:
            // Store in custom component data by default
            if (!resolutionData.customComponentData) {
              resolutionData.customComponentData = {};
            }
            resolutionData.customComponentData[storeKey] = result;
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

    // ✅ FIX: Set outcome on interaction for configuration components that need it
    if (interaction.type === 'configuration') {
      adjusted.outcome = outcome;
    }

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
    if ((pipeline.preview as any).providedByInteraction) {
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
      // ✅ NEW: Execute postRollInteractions.onComplete handlers with customComponentData
      // This allows actions like harvest-resources to apply user selections
      if (pipeline.postRollInteractions && context.resolutionData?.customComponentData) {
        console.log(`🎯 [UnifiedCheckHandler] Processing postRollInteractions with custom component data`);
        
        for (const interaction of pipeline.postRollInteractions) {
          // Check if condition matches outcome
          const conditionMet = !interaction.condition || interaction.condition(context);
          
          if (conditionMet && interaction.onComplete) {
            console.log(`🎯 [UnifiedCheckHandler] Calling postRollInteractions.onComplete for ${interaction.id || interaction.type}`);
            try {
              await interaction.onComplete(context.resolutionData.customComponentData, context);
              console.log(`✅ [UnifiedCheckHandler] onComplete handler succeeded`);
            } catch (error) {
              console.error(`❌ [UnifiedCheckHandler] onComplete handler failed:`, error);
              throw error;
            }
          }
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════
      // ✅ EXECUTE-FIRST PATTERN: Apply modifiers BEFORE custom execute
      // This ensures all pipelines (simple and complex) get proper modifier handling
      // ═══════════════════════════════════════════════════════════════════════
      
      // Apply default modifiers unless pipeline opts out
      if (!(pipeline as any).skipDefaultModifiers) {
        await this.applyDefaultModifiers(context, pipeline);
      }
      
      // Then call custom execute if exists (for custom logic only, modifiers already applied)
      if (pipeline.execute) {
        console.log(`🎯 [UnifiedCheckHandler] Executing custom logic`);
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

      // Default path: Execute game commands and persistence
      // (modifiers already applied above)
      
      console.log(`🔄 [UnifiedCheckHandler] Completing default execution path`);

      // Execute game commands (actions only)
      if (pipeline.gameCommands) {
        await this.executeGameCommands(pipeline.gameCommands, context);
      }

      // Handle persistence (events/incidents only)
      if (pipeline.checkType !== 'action') {
        await this.handlePersistence(pipeline, context);
      }

      console.log(`✅ [UnifiedCheckHandler] Default execution completed`);
    } catch (error) {
      console.error(`❌ [UnifiedCheckHandler] Check execution failed:`, error);
      throw error;
    }
  }

  /**
   * Apply default modifiers (fame bonus + JSON modifiers)
   * Extracted to support execute-first pattern
   * 
   * Called BEFORE custom execute functions to ensure consistent modifier application.
   * Pipelines can opt out by setting skipDefaultModifiers: true
   * 
   * Fame bonus is applied HERE as a check outcome rule (critical success = +1 fame)
   */
  private async applyDefaultModifiers(
    context: CheckContext,
    pipeline: CheckPipeline
  ): Promise<void> {
    console.log(`🔄 [UnifiedCheckHandler] Applying default modifiers`);
    
    const gameCommandsService = await createGameCommandsService();
    
    // Step 1: Apply +1 fame for critical success (Kingdom Rule)
    if (context.outcome === 'criticalSuccess') {
      const tempResult = { success: true, applied: { resources: [] } };
      await gameCommandsService.applyFameChange(1, 'Critical Success Bonus', tempResult);
      console.log(`✨ [UnifiedCheckHandler] Applied +1 fame for critical success`);
    }
    
    // Step 2: Apply pre-rolled modifiers from resolutionData (dice already rolled in UI)
    if (context.resolutionData?.numericModifiers?.length > 0) {
      console.log(`💰 [UnifiedCheckHandler] Applying ${context.resolutionData.numericModifiers.length} pre-rolled modifier(s)`);
      
      await gameCommandsService.applyNumericModifiers(
        context.resolutionData.numericModifiers,
        context.outcome
      );
    }
    // Step 3: Apply static modifiers from JSON (if not already handled by numericModifiers)
    // This handles pipelines that only have static modifiers (no dice)
    else {
      const outcomeData = pipeline.outcomes?.[context.outcome];
      const jsonModifiers = outcomeData?.modifiers || [];
      const staticModifiers = jsonModifiers.filter((m: any) => m.type === 'static');
      
      if (staticModifiers.length > 0) {
        console.log(`💰 [UnifiedCheckHandler] Applying ${staticModifiers.length} static modifier(s) from JSON`);
        
        // Convert to numeric format and apply
        const numericMods = staticModifiers.map((m: any) => ({
          resource: m.resource as ResourceType,
          value: m.negative ? -(m.value || 0) : (m.value || 0)
        }));
        
        await gameCommandsService.applyNumericModifiers(numericMods, context.outcome);
      }
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

        // Check if resource is in the nested resources object
        if (k.resources && typeof (k.resources as any)[resource] === 'number') {
          (k.resources as any)[resource] += value;
          console.log(`💰 [UnifiedCheckHandler] Applied ${value} to ${resource} (new value: ${(k.resources as any)[resource]})`);
        } else if (typeof (k as any)[resource] === 'number') {
          // Fallback: Try direct access (for non-resource properties)
          (k as any)[resource] += value;
          console.log(`💰 [UnifiedCheckHandler] Applied ${value} to ${resource} (new value: ${(k as any)[resource]})`);
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

    // Pre-roll interactions allowed for actions and incidents
    if (pipeline.checkType === 'event' && pipeline.preRollInteractions) {
      throw new Error('Pre-roll interactions not allowed for events');
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
