<script lang="ts">
   import { PLAYER_KINGDOM } from '../../../types/ownership';
import { kingdomData, kingdomActor, isInitialized } from '../../../stores/KingdomStore';
import { TurnPhase } from '../../../actors/KingdomActor';
import ModifierCard from '../components/ModifierCard.svelte';
import CustomModifierDisplay from '../components/CustomModifierDisplay.svelte';
import Notification from '../components/baseComponents/Notification.svelte';
import { setSelectedTab } from '../../../stores/ui';
import { SettlementTier } from '../../../models/Settlement';
import { logger } from '../../../utils/Logger';

// Props - add the missing prop to fix the warning
export let isViewingCurrentPhase: boolean = true;

// Reactive: Get hexes with unlinked settlement features (in claimed territory)
// Explicitly track dependencies for Svelte reactivity
$: hexes = $kingdomData.hexes || [];
$: settlements = $kingdomData.settlements || [];

// Reactive: Get settlements that exist but aren't placed on map (location is 0,0)
$: unlinkedSettlements = settlements.filter(s => 
  s.location.x === 0 && s.location.y === 0
);

// This matches the pattern from SettlementsList.svelte
$: unassignedHexes = hexes
   .filter((h: any) => {
      // Must be in claimed territory
      if (h.claimedBy !== PLAYER_KINGDOM) return false;
      
      // Must have unlinked settlement features
      // Use !f.linked to catch both undefined and false
      const features = h.features || [];
      const hasUnlinkedSettlement = features.some((f: any) => 
         f.type === 'settlement' && !f.linked
      );
      
      return hasUnlinkedSettlement;
   })
   .map((h: any) => {
      // Use stored row/col properties directly (already numbers)
      // Note: hexes use {row, col} but settlements use {x, y}
      // where x=row and y=col
      const row = h.row ?? 0;
      const col = h.col ?? 0;
      
      const features = h.features || [];
      // Use !f.linked to catch both undefined and false
      const settlementFeature = features.find((f: any) => 
         f.type === 'settlement' && !f.linked
      );
      
      // Map feature tier to SettlementTier
      let tier = SettlementTier.VILLAGE;
      if (settlementFeature?.tier) {
         const tierStr = settlementFeature.tier;
         if (tierStr === 'Town') tier = SettlementTier.TOWN;
         else if (tierStr === 'City') tier = SettlementTier.CITY;
         else if (tierStr === 'Metropolis') tier = SettlementTier.METROPOLIS;
      }
      
      return {
         id: h.id,
         x: row,  // For settlement coordinate system
         y: col,  // For settlement coordinate system
         tier,
         name: settlementFeature?.name  // Use feature name (may be undefined)
      };
   })
   // CRITICAL: Filter out hexes that actually have settlements assigned
   // This catches stale data where linked flag isn't set but settlement exists
   .filter(hex => {
      // Use settlements variable to ensure Svelte tracks this dependency
      const hasAssignedSettlement = settlements.some(s => 
         s.location.x === hex.x && s.location.y === hex.y
      );
      // Only include if NO settlement is assigned to this location
      return !hasAssignedSettlement;
   });

// Reactive: Check if kingdom has a capital
$: hasCapital = $kingdomData.settlements?.some(s => s.isCapital === true) ?? false;

// Handler to navigate to settlements tab
function navigateToSettlements() {
   setSelectedTab('settlements');
}

// Constants
const MAX_FAME = 3;

// Better initialization - wait for store to be ready before initializing phase
let hasInitialized = false;
$: if ($kingdomData.currentPhase === TurnPhase.STATUS && $isInitialized && $kingdomActor && !hasInitialized) {
   initializePhase();
}

async function initializePhase() {
   if (hasInitialized) return;
   hasInitialized = true;

   try {
      const { createStatusPhaseController } = await import('../../../controllers/StatusPhaseController');
      const controller = await createStatusPhaseController();
      await controller.startPhase();
   } catch (error) {
      logger.error('❌ [StatusPhase] FATAL: Phase initialization failed:', error);
      // No retry - fail fast and loud
      throw error;
   }
}
</script>

<div class="status-phase">
   <!-- No Capital Alert Section -->
   {#if !hasCapital && $kingdomData.settlements && $kingdomData.settlements.length > 0}
      <Notification
         variant="warning"
         title="No Capital Designated"
         description="Mark one of your settlements as the capital to enable full gold generation."
         emphasis={true}
         actionText="Go to Settlements"
         actionIcon="fas fa-arrow-right"
         onAction={navigateToSettlements}
         actionInline={true}
      />
   {/if}

   <!-- Unlinked Settlements Alert Section -->
   {#each unlinkedSettlements as settlement}
      <Notification
         variant="warning"
         title="{settlement.name} is not linked to a map hex."
         description=""
         actionText="Go to Settlements"
         actionIcon="fas fa-arrow-right"
         onAction={navigateToSettlements}
         actionHeader={true}
      />
   {/each}

   <!-- Unassigned Settlements Alert Section -->
   {#if unassignedHexes.length > 0}
      <div class="phase-section unassigned-settlements-alert">
         <div class="section-header">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Settlements Need Creation</h3>
         </div>
         
         <div class="alerts-stack">
            {#each unassignedHexes as hex}
               <div 
                  class="settlement-alert clickable"
                  on:click={navigateToSettlements}
                  on:keypress={(e) => e.key === 'Enter' && navigateToSettlements()}
                  role="button"
                  tabindex="0"
                  title="Click to go to Settlements tab"
               >
                  <div class="alert-content">
                     <i class="fas fa-map-marker-alt"></i>
                     <div class="settlement-info">
                        {#if hex.name}
                           <strong>{hex.name}</strong>
                           <span class="hex-location">at {hex.x}:{hex.y.toString().padStart(2, '0')}</span>
                        {:else}
                           <strong class="hex-location">Hex {hex.x}:{hex.y.toString().padStart(2, '0')}</strong>
                        {/if}
                        <span class="tier-badge">{hex.tier}</span>
                     </div>
                     <span class="click-hint">
                        <i class="fas fa-arrow-right"></i>
                        Click to create
                     </span>
                  </div>
               </div>
            {/each}
         </div>
         
         <div class="alert-note">
            <i class="fas fa-info-circle"></i>
            These locations have settlement features but no settlements created yet.
         </div>
      </div>
   {/if}

   <!-- Fame Display Section -->
   <div class="fame-section">
      <div class="section-header-minimal">
         <i class="fas fa-star"></i>
         <h3>Kingdom Fame</h3>
      </div>

      <div class="fame-display">
         <div class="fame-stars">
            {#each Array(MAX_FAME) as _, i}
               <i
                  class="{i < $kingdomData.fame ? 'fas' : 'far'} fa-star star-icon"
                  class:filled={i < $kingdomData.fame}
               ></i>
            {/each}
         </div>

         <div class="fame-info">
            <div class="fame-value">{$kingdomData.fame} / {MAX_FAME}</div>
         </div>
      </div>
   </div>

   <!-- Status Phase Modifiers (Size, Metropolises) -->
   {#if $kingdomData.turnState?.statusPhase?.displayModifiers && $kingdomData.turnState.statusPhase.displayModifiers.length > 0}
      <div class="status-modifiers">
         <div class="section-header-minimal">
            <i class="fas fa-balance-scale"></i>
            <h3>Status Modifiers</h3>
         </div>

         <div class="modifiers-stack">
            {#each $kingdomData.turnState.statusPhase.displayModifiers as modifier}
               <CustomModifierDisplay {modifier} />
            {/each}
         </div>
      </div>
   {/if}

   <!-- Structure Modifiers (Permanent modifiers from built structures) -->
   {#if $kingdomData.activeModifiers && $kingdomData.activeModifiers.filter(m => m.sourceType === 'structure' && m.modifiers?.some(mod => mod.duration === 'permanent')).length > 0}
      <div class="structure-modifiers">
         <div class="section-header-minimal">
            <i class="fas fa-building"></i>
            <h3>Structure Modifiers</h3>
         </div>

         <div class="modifiers-stack">
            {#each $kingdomData.activeModifiers.filter(m => m.sourceType === 'structure' && m.modifiers?.some(mod => mod.duration === 'permanent')) as modifier}
               <CustomModifierDisplay {modifier} />
            {/each}
         </div>
      </div>
   {/if}
</div>

<style lang="scss">
   .status-phase {
      display: flex;
      flex-direction: column;
      gap: var(--space-20);
   }

   .phase-section {
      background: linear-gradient(135deg,
         rgba(31, 31, 35, 0.6),
         rgba(15, 15, 17, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      padding: var(--space-20);
   }

   .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      margin-bottom: var(--space-16);

      i {
         font-size: var(--font-xl);
         color: var(--color-amber);
      }

      h3 {
         margin: 0;
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
         color: var(--text-primary);
         flex: 1;
      }
   }

   .section-header-minimal {
      display: flex;
      align-items: center;
      gap: var(--space-10);
      margin-bottom: var(--space-16);

      i {
         font-size: var(--font-xl);
         color: var(--color-amber);
      }

      h3 {
         margin: 0;
         font-size: var(--font-2xl);
         font-weight: var(--font-weight-semibold);
         line-height: 1.3;
         color: var(--text-primary);
         flex: 1;
      }
   }

   // Fame Section Styles
   .fame-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-16);
      padding: var(--space-20);
      background: transparent;
      border-radius: 0;
   }

   .fame-stars {
      display: flex;
      gap: var(--space-12);
      justify-content: center;

      .star-icon {
         font-size: var(--font-6xl);
         transition: all 0.3s ease;
         color: var(--color-gray-600);

         &.filled {
            color: var(--color-amber-light);
            text-shadow: 0 0 1.25rem rgba(251, 191, 36, 0.4), 0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
            transform: scale(1.05);
         }

         &:not(.filled) {
            opacity: 0.3;
         }
      }
   }

   .fame-info {
      text-align: center;

      .fame-value {
         font-size: var(--font-3xl);
         font-weight: var(--font-weight-semibold);
         color: var(--color-amber-light);
         text-shadow: var(--text-shadow-md);
      }
   }

   // No Modifiers Styles
   .no-modifiers {
      text-align: center;
      
      p {
         margin: 0;
         color: var(--text-secondary);
         font-size: var(--font-md);
      }
   }

   // Status Modifiers Stack (Full Width)
   .modifiers-stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
   }

   // Active Modifiers Grid
   .modifiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15.625rem, 1fr));
      gap: var(--space-16);
   }

   // Alert Styles for unassigned settlements
   .unassigned-settlements-alert {
      background: transparent;
      border: 0.125rem solid #fbbf24;

      .section-header {
         i {
            color: #fbbf24;
         }

         h3 {
            color: #fbbf24;
         }
      }
   }

   .alerts-stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
      margin-bottom: var(--space-16);
   }

   .settlement-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-12) 0.9375rem;
      background: rgba(0, 0, 0, 0.2);
      border: 0.0625rem solid rgba(251, 191, 36, 0.2);
      border-radius: var(--radius-md);
      gap: var(--space-16);
      transition: all 0.2s ease;

      &.clickable {
         cursor: pointer;

         &:hover {
            background: rgba(251, 191, 36, 0.15);
            border-color: rgba(251, 191, 36, 0.5);
            transform: translateX(0.25rem);
         }

         &:active {
            transform: translateX(0.125rem);
         }
      }
   }

   .alert-content {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      flex: 1;

      > i {
         font-size: var(--font-xl);
         color: #fbbf24;
         flex-shrink: 0;
      }
   }

   .settlement-info {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex: 1;
      flex-wrap: wrap;

      strong {
         font-size: var(--font-md);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }

      .hex-location {
         font-size: var(--font-md);
         color: var(--text-secondary);
         font-weight: var(--font-weight-normal);
      }
   }

   .tier-badge {
      padding: var(--space-2) var(--space-8);
      background: rgba(251, 191, 36, 0.2);
      border: 0.0625rem solid rgba(251, 191, 36, 0.3);
      border-radius: var(--radius-sm);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      color: #fbbf24;
      flex-shrink: 0;
   }

   .click-hint {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      font-size: var(--font-sm);
      color: #fbbf24;
      font-weight: var(--font-weight-medium);
      flex-shrink: 0;

      i {
         font-size: var(--font-xs);
      }
   }

   .alert-note {
      display: flex;
      align-items: flex-start;
      gap: var(--space-10);
      padding: var(--space-10) var(--space-12);
      background: rgba(251, 191, 36, 0.1);
      border: 0.0625rem solid rgba(251, 191, 36, 0.2);
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      color: var(--text-secondary);
      line-height: 1.5;

      i {
         font-size: var(--font-md);
         color: #fbbf24;
         margin-top: var(--space-2);
         flex-shrink: 0;
      }
   }
</style>
