<script lang="ts">
   import { PLAYER_KINGDOM } from '../../../types/ownership';
import { kingdomData, kingdomActor, isInitialized, doctrine, doctrineState, updateKingdom } from '../../../stores/KingdomStore';
import { tick } from 'svelte';
import { TurnPhase } from '../../../actors/KingdomActor';
import ModifierCard from '../components/ModifierCard.svelte';
import CustomModifierDisplay from '../components/CustomModifierDisplay.svelte';
import Notification from '../components/baseComponents/Notification.svelte';
import Dialog from '../components/baseComponents/Dialog.svelte';
import { setSelectedTab } from '../../../stores/ui';
import { SettlementTier } from '../../../models/Settlement';
import { logger } from '../../../utils/Logger';
import CitizensDemandExpansion from './components/CitizensDemandExpansion.svelte';
import CitizensDemandStructure from './components/CitizensDemandStructure.svelte';
import { getDoctrineIcon, getDoctrineColor, getDoctrineTierLabel } from '../utils/presentation';
import { DOCTRINE_THRESHOLDS, DOCTRINE_TIER_ORDER, DOCTRINE_TIER_EFFECTS, DOCTRINE_SKILL_GROUPS, DOCTRINE_PENALTIES } from '../../../constants/doctrine';
import { DOCTRINE_ABILITY_MAPPINGS, type DoctrineAbilityConfig } from '../../../constants/doctrineAbilityMappings';
import type { DoctrineType, DoctrineTier } from '../../../types/Doctrine';

// Helper: Get army ability for a doctrine at a specific tier
function getArmyAbilityForTier(doctrineType: DoctrineType, tier: DoctrineTier) {
   return DOCTRINE_ABILITY_MAPPINGS.find(a => a.doctrine === doctrineType && a.tier === tier);
}

// Ability dialog state
let showAbilityDialog = false;
let selectedAbility: DoctrineAbilityConfig | null = null;

function openAbilityDialog(ability: DoctrineAbilityConfig) {
   selectedAbility = ability;
   showAbilityDialog = true;
}

function closeAbilityDialog() {
   showAbilityDialog = false;
   selectedAbility = null;
}

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

// Doctrine types for iteration
const doctrineTypes = ['idealist', 'practical', 'ruthless'] as const;
const doctrineTiers: DoctrineTier[] = ['minor', 'moderate', 'major', 'absolute'];

// Doctrine progression expandable state
let showDoctrineProgression = false;

// Leader section state
interface LeaderInfo {
   actorId: string;
   name: string;
   portraitImg: string | null;
   tokenImg: string | null;
}

// Get party members reactively
$: leaders = (() => {
   const game = (globalThis as any).game;
   if (!game?.actors) return [];

   const partyActor = game.actors.find((a: any) => a.type === 'party');
   if (!partyActor?.members) return [];

   const members = Array.from(partyActor.members) as any[];
   return members
      .filter((a: any) => a.type === 'character')
      .map((actor: any): LeaderInfo => ({
         actorId: actor.id,
         name: actor.name,
         portraitImg: actor.img || null,
         tokenImg: actor.prototypeToken?.texture?.src || null
      }));
})();

// Get leader titles from kingdom data
$: leaderTitles = $kingdomData.leaderTitles || {};

// Title editing state
let editingTitleFor: string | null = null;
let editTitleInput = '';
let titleInputElement: HTMLInputElement;

function startEditingTitle(actorId: string) {
   editingTitleFor = actorId;
   editTitleInput = leaderTitles[actorId] || '';
}

async function saveTitle(actorId: string) {
   const newTitle = editTitleInput.trim();
   await updateKingdom((k) => {
      if (!k.leaderTitles) k.leaderTitles = {};
      if (newTitle) {
         k.leaderTitles[actorId] = newTitle;
      } else {
         delete k.leaderTitles[actorId];
      }
   });
   editingTitleFor = null;
}

function cancelEditTitle() {
   editingTitleFor = null;
   editTitleInput = '';
}

// Helper: Get next threshold for a doctrine value
function getNextThreshold(value: number): number | null {
   for (const tier of DOCTRINE_TIER_ORDER) {
      if (tier === 'none') continue;
      const threshold = DOCTRINE_THRESHOLDS[tier];
      if (value < threshold) return threshold;
   }
   return null; // Already at max tier
}

// Helper: Calculate progress percentage toward next tier
function getProgressPercent(value: number): number {
   const nextThreshold = getNextThreshold(value);
   if (!nextThreshold) return 100; // At max tier

   // Find previous threshold
   let prevThreshold = 0;
   for (const tier of DOCTRINE_TIER_ORDER) {
      const threshold = DOCTRINE_THRESHOLDS[tier];
      if (threshold >= nextThreshold) break;
      prevThreshold = threshold;
   }

   const range = nextThreshold - prevThreshold;
   const progress = value - prevThreshold;
   return Math.min(100, Math.round((progress / range) * 100));
}

// Debug: Always log hex data when component mounts or hexes change
$: {
   console.log('[StatusPhase] ===== HEX DATA DEBUG =====');
   console.log('[StatusPhase] Total hexes:', hexes.length);
   
   // Find ALL hexes with ANY features
   const hexesWithFeatures = hexes.filter((h: any) => h.features && h.features.length > 0);
   console.log('[StatusPhase] Hexes with features:', hexesWithFeatures.length);
   hexesWithFeatures.forEach((h: any) => {
      console.log(`  - Hex ${h.id}: claimedBy=${h.claimedBy}, features=`, h.features);
   });
   
   // Find hexes specifically with 'demanded' feature
   const withDemanded = hexes.filter((h: any) => 
      h.features?.some((f: any) => f.type === 'demanded')
   );
   console.log('[StatusPhase] Hexes with demanded feature:', withDemanded.length);
   withDemanded.forEach((h: any) => {
      const feat = h.features.find((f: any) => f.type === 'demanded');
      console.log(`  - Hex ${h.id}: claimedBy="${h.claimedBy}", feat=`, feat);
   });
   console.log('[StatusPhase] ===========================');
}

// Handler to navigate to settlements tab
function navigateToSettlements() {
   setSelectedTab('settlements');
}

// Constants
const MAX_FAME = 3;
const DEFAULT_HEXES_PER_UNREST = 8;

// Get hexes per unrest setting (reactive)
$: hexesPerUnrest = (() => {
   try {
      // @ts-ignore - Foundry globals
      return (game?.settings?.get?.('pf2e-reignmaker', 'hexesPerUnrest') as number) || DEFAULT_HEXES_PER_UNREST;
   } catch {
      return DEFAULT_HEXES_PER_UNREST;
   }
})();

// Computed: Base status modifiers (reactive from kingdom data)
// Note: Kingdom size and metropolis penalties removed - hex counting kept for future modifier use
$: computedStatusModifiers = (() => {
   const modifiers: any[] = [];
   return modifiers;
})();

// Computed: One-time event modifiers from turnState (donjon conversion, etc.)
// Filter out base modifiers (now computed reactively) and fame conversion (moved to Upkeep)
// Also deduplicate by ID to handle legacy data with duplicates
$: eventModifiers = (() => {
   const raw = ($kingdomData.turnState?.statusPhase?.displayModifiers || []).filter(
      (m: any) => m.id && 
         !m.id.startsWith('status-size') && 
         !m.id.startsWith('status-metropolis') &&
         !m.id.startsWith('fame-conversion')  // Fame conversion now shown in Upkeep Phase
   );
   // Deduplicate by ID - keep only the first occurrence of each ID
   const seen = new Set<string>();
   return raw.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
   });
})();

// Combined: All status modifiers for display
$: allStatusModifiers = [...computedStatusModifiers, ...eventModifiers];

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

   <!-- Leaders Section -->
   {#if leaders.length > 0}
      <div class="leaders-section">
         <div class="section-header-minimal">
            <i class="fas fa-crown"></i>
            <h3>Leaders</h3>
         </div>

         <div class="leaders-grid">
            {#each leaders as leader (leader.actorId)}
               <div class="leader-card">
                  <div class="leader-portrait">
                     {#if leader.portraitImg}
                        <img src={leader.portraitImg} alt={leader.name} />
                     {:else if leader.tokenImg}
                        <img src={leader.tokenImg} alt={leader.name} />
                     {:else}
                        <div class="portrait-placeholder">
                           <i class="fas fa-user"></i>
                        </div>
                     {/if}
                  </div>

                  <div class="leader-info">
                     {#if editingTitleFor === leader.actorId}
                        <div class="title-edit">
                           <input
                              bind:this={titleInputElement}
                              bind:value={editTitleInput}
                              on:keydown={(e) => {
                                 if (e.key === 'Enter') saveTitle(leader.actorId);
                                 if (e.key === 'Escape') cancelEditTitle();
                              }}
                              on:blur={() => saveTitle(leader.actorId)}
                              placeholder="Enter title..."
                              class="title-input"
                           />
                        </div>
                     {:else}
                        <button
                           class="leader-title"
                           on:click={async () => {
                              startEditingTitle(leader.actorId);
                              await tick();
                              titleInputElement?.focus();
                              titleInputElement?.select();
                           }}
                           title="Click to edit title"
                        >
                           <i class="fas fa-pen-fancy edit-icon spacer" aria-hidden="true"></i>
                           <span class="title-text">{leaderTitles[leader.actorId] || 'Click to set title'}</span>
                           <i class="fas fa-pen-fancy edit-icon"></i>
                        </button>
                     {/if}

                     <div class="leader-name">{leader.name}</div>
                  </div>
               </div>
            {/each}
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

   <!-- Doctrine Dashboard Section -->
   <div class="doctrine-section">
      <div class="section-header-minimal">
         <i class="fas fa-scroll"></i>
         <h3>Kingdom Doctrine</h3>
      </div>

      <!-- Dominant Doctrine Banner -->
      {#if $doctrineState.dominant}
         {@const dominant = $doctrineState.dominant}
         {@const tierInfo = $doctrineState.tierInfo[dominant]}
         <div class="dominant-doctrine-banner" style="--doctrine-color: {tierInfo.color}">
            <i class="fas {getDoctrineIcon(dominant)} banner-icon"></i>
            <div class="banner-content">
               <span class="banner-label">{tierInfo.label}</span>
               {#if tierInfo.skillBonus > 0}
                  <span class="banner-effect">+{tierInfo.skillBonus} to aligned skills</span>
               {/if}
            </div>
         </div>
      {/if}

      <div class="doctrine-dashboard">
         {#each doctrineTypes as doctrineType}
            {@const value = $doctrine[doctrineType] || 0}
            {@const icon = getDoctrineIcon(doctrineType)}
            {@const tierInfo = $doctrineState.tierInfo[doctrineType]}
            {@const nextThreshold = getNextThreshold(value)}
            {@const progress = getProgressPercent(value)}
            {@const isDominant = $doctrineState.dominant === doctrineType}

            <div class="doctrine-card" class:has-value={value > 0} class:is-dominant={isDominant}>
               <div class="doctrine-header">
                  <i class="fas {icon} doctrine-icon" style="color: {tierInfo.color}"></i>
                  <span class="doctrine-name">{doctrineType}</span>
                  {#if tierInfo.tier !== 'none'}
                     <span class="doctrine-tier-badge" style="background: {tierInfo.color}">{tierInfo.tier}</span>
                  {/if}
               </div>

               <div class="doctrine-progress-container">
                  <div class="doctrine-progress-bar" style="width: {progress}%; background: {tierInfo.color}"></div>
               </div>

               <div class="doctrine-stats">
                  <span class="doctrine-value">{value}</span>
                  {#if nextThreshold}
                     <span class="doctrine-next">/ {nextThreshold}</span>
                  {:else}
                     <span class="doctrine-max">MAX</span>
                  {/if}
               </div>
            </div>
         {/each}
      </div>

      <!-- Expandable Doctrine Progression -->
      <button
         class="doctrine-toggle"
         on:click={() => showDoctrineProgression = !showDoctrineProgression}
      >
         <i class="fas {showDoctrineProgression ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
         {showDoctrineProgression ? 'Hide' : 'Show'} Tier Benefits
      </button>

      {#if showDoctrineProgression}
         <div class="doctrine-progression">
            <div class="doctrine-columns">
               {#each doctrineTypes as doctrineType}
                  {@const tierInfo = $doctrineState.tierInfo[doctrineType]}
                  <div class="doctrine-column">
                     <h5 class="doctrine-column-header" style="border-color: {tierInfo.color}">
                        <i class="fas {getDoctrineIcon(doctrineType)}" style="color: {tierInfo.color}"></i>
                        {doctrineType.charAt(0).toUpperCase() + doctrineType.slice(1)}
                     </h5>
                     <div class="doctrine-skills">
                        {DOCTRINE_SKILL_GROUPS[doctrineType].map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
                     </div>
                     <div class="doctrine-tiers-list">
                        {#each doctrineTiers as tier}
                           {@const effects = DOCTRINE_TIER_EFFECTS[tier]}
                           {@const currentValue = $doctrine[doctrineType] || 0}
                           {@const isReached = currentValue >= DOCTRINE_THRESHOLDS[tier]}
                           {@const armyAbility = getArmyAbilityForTier(doctrineType, tier)}
                           {@const showSkillBonus = tier === 'minor' || tier === 'absolute'}
                           {@const showPenalty = tier === 'absolute' && doctrineType !== 'practical'}
                           {@const showPracticalPenalty = tier === 'absolute' && doctrineType === 'practical'}
                           <div class="doctrine-tier-row" class:reached={isReached}>
                              <div class="tier-header">
                                 <span class="tier-name">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
                                 <span class="tier-threshold">{DOCTRINE_THRESHOLDS[tier]}+</span>
                              </div>
                              <div class="tier-effects">
                                 {#if showSkillBonus}
                                    <span class="tier-bonus">+{effects.skillBonus} aligned skills</span>
                                 {/if}
                                 {#if armyAbility}
                                    <button
                                       class="tier-army"
                                       title={armyAbility.description}
                                       on:click={() => openAbilityDialog(armyAbility)}
                                    >
                                       <span class="army-ability-label">Army Ability</span>
                                       <span class="army-ability-name">
                                          <i class="fas fa-shield-alt"></i>
                                          {armyAbility.name}
                                       </span>
                                    </button>
                                 {/if}
                                 {#if showPenalty}
                                    <span class="tier-penalty">
                                       {#if doctrineType === 'idealist'}+1 consumption
                                       {:else}+1 unrest{/if}
                                    </span>
                                 {/if}
                                 {#if showPracticalPenalty}
                                    <span class="tier-penalty">-1 non-aligned</span>
                                 {/if}
                              </div>
                           </div>
                        {/each}
                     </div>
                  </div>
               {/each}
            </div>
         </div>
      {/if}
   </div>

   <!-- Status Phase Modifiers (Size, Metropolises, Fame Conversion, etc.) -->
   {#if allStatusModifiers.length > 0}
      <div class="status-modifiers">
         <div class="section-header-minimal">
            <i class="fas fa-balance-scale"></i>
            <h3>Status Modifiers</h3>
         </div>

         <div class="modifiers-stack">
            {#each allStatusModifiers as modifier (modifier.id)}
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

   <!-- Citizens Demand Expansion -->
   <CitizensDemandExpansion />

   <!-- Citizens Demand Structure -->
   <CitizensDemandStructure />
</div>

<!-- Army Ability Details Dialog -->
<Dialog
   bind:show={showAbilityDialog}
   title={selectedAbility?.name || 'Army Ability'}
   showConfirm={false}
   cancelLabel="Close"
   width="420px"
   onCancel={closeAbilityDialog}
>
   {#if selectedAbility}
      <div class="ability-dialog-content">
         <p class="ability-description">{selectedAbility.fullDescription || selectedAbility.description}</p>

         <div class="ability-requirement">
            <span class="requirement-label">Requirement:</span>
            <span class="requirement-value">
               {selectedAbility.tier.charAt(0).toUpperCase() + selectedAbility.tier.slice(1)}
               {selectedAbility.doctrine.charAt(0).toUpperCase() + selectedAbility.doctrine.slice(1)}
               doctrine
            </span>
         </div>
      </div>
   {/if}
</Dialog>

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
            text-shadow: 0 0 1.25rem rgba(251, 191, 36, 0.4), 0 0.125rem 0.25rem var(--overlay);
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

   // Leaders Section Styles
   .leaders-section {
      background: transparent;
   }

   .leaders-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-12);
      padding: var(--space-12);
      justify-content: center;

      // Default: 4 per row (for 1-4 and 7-8 cards)
      .leader-card {
         flex: 0 0 calc(25% - var(--space-12) * 3 / 4);
         max-width: calc(25% - var(--space-12) * 3 / 4);
      }
   }

   // 5-6 cards: 3 per row
   .leaders-grid:has(.leader-card:nth-child(5)):not(:has(.leader-card:nth-child(7))) {
      .leader-card {
         flex: 0 0 calc(33.333% - var(--space-12) * 2 / 3);
         max-width: calc(33.333% - var(--space-12) * 2 / 3);
      }
   }

   .leader-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-8);
      background: var(--overlay-low);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      overflow: hidden;
      transition: all 0.2s ease;

      &:hover {
         border-color: var(--border-medium);
         background: var(--overlay);
      }
   }

   .leader-portrait {
      width: 100%;
      aspect-ratio: 1;
      overflow: hidden;
      background: var(--overlay);
      display: flex;
      align-items: center;
      justify-content: center;

      img {
         width: 100%;
         height: 100%;
         object-fit: contain;
      }
   }

   .portrait-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--overlay);
      color: var(--text-tertiary);

      i {
         font-size: var(--font-3xl);
      }
   }

   .leader-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      width: 100%;
      padding: var(--space-8) var(--space-8) var(--space-12);
   }

   .leader-name {
      font-size: var(--font-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      text-align: center;
      line-height: 1.2;
   }

   .leader-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-4);
      font-size: var(--font-sm);
      color: var(--text-secondary);
      background: transparent;
      border: none;
      padding: var(--space-2) var(--space-6);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
         background: var(--overlay);
         color: var(--text-primary);
      }

      .title-text {
         text-transform: capitalize;
      }

      .edit-icon {
         font-size: var(--font-xs);
         opacity: 0;
         transition: opacity 0.2s ease;
         width: 0.75em;

         &.spacer {
            visibility: hidden;
         }
      }

      &:hover .edit-icon:not(.spacer) {
         opacity: 1;
      }
   }

   .title-edit {
      width: 100%;
   }

   .title-input {
      width: 100%;
      padding: var(--space-4) var(--space-8);
      font-size: var(--font-sm);
      background: var(--overlay);
      border: 1px solid var(--border-accent-medium);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      text-align: center;
      text-transform: capitalize;

      &:focus {
         outline: none;
         border-color: var(--color-accent);
         background: var(--overlay-high);
      }

      &::placeholder {
         color: var(--text-tertiary);
         font-style: italic;
         text-transform: none;
      }
   }

   // Doctrine Dashboard Styles
   .dominant-doctrine-banner {
      display: flex;
      align-items: center;
      gap: var(--space-12);
      padding: var(--space-12) var(--space-16);
      background: linear-gradient(135deg,
         rgba(var(--doctrine-color), 0.15),
         rgba(var(--doctrine-color), 0.05));
      border: 1px solid var(--doctrine-color);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-16);

      .banner-icon {
         font-size: var(--font-3xl);
         color: var(--doctrine-color);
      }

      .banner-content {
         display: flex;
         flex-direction: column;
         gap: var(--space-2);
      }

      .banner-label {
         font-size: var(--font-lg);
         font-weight: var(--font-weight-semibold);
         color: var(--text-primary);
      }

      .banner-effect {
         font-size: var(--font-sm);
         color: var(--text-secondary);
      }
   }

   .doctrine-dashboard {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-12);
   }

   .doctrine-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
      padding: var(--space-12) var(--space-16);
      background: var(--overlay-low);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      transition: all 0.2s ease;

      &.is-dominant {
         border-color: var(--color-amber);
         box-shadow: 0 0 0.5rem rgba(251, 191, 36, 0.2);
      }

      .doctrine-header {
         display: flex;
         align-items: center;
         gap: var(--space-8);
      }

      .doctrine-icon {
         font-size: var(--font-xl);
         flex-shrink: 0;
      }

      .doctrine-name {
         font-size: var(--font-md);
         font-weight: var(--font-weight-medium);
         color: var(--text-primary);
         text-transform: capitalize;
         flex: 1;
      }

      .doctrine-tier-badge {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-semibold);
         color: white;
         padding: var(--space-2) var(--space-6);
         border-radius: var(--radius-sm);
         text-transform: capitalize;
      }

      .doctrine-progress-container {
         height: 0.375rem;
         background: var(--overlay);
         border-radius: var(--radius-full);
         overflow: hidden;
      }

      .doctrine-progress-bar {
         height: 100%;
         border-radius: var(--radius-full);
         transition: width 0.3s ease;
      }

      .doctrine-stats {
         display: flex;
         align-items: baseline;
         gap: var(--space-4);
      }

      .doctrine-value {
         font-size: var(--font-xl);
         font-weight: var(--font-weight-bold);
         color: var(--text-primary);
      }

      .doctrine-next {
         font-size: var(--font-sm);
         color: var(--text-tertiary);
      }

      .doctrine-max {
         font-size: var(--font-xs);
         font-weight: var(--font-weight-semibold);
         color: var(--color-success);
         background: rgba(34, 197, 94, 0.2);
         padding: var(--space-2) var(--space-6);
         border-radius: var(--radius-sm);
      }
   }

   /* Doctrine Progression Toggle & Panel */
   .doctrine-toggle {
      width: 100%;
      padding: var(--space-12) var(--space-16);
      margin-top: var(--space-16);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-size: var(--font-lg);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-10);
      transition: all 0.2s ease;

      &:hover {
         background: var(--overlay-high);
         border-color: var(--border-accent-medium);
      }
   }

   .doctrine-progression {
      margin-top: var(--space-16);
      padding: var(--space-20);
      background: var(--overlay-low);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
   }

   .doctrine-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-16);
   }

   .doctrine-column {
      display: flex;
      flex-direction: column;
      gap: var(--space-12);
   }

   .doctrine-column-header {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-size: var(--font-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin: 0;
      padding-bottom: var(--space-10);
      border-bottom: 2px solid;
   }

   .doctrine-skills {
      font-size: var(--font-md);
      color: var(--text-secondary);
      line-height: 1.5;
   }

   .doctrine-tiers-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-10);
   }

   .doctrine-tier-row {
      padding: var(--space-12) var(--space-14);
      background: var(--overlay);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      opacity: 0.6;
      transition: all 0.2s ease;

      &.reached {
         opacity: 1;
         border-color: var(--color-success);
         background: rgba(34, 197, 94, 0.1);
      }
   }

   .tier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-8);
   }

   .tier-name {
      font-size: var(--font-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
   }

   .tier-threshold {
      font-size: var(--font-sm);
      color: var(--text-tertiary);
      background: var(--overlay);
      padding: var(--space-2) var(--space-6);
      border-radius: var(--radius-sm);
   }

   .tier-effects {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-8);
   }

   .tier-bonus,
   .tier-penalty,
   .tier-army {
      font-size: var(--font-md);
      padding: var(--space-4) var(--space-8);
      background: var(--overlay);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
   }

   .tier-army {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: all 0.2s ease;
      padding: var(--space-6) var(--space-10);

      &:hover {
         background: var(--overlay-high);

         .army-ability-name {
            color: var(--color-accent);
         }
      }

      .army-ability-label {
         font-size: var(--font-xs);
         text-transform: uppercase;
         letter-spacing: 0.05em;
         color: var(--text-tertiary);
         font-weight: var(--font-weight-medium);
      }

      .army-ability-name {
         display: flex;
         align-items: center;
         gap: var(--space-6);
         font-size: var(--font-md);
         color: var(--text-primary);
         transition: color 0.2s ease;

         i {
            font-size: var(--font-sm);
         }
      }
   }

   // Ability Dialog Content
   .ability-dialog-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
   }

   .ability-description {
      margin: 0;
      font-size: var(--font-md);
      line-height: 1.6;
      color: var(--text-primary);
   }

   .ability-requirement {
      padding: var(--space-12);
      background: var(--overlay);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
   }

   .requirement-label {
      font-size: var(--font-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-secondary);
   }

   .requirement-value {
      font-size: var(--font-md);
      color: var(--text-primary);
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
      gap: var(--space-12);
      margin-bottom: var(--space-16);
   }

   .settlement-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-12) 0.9375rem;
      background: var(--overlay-low);
      border: 1px solid var(--border-accent-subtle);
      border-radius: var(--radius-md);
      gap: var(--space-16);
      transition: all 0.2s ease;

      &.clickable {
         cursor: pointer;

         &:hover {
            background: var(--surface-accent);
            border-color: var(--border-accent-medium);
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
      background: var(--surface-accent-high);
      border: 1px solid var(--border-accent-subtle);
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
      background: var(--surface-accent-low);
      border: 1px solid var(--border-accent-subtle);
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
