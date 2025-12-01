<script lang="ts">
   import { onMount } from 'svelte';
   import { kingdomData } from '../../../stores/KingdomStore';
   import { pipelineRegistry } from '../../../pipelines/PipelineRegistry';
   import { buildPossibleOutcomes } from '../../../controllers/shared/PossibleOutcomeHelpers';
   import { buildEventOutcomes } from '../../../controllers/shared/EventOutcomeHelpers';
   import { logger } from '../../../utils/Logger';
   
   // Type for loaded incidents
   type LoadedIncident = any;
   
   // Import UI components
   import BaseCheckCard from './BaseCheckCard.svelte';
   
   // Import incident status tracking
   import { getIncidentStatus, getIncidentNumber } from '../../../constants/migratedIncidents';
   
   // Props
   export let hideUntrainedSkills: boolean = true;
   
   // Load all incidents organized by severity
   let minorIncidents: LoadedIncident[] = [];
   let moderateIncidents: LoadedIncident[] = [];
   let majorIncidents: LoadedIncident[] = [];
   
   // Track which incident is currently being tested
   let activeIncidentId: string | null = null;
   let isRolling = false;
   
   // Controller reference for incident execution
   let unrestPhaseController: any;
   
   // ✅ REACTIVE: Derive incident previews from store (must use $: for reactivity)
   // This is the same pattern used by ActionsPhase for action outcomes
   $: incidentPreviewMap = ($kingdomData?.pendingOutcomes || [])
      .filter(i => i.checkType === 'incident' && i.metadata?.isDebugTest)
      .reduce((map, instance) => {
         map.set(instance.checkId, instance);
         return map;
      }, new Map<string, any>());
   
   // ✅ Force {#each} blocks to re-render when previews change
   // This key changes whenever any debug incident preview is added/updated
   $: previewsKey = Array.from(incidentPreviewMap.entries())
      .map(([id, p]) => `${id}:${p.status}:${!!p.appliedOutcome}`)
      .join(',');
   
   onMount(async () => {
      // Load incidents by tier from pipeline registry
      const allIncidents = pipelineRegistry.getPipelinesByType('incident');
      // Handle both numeric (1, 2, 3) and string ('minor', 'moderate', 'major') tier formats
      minorIncidents = allIncidents.filter((i: any) => i.tier === 1 || i.tier === 'minor');
      moderateIncidents = allIncidents.filter((i: any) => i.tier === 2 || i.tier === 'moderate');
      majorIncidents = allIncidents.filter((i: any) => i.tier === 3 || i.tier === 'major');
      
      console.log('[IncidentDebugPanel] Loaded incidents:', {
         minor: minorIncidents.length,
         moderate: moderateIncidents.length,
         major: majorIncidents.length
      });
      
      // Initialize controller
      const { createUnrestPhaseController } = await import('../../../controllers/UnrestPhaseController');
      unrestPhaseController = await createUnrestPhaseController();
   });
   
   // Build outcomes array for BaseCheckCard using shared helper
   function buildIncidentOutcomes(incident: LoadedIncident) {
      if (!incident.outcomes) return [];
      return buildEventOutcomes(incident);
   }
   
   // Execute skill check for an incident
   async function handleExecuteSkill(event: CustomEvent, incident: LoadedIncident) {
      const { skill } = event.detail;
      
      activeIncidentId = incident.id;
      isRolling = true;
      
      try {
         // Use PipelineCoordinator for incidents
         const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
         const { getCurrentUserCharacter } = await import('../../../services/pf2e');
         
         const pipelineCoordinator = await getPipelineCoordinator();
         const actingCharacter = getCurrentUserCharacter();
         
         if (!actingCharacter) {
            throw new Error('No character selected');
         }
         
         await pipelineCoordinator.executePipeline(incident.id, {
            checkType: 'incident',
            actor: {
               selectedSkill: skill,
               fullActor: actingCharacter,
               actorName: actingCharacter.name,
               actorId: actingCharacter.id,
               level: actingCharacter.level || 1,
               proficiencyRank: 0
            },
            metadata: {
               isDebugTest: true  // Mark as debug test to hide from normal UnrestPhase
            }
         });
         
         console.log('[IncidentDebugPanel] Pipeline executed for:', incident.name);
         
      } catch (error) {
         if ((error as Error).message === 'Action cancelled by user') {
            logger.info('[IncidentDebugPanel] User cancelled incident check');
         } else {
            logger.error('[IncidentDebugPanel] Error in incident check:', error);
            ui?.notifications?.error(`Failed to perform incident check: ${(error as Error).message}`);
         }
      } finally {
         isRolling = false;
         activeIncidentId = null;
      }
   }
   
   // Handle apply result
   async function handleApplyResult(event: CustomEvent, incident: LoadedIncident) {
      const resolutionData = event.detail.resolution;
      
      // Get the active instance for this incident
      const activeInstance = $kingdomData?.pendingOutcomes?.find(
         i => i.checkType === 'incident' && i.checkId === incident.id
      );
      
      if (!activeInstance) {
         console.warn('[IncidentDebugPanel] No active instance found for incident:', incident.id);
         return;
      }
      
      // Use PipelineCoordinator to confirm and execute
      const { getPipelineCoordinator } = await import('../../../services/PipelineCoordinator');
      const pipelineCoordinator = await getPipelineCoordinator();
      await pipelineCoordinator.confirmApply(activeInstance.previewId, resolutionData);
   }
   
   // Handle cancel
   async function handleCancel(event: CustomEvent, incident: LoadedIncident) {
      // Get the active instance for this incident
      const activeInstance = $kingdomData?.pendingOutcomes?.find(
         i => i.checkType === 'incident' && i.checkId === incident.id
      );
      
      if (!activeInstance) return;
      
      // Clear the instance
      const { createOutcomePreviewService } = await import('../../../services/OutcomePreviewService');
      const outcomePreviewService = await createOutcomePreviewService();
      await outcomePreviewService.clearInstance(activeInstance.previewId);
   }
   
   // Handle reroll
   async function handleReroll(event: CustomEvent, incident: LoadedIncident) {
      const { skill, previousFame, enabledModifiers } = event.detail;
      
      // Cancel current and re-execute
      await handleCancel(event, incident);
      
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create a mock event with the skill
      const mockEvent = { detail: { skill } } as CustomEvent;
      await handleExecuteSkill(mockEvent, incident);
   }
   
   // Get active outcome preview for an incident (only debug tests)
   // ✅ Use reactive map lookup instead of store.find() for proper reactivity
   function getIncidentPreview(incident: LoadedIncident) {
      const preview = incidentPreviewMap.get(incident.id) || null;
      
      if (preview) {
         console.log(`[IncidentDebugPanel] Found debug preview for ${incident.id}:`, preview);
      }
      
      return preview;
   }
   
   // Check if incident is resolved
   function isIncidentResolved(incident: LoadedIncident): boolean {
      const preview = getIncidentPreview(incident);
      const resolved = !!preview?.appliedOutcome;
      
      console.log(`[IncidentDebugPanel] isIncidentResolved for ${incident.id}:`, {
         hasPreview: !!preview,
         hasAppliedOutcome: !!preview?.appliedOutcome,
         resolved
      });
      
      return resolved;
   }
   
   // Get resolution for incident
   function getIncidentResolution(incident: LoadedIncident) {
      const preview = getIncidentPreview(incident);
      return preview?.appliedOutcome || null;
   }
</script>

<div class="incident-debug-panel">
   <div class="debug-header">
      <i class="fas fa-bug"></i>
      <h3>Incident Debug Panel</h3>
      <span class="incident-count">
         {minorIncidents.length + moderateIncidents.length + majorIncidents.length} incidents total
      </span>
   </div>
   
   <div class="debug-notice">
      <i class="fas fa-info-circle"></i>
      <span>Click any skill to test the full incident pipeline. Each card is fully interactive.</span>
   </div>
   
   <!-- Minor Incidents -->
   <div class="severity-section">
      <div class="severity-header minor">
         <i class="fas fa-exclamation"></i>
         <h4>Minor Incidents</h4>
         <span class="count">{minorIncidents.length}</span>
      </div>
      <div class="incidents-grid">
         {#each minorIncidents as incident (`${incident.id}-${previewsKey}`)}
            {@const preview = getIncidentPreview(incident)}
            {@const resolved = isIncidentResolved(incident)}
            {@const resolution = getIncidentResolution(incident)}
            {@const possibleOutcomes = buildPossibleOutcomes(incident.outcomes)}
            {@const incidentStatus = getIncidentStatus(incident.id)}
            {@const incidentNumber = getIncidentNumber(incident.id)}
            <BaseCheckCard
               id={incident.id}
               name={incident.name}
               description={incident.description}
               skills={incident.skills}
               outcomes={buildIncidentOutcomes(incident)}
               traits={[]}
               checkType="incident"
               outcomePreview={preview}
               expandable={false}
               showCompletions={false}
               showAvailability={false}
               showSpecial={false}
               showIgnoreButton={false}
               isViewingCurrentPhase={true}
               {possibleOutcomes}
               showAidButton={false}
               {resolved}
               {resolution}
               skillSectionTitle="Choose Your Response:"
               {hideUntrainedSkills}
               {incidentStatus}
               {incidentNumber}
               on:executeSkill={(e) => handleExecuteSkill(e, incident)}
               on:primary={(e) => handleApplyResult(e, incident)}
               on:cancel={(e) => handleCancel(e, incident)}
               on:performReroll={(e) => handleReroll(e, incident)}
            />
         {/each}
      </div>
   </div>
   
   <!-- Moderate Incidents -->
   <div class="severity-section">
      <div class="severity-header moderate">
         <i class="fas fa-exclamation-triangle"></i>
         <h4>Moderate Incidents</h4>
         <span class="count">{moderateIncidents.length}</span>
      </div>
      <div class="incidents-grid">
         {#each moderateIncidents as incident (`${incident.id}-${previewsKey}`)}
            {@const preview = getIncidentPreview(incident)}
            {@const resolved = isIncidentResolved(incident)}
            {@const resolution = getIncidentResolution(incident)}
            {@const possibleOutcomes = buildPossibleOutcomes(incident.outcomes)}
            {@const incidentStatus = getIncidentStatus(incident.id)}
            {@const incidentNumber = getIncidentNumber(incident.id)}
            <BaseCheckCard
               id={incident.id}
               name={incident.name}
               description={incident.description}
               skills={incident.skills}
               outcomes={buildIncidentOutcomes(incident)}
               traits={[]}
               checkType="incident"
               outcomePreview={preview}
               expandable={false}
               showCompletions={false}
               showAvailability={false}
               showSpecial={false}
               showIgnoreButton={false}
               isViewingCurrentPhase={true}
               {possibleOutcomes}
               showAidButton={false}
               {resolved}
               {resolution}
               skillSectionTitle="Choose Your Response:"
               {hideUntrainedSkills}
               {incidentStatus}
               {incidentNumber}
               on:executeSkill={(e) => handleExecuteSkill(e, incident)}
               on:primary={(e) => handleApplyResult(e, incident)}
               on:cancel={(e) => handleCancel(e, incident)}
               on:performReroll={(e) => handleReroll(e, incident)}
            />
         {/each}
      </div>
   </div>
   
   <!-- Major Incidents -->
   <div class="severity-section">
      <div class="severity-header major">
         <i class="fas fa-skull-crossbones"></i>
         <h4>Major Incidents</h4>
         <span class="count">{majorIncidents.length}</span>
      </div>
      <div class="incidents-grid">
         {#each majorIncidents as incident (`${incident.id}-${previewsKey}`)}
            {@const preview = getIncidentPreview(incident)}
            {@const resolved = isIncidentResolved(incident)}
            {@const resolution = getIncidentResolution(incident)}
            {@const possibleOutcomes = buildPossibleOutcomes(incident.outcomes)}
            {@const incidentStatus = getIncidentStatus(incident.id)}
            {@const incidentNumber = getIncidentNumber(incident.id)}
            <BaseCheckCard
               id={incident.id}
               name={incident.name}
               description={incident.description}
               skills={incident.skills}
               outcomes={buildIncidentOutcomes(incident)}
               traits={[]}
               checkType="incident"
               outcomePreview={preview}
               expandable={false}
               showCompletions={false}
               showAvailability={false}
               showSpecial={false}
               showIgnoreButton={false}
               isViewingCurrentPhase={true}
               {possibleOutcomes}
               showAidButton={false}
               {resolved}
               {resolution}
               skillSectionTitle="Choose Your Response:"
               {hideUntrainedSkills}
               {incidentStatus}
               {incidentNumber}
               on:executeSkill={(e) => handleExecuteSkill(e, incident)}
               on:primary={(e) => handleApplyResult(e, incident)}
               on:cancel={(e) => handleCancel(e, incident)}
               on:performReroll={(e) => handleReroll(e, incident)}
            />
         {/each}
      </div>
   </div>
</div>

<style lang="scss">
   .incident-debug-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-20);
      padding: var(--space-16);
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid var(--border-special-subtle);
      border-radius: var(--radius-lg);
   }
   
   .debug-header {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      padding-bottom: var(--space-12);
      border-bottom: 1px solid var(--border-special-subtle);
      
      i {
         font-size: var(--font-xl);
         color: rgba(196, 181, 253, 1);
      }
      
      h3 {
         margin: 0;
         font-size: var(--font-xl);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }
      
      .incident-count {
         margin-left: auto;
         padding: var(--space-4) var(--space-10);
         background: rgba(139, 92, 246, 0.15);
         border-radius: var(--radius-full);
         font-size: var(--font-md);
         color: rgba(196, 181, 253, 1);
      }
   }
   
   .debug-notice {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      padding: var(--space-10) var(--space-12);
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid var(--border-special-subtle);
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      color: var(--text-secondary);
      
      i {
         color: rgba(196, 181, 253, 1);
      }
   }
   
   .severity-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }
   
   .severity-header {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      padding: var(--space-8) var(--space-12);
      border-radius: var(--radius-md);
      
      i {
         font-size: var(--font-lg);
      }
      
      h4 {
         margin: 0;
         font-size: var(--font-lg);
         font-weight: var(--font-weight-medium);
      }
      
      .count {
         margin-left: auto;
         padding: var(--space-2) var(--space-8);
         border-radius: var(--radius-full);
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
      }
      
      &.minor {
         background: var(--surface-accent-low);
         border: 1px solid var(--border-accent-subtle);
         
         i, h4 { color: var(--color-amber-light); }
         .count {
            background: var(--surface-accent);
            color: var(--color-amber-light);
         }
      }
      
      &.moderate {
         background: rgba(249, 115, 22, 0.1);
         border: 1px solid var(--color-orange-border);
         
         i, h4 { color: var(--color-orange); }
         .count {
            background: rgba(249, 115, 22, 0.2);
            color: var(--color-orange);
         }
      }
      
      &.major {
         background: var(--surface-primary-low);
         border: 1px solid var(--border-primary-subtle);
         
         i, h4 { color: var(--color-red); }
         .count {
            background: var(--surface-primary);
            color: var(--color-red);
         }
      }
   }
   
   .incidents-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }
</style>
