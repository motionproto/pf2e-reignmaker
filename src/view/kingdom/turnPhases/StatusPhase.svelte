<script lang="ts">
import { kingdomData, kingdomActor, isInitialized } from '../../../stores/KingdomStore';
import { TurnPhase } from '../../../actors/KingdomActor';
import ModifierCard from '../components/ModifierCard.svelte';
import CustomModifierDisplay from '../components/CustomModifierDisplay.svelte';
import SettlementLocationPicker from '../tabs/settlements/SettlementLocationPicker.svelte';

// Props - add the missing prop to fix the warning
export let isViewingCurrentPhase: boolean = true;

// Reactive: Get settlements without valid map locations (in claimed territory)
$: unmappedSettlements = $kingdomData.settlements?.filter(s => {
   // Must be unmapped
   if (s.location.x !== 0 || s.location.y !== 0) return false;
   
   // Must have a kingmakerLocation
   if (!s.kingmakerLocation) return false;
   
   const kmLocation = s.kingmakerLocation; // Type narrowing
   
   // Find the hex at that kingmaker location
   const kmHex = $kingdomData.hexes?.find((h: any) => {
      const [xStr, yStr] = h.id.split('.');
      const x = parseInt(xStr) || 0;
      const y = parseInt(yStr) || 0;
      return x === kmLocation.x && y === kmLocation.y;
   });
   
   // Only show if hex is in claimed territory
   return kmHex && (kmHex as any).claimedBy === 1;
}) || [];

// Reactive: Get hexes with settlement features but no associated settlement (in claimed territory)
$: unassignedHexes = ($kingdomData.hexes || [])
   .filter((h: any) => {
      // Must be in claimed territory
      if (h.claimedBy !== 1) return false;
      
      // Must have settlement features
      const features = h.kingmakerFeatures || h.features || [];
      const hasSettlementFeature = features.some((f: any) => 
         f.type && ['village', 'town', 'city', 'metropolis'].includes(f.type.toLowerCase())
      );
      if (!hasSettlementFeature) return false;
      
      // Check if any settlement is assigned to this hex
      const [xStr, yStr] = h.id.split('.');
      const x = parseInt(xStr) || 0;
      const y = parseInt(yStr) || 0;
      
      const hasAssignedSettlement = $kingdomData.settlements?.some(s => 
         s.location.x === x && s.location.y === y
      );
      
      // Show if no settlement is assigned
      return !hasAssignedSettlement;
   })
   .map((h: any) => {
      const [xStr, yStr] = h.id.split('.');
      const x = parseInt(xStr) || 0;
      const y = parseInt(yStr) || 0;
      
      const features = h.kingmakerFeatures || h.features || [];
      const settlementFeature = features.find((f: any) => 
         f.type && ['village', 'town', 'city', 'metropolis'].includes(f.type.toLowerCase())
      );
      
      return {
         id: h.id,
         x,
         y,
         tier: settlementFeature?.type || 'Settlement',
         name: settlementFeature?.name || 'Unnamed'
      };
   });

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
   
   console.log('🟡 [StatusPhase] Initializing phase controller...');
   
   try {
      const { createStatusPhaseController } = await import('../../../controllers/StatusPhaseController');
      const controller = await createStatusPhaseController();
      await controller.startPhase();
   } catch (error) {
      console.error('❌ [StatusPhase] FATAL: Phase initialization failed:', error);
      // No retry - fail fast and loud
      throw error;
   }
}
</script>

<div class="status-phase">
   <!-- Unmapped Settlements Alert Section -->
   {#if unmappedSettlements.length > 0 || unassignedHexes.length > 0}
      <div class="phase-section unmapped-settlements-alert">
         <div class="section-header">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Unmapped Settlements</h3>
         </div>
         
         <div class="alerts-stack">
            {#each unmappedSettlements as settlement}
               <div class="settlement-alert">
                  <div class="alert-content">
                     <i class="fas fa-city"></i>
                     <div class="settlement-info">
                        <strong>{settlement.name}</strong>
                        <span class="tier-badge">{settlement.tier}</span>
                     </div>
                     <span class="alert-message">Settlement not assigned to hex</span>
                  </div>
                  <SettlementLocationPicker {settlement} />
               </div>
            {/each}
            
            {#each unassignedHexes as hex}
               <div class="settlement-alert">
                  <div class="alert-content">
                     <i class="fas fa-map-marker-alt"></i>
                     <div class="settlement-info">
                        <strong class="hex-location">Hex {hex.x}:{hex.y.toString().padStart(2, '0')}</strong>
                        <span class="alert-message">Has no settlement assigned</span>
                     </div>
                     <span class="tier-badge">{hex.tier}</span>
                  </div>
               </div>
            {/each}
         </div>
         
         <div class="alert-note">
            <i class="fas fa-info-circle"></i>
            Unmapped settlements do not contribute to kingdom resources, capacities, or skill bonuses.
         </div>
      </div>
   {/if}

   <!-- Fame Display Section -->
   <div class="phase-section fame-section">
      <div class="section-header">
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
      <div class="phase-section status-modifiers">
         <div class="section-header">
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
      <div class="phase-section structure-modifiers">
         <div class="section-header">
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
      gap: 20px;
   }

   .phase-section {
      background: linear-gradient(135deg,
         rgba(31, 31, 35, 0.6),
         rgba(15, 15, 17, 0.4));
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-medium);
      padding: 20px;
   }

   .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;

      i {
         font-size: 20px;
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
      gap: 15px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
   }

   .fame-stars {
      display: flex;
      gap: 12px;
      justify-content: center;

      .star-icon {
         font-size: 48px;
         transition: all 0.3s ease;
         color: var(--color-gray-600);

         &.filled {
            color: var(--color-amber-light);
            text-shadow:
               0 0 20px rgba(251, 191, 36, 0.4),
               0 2px 4px rgba(0, 0, 0, 0.3);
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
      gap: 15px;
   }

   // Active Modifiers Grid
   .modifiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
   }

   // Unmapped Settlements Alert Styles
   .unmapped-settlements-alert {
      background: transparent;
      border: 2px solid #fbbf24;

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
      gap: 12px;
      margin-bottom: 15px;
   }

   .settlement-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 15px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: var(--radius-md);
      gap: 15px;

      &:hover {
         background: rgba(0, 0, 0, 0.3);
         border-color: rgba(251, 191, 36, 0.4);
      }
   }

   .alert-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;

      > i {
         font-size: 1.25rem;
         color: #fbbf24;
         flex-shrink: 0;
      }
   }

   .settlement-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;

      strong {
         font-size: var(--font-md);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }

      .hex-location {
         font-weight: var(--font-weight-bold);
      }
   }

   .tier-badge {
      padding: 2px 8px;
      background: rgba(251, 191, 36, 0.2);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: var(--radius-sm);
      font-size: var(--font-xs);
      font-weight: var(--font-weight-medium);
      color: #fbbf24;
   }

   .alert-message {
      font-size: var(--font-lg);
      color: var(--text-secondary);
      font-weight: normal;
   }

   .alert-note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: var(--radius-md);
      font-size: var(--font-md);
      color: var(--text-secondary);
      line-height: 1.5;

      i {
         font-size: 1rem;
         color: #fbbf24;
         margin-top: 2px;
         flex-shrink: 0;
      }
   }
</style>
