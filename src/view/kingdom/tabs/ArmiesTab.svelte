<script lang="ts">
   import { kingdomData, ledArmies, currentFaction } from '../../../stores/KingdomStore';
   import { PLAYER_KINGDOM } from '../../../types/ownership';
   import type { Army } from '../../../models/Army';
   import { SettlementTierConfig, type SettlementTier } from '../../../models/Settlement';
   import Button from '../components/baseComponents/Button.svelte';
   import InlineEditActions from '../components/baseComponents/InlineEditActions.svelte';
   import DisbandArmyDialog from '../components/DisbandArmyDialog.svelte';
   import RecruitArmyDialog from '../components/RecruitArmyDialog.svelte';
   import { logger } from '../../../utils/Logger';
   import { EQUIPMENT_ICONS } from '../../../utils/presentation';

   // Check if current user is GM
   $: isGM = (globalThis as any).game?.user?.isGM || false;
   
   // GM-only: Show all armies toggle
   let showAllArmies = false;

   // Table state
   let searchTerm = '';
   let filterSupport = 'all'; // 'all', 'supported', 'unsupported'
   let currentPage = 1;
   const itemsPerPage = 25;
   
   // Inline editing state
   let editingArmyId: string | null = null;
   let editingField: 'level' | 'settlement' | 'equipment' | 'ledBy' | 'location' | null = null;
   let editedValue: string | number = '';
   let editedSettlementId: string = '';
   let editedLedBy: string = '';
   let editedLocationSettlementId: string = '';
   let isSaving = false;
   
   // Equipment editing state
   let editingEquipmentArmyId: string | null = null;
   let editingEquipment: Record<string, boolean> = {};
   let originalEquipment: Record<string, boolean> = {};
   
   // Create army dialog state
   let showRecruitDialog = false;
   let isCreatingArmy = false;
   
   // Actor linking state
   let linkingArmyId: string | null = null;
   let actorSearchTerm: string = '';
   let searchInputRef: HTMLInputElement | null = null;
   
   // Disband army dialog state
   let showDisbandDialog = false;
   let disbandingArmyId: string | null = null;
   let disbandingArmy: Army | null = null;
   
   // Get current user's character level for validation
   $: userCharacterLevel = (() => {
      const game = (globalThis as any).game;
      
      if (!game?.user?.character) {
         // No assigned character - default to level 1, user can edit
         return 1;
      }
      
      const character = game.user.character;
      const level = character.level;
      
      if (typeof level !== 'number' || level < 1) {
         return 1;
      }
      
      return level;
   })();
   
   // Base armies list - either all armies (GM mode) or just current faction's
   $: baseArmies = showAllArmies && isGM 
      ? ($kingdomData.armies || []) 
      : [...$ledArmies];
   
   // Apply filters
   $: filteredArmies = (() => {
      let armies = [...baseArmies];
      
      // Search filter
      if (searchTerm) {
         const term = searchTerm.toLowerCase();
         armies = armies.filter(a => 
            a.name.toLowerCase().includes(term) ||
            `level ${a.level}`.includes(term) ||
            (showAllArmies && a.ledBy?.toLowerCase().includes(term))
         );
      }
      
      // Support filter
      if (filterSupport === 'supported') {
         armies = armies.filter(a => a.isSupported);
      } else if (filterSupport === 'unsupported') {
         armies = armies.filter(a => !a.isSupported);
      }
      
      return armies;
   })();
   
   // Pagination
   $: totalPages = Math.ceil(filteredArmies.length / itemsPerPage);
   $: paginatedArmies = filteredArmies.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
   );
   
   // Reset to page 1 when filters change
   $: if (searchTerm || filterSupport || showAllArmies) {
      currentPage = 1;
   }
   
   // Calculate army statistics (based on displayed list)
   $: totalArmies = baseArmies.length;
   $: supportedArmies = baseArmies.filter(a => a.isSupported).length;
   $: unsupportedArmies = totalArmies - supportedArmies;
   
   // Helper to get faction display name
   function getFactionDisplayName(ledBy: string | null): string {
      if (!ledBy || ledBy === PLAYER_KINGDOM) return 'Player';
      // Try to find faction name
      const faction = $kingdomData.factions?.find(f => f.id === ledBy);
      return faction?.name || ledBy;
   }
   
   // Army locations on the map (for location column)
   let armyLocations: Map<string, string> = new Map(); // armyId -> hexId
   
   // Refresh army locations when armies change or component mounts
   async function refreshArmyLocations() {
      try {
         const { armyService } = await import('../../../services/army');
         const locations = armyService.getArmyLocationsOnScene();
         armyLocations = new Map(locations.map(loc => [loc.armyId, loc.hexId]));
      } catch (error) {
         logger.warn('Could not get army locations:', error);
      }
   }
   
   // Refresh on mount and when armies change
   $: if ($kingdomData.armies) {
      refreshArmyLocations();
   }
   
   // Helper to get location display name (settlement name or hex coordinate)
   function getLocationDisplayName(army: Army): string {
      const hexId = armyLocations.get(army.id);
      if (!hexId) return '—'; // Not on map
      
      // Check if there's a settlement at this hex
      const settlements = $kingdomData.settlements || [];
      for (const settlement of settlements) {
         // Settlement hex ID format: "row.col" (e.g., "5.03")
         const settlementHexId = settlement.kingmakerLocation 
            ? `${settlement.kingmakerLocation.x}.${String(settlement.kingmakerLocation.y).padStart(2, '0')}`
            : `${settlement.location.x}.${String(settlement.location.y).padStart(2, '0')}`;
         
         if (settlementHexId === hexId) {
            return settlement.name;
         }
      }
      
      // Return hex coordinate (format: "5.03" -> "5, 3")
      const [row, col] = hexId.split('.');
      return `Hex ${row}, ${parseInt(col, 10)}`;
   }
   
   // Helper functions
   function getSupportStatusIcon(army: Army): string {
      // Non-player armies don't have support status
      if (army.ledBy !== PLAYER_KINGDOM) {
         return 'fa-minus-circle';
      }
      return army.isSupported ? 'fa-check-circle' : 'fa-exclamation-triangle';
   }
   
   function getSupportStatusColor(army: Army): string {
      // Non-player armies don't have support status - use neutral color
      if (army.ledBy !== PLAYER_KINGDOM) {
         return 'status-neutral';
      }
      return army.isSupported ? 'status-supported' : 'status-unsupported';
   }
   
   function getSupportStatusText(army: Army): string {
      // Non-player armies (led by NPC factions) don't have support mechanics
      if (army.ledBy !== PLAYER_KINGDOM) {
         return 'None';
      }
      
      // Allied armies (exempt from upkeep) - show faction name instead of settlement
      if (army.exemptFromUpkeep) {
         // Look up faction name from ID
         if (army.supportedBy === 'playerKingdom') {
            return 'Player Kingdom';
         }
         
         // Import and use factionService to look up name
         const faction = $kingdomData.factions?.find(f => f.id === army.supportedBy);
         return faction?.name || army.supportedBy; // Fallback to ID if faction not found
      }
      
      // Regular player armies - show settlement support status
      if (!army.supportedBySettlementId) {
         return army.turnsUnsupported > 0 
            ? `Unsupported (${army.turnsUnsupported} turns)`
            : 'Unsupported';
      }
      
      const settlement = $kingdomData.settlements.find(
         s => s.id === army.supportedBySettlementId
      );
      
      if (!settlement) {
         return 'Unsupported (settlement lost)';
      }
      
      const capacity = SettlementTierConfig[settlement.tier].armySupport;
      const current = settlement.supportedUnits.length;
      
      return `${settlement.name} (${settlement.tier} ${current}/${capacity})`;
   }
   
   // Get settlements with available capacity (or currently supporting this army)
   // Excludes allied armies (exemptFromUpkeep) from settlement support count
   function getAvailableSettlements(armyId: string) {
      return $kingdomData.settlements.filter(s => {
         const capacity = SettlementTierConfig[s.tier].armySupport;
         // Only count non-allied armies toward settlement capacity
         const supportedRegularArmies = s.supportedUnits.filter((id: string) => {
            const army = $kingdomData.armies.find(a => a.id === id);
            return army && !army.exemptFromUpkeep;
         });
         const current = supportedRegularArmies.length;
         
         // Either has space OR is currently supporting this army
         return current < capacity || s.supportedUnits.includes(armyId);
      });
   }
   
   // Get capacity text for settlement in dropdown
   function getSettlementCapacityText(settlement: any, armyId: string): string {
      const capacity = SettlementTierConfig[settlement.tier as SettlementTier].armySupport;
      const current = settlement.supportedUnits.filter((id: string) => id !== armyId).length;
      
      if (current >= capacity) {
         return 'Full';
      }
      return `${current + 1}/${capacity}`;
   }
   
   // Actor linking functions
   function startLinking(armyId: string) {
      linkingArmyId = armyId;
      actorSearchTerm = '';
      setTimeout(() => {
         searchInputRef?.focus();
      }, 10);
   }
   
   function cancelLinking() {
      linkingArmyId = null;
      actorSearchTerm = '';
   }
   
   async function linkActor(armyId: string, actorId: string) {
      if (armyId === 'new') {
         // Linking to new army - create army from actor
         const actor = (globalThis as any).game?.actors?.get(actorId);
         if (!actor) return;
         
         try {
            const { armyService } = await import('../../../services/army');
            // Create army with actor's name and user's character level
            await armyService.createArmy(actor.name, userCharacterLevel);
            
            // Find the newly created army and link it
            const newArmy = $kingdomData.armies.find(a => a.name === actor.name && !a.actorId);
            if (newArmy) {
               await armyService.linkExistingActor(newArmy.id, actorId);
            }
            
            cancelLinking();
            // @ts-ignore
            ui.notifications?.info(`Created army and linked to ${actor.name}`);
         } catch (error) {
            logger.error('Failed to create army and link actor:', error);
            // @ts-ignore
            ui.notifications?.error(error instanceof Error ? error.message : 'Failed to create army');
         }
      } else {
         // Linking to existing army
         try {
            const { armyService } = await import('../../../services/army');
            await armyService.linkExistingActor(armyId, actorId);
            cancelLinking();
            // @ts-ignore
            ui.notifications?.info('Actor linked successfully');
         } catch (error) {
            logger.error('Failed to link actor:', error);
            // @ts-ignore
            ui.notifications?.error(error instanceof Error ? error.message : 'Failed to link actor');
         }
      }
   }
   
   async function unlinkActor(armyId: string) {
      try {
         const { armyService } = await import('../../../services/army');
         await armyService.unlinkActor(armyId);
         // @ts-ignore
         ui.notifications?.info('Actor unlinked successfully');
      } catch (error) {
         logger.error('Failed to unlink actor:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to unlink actor');
      }
   }
   
   async function createActorForArmy(armyId: string) {
      const army = $kingdomData.armies.find(a => a.id === armyId);
      if (!army) return;
      
      try {
         // @ts-ignore - Foundry VTT API
         const actor = await Actor.create({
            name: army.name,
            type: 'npc',
            folder: null,
            prototypeToken: {
               actorLink: true // Link tokens to actor (changes to actor affect all tokens)
            }
         });
         
         if (actor) {
            const { armyService } = await import('../../../services/army');
            await armyService.linkExistingActor(armyId, actor.id);
            // @ts-ignore
            ui.notifications?.info(`Created and linked actor: ${army.name}`);
         }
      } catch (error) {
         logger.error('Failed to create actor:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create actor');
      }
   }
   
   function getActorName(actorId: string): string {
      // @ts-ignore - Foundry VTT API
      const actor = (globalThis as any).game?.actors?.get(actorId);
      return actor?.name || 'Unknown Actor';
   }
   
   // Filter actors - Include NPCs and characters, exclude system actors
   $: filteredActors = (() => {
      if (!linkingArmyId) return [];
      
      const game = (globalThis as any).game;
      // Include 'npc' and 'character' types, exclude 'loot', 'hazard', 'vehicle', etc.
      const allActors = game?.actors?.filter((a: any) => 
         a.type === 'npc' || a.type === 'character'
      ) || [];
      
      if (!actorSearchTerm.trim()) {
         return allActors;
      }
      
      const searchLower = actorSearchTerm.toLowerCase();
      return allActors.filter((a: any) => a.name.toLowerCase().includes(searchLower));
   })();
   
   // Group actors by type
   $: groupedActors = (() => {
      const characters: any[] = filteredActors.filter((a: any) => a.type === 'character');
      const npcs: any[] = filteredActors.filter((a: any) => a.type === 'npc');
      return { characters, npcs };
   })();
   
   // Inline editing functions
   function startEdit(army: Army, field: 'level') {
      editingArmyId = army.id;
      editingField = field;
      editedValue = army[field];
   }
   
   function startEditingSettlement(army: Army) {
      editingArmyId = army.id;
      editingField = 'settlement';
      editedSettlementId = army.supportedBySettlementId || '';
   }
   
   function startEditingLedBy(army: Army) {
      editingArmyId = army.id;
      editingField = 'ledBy';
      editedLedBy = army.ledBy || PLAYER_KINGDOM;
   }
   
   function startEditingLocation(army: Army) {
      editingArmyId = army.id;
      editingField = 'location';
      // Try to find current settlement from location
      const hexId = armyLocations.get(army.id);
      if (hexId) {
         const settlement = $kingdomData.settlements?.find(s => {
            const settlementHexId = s.kingmakerLocation 
               ? `${s.kingmakerLocation.x}.${String(s.kingmakerLocation.y).padStart(2, '0')}`
               : `${s.location.x}.${String(s.location.y).padStart(2, '0')}`;
            return settlementHexId === hexId;
         });
         editedLocationSettlementId = settlement?.id || '';
      } else {
         editedLocationSettlementId = '';
      }
   }
   
   // Get available settlements for location dropdown
   $: availableLocationSettlements = (() => {
      const settlements = $kingdomData.settlements || [];
      const hexes = $kingdomData.hexes || [];
      
      return settlements
         .filter(s => {
            // Must have a valid location
            const hasLocation = s.location.x !== 0 || s.location.y !== 0;
            if (!hasLocation) return false;
            
            // If not GM, only show player-owned settlements
            if (!isGM) {
               const hexId = s.kingmakerLocation 
                  ? `${s.kingmakerLocation.x}.${String(s.kingmakerLocation.y).padStart(2, '0')}`
                  : `${s.location.x}.${String(s.location.y).padStart(2, '0')}`;
               const hex = hexes.find((h: any) => h.id === hexId);
               return hex?.claimedBy === PLAYER_KINGDOM;
            }
            
            return true;
         })
         .map(s => ({
            id: s.id,
            name: s.name,
            location: s.location
         }));
   })();
   
   function cancelEdit() {
      editingArmyId = null;
      editingField = null;
      editedValue = '';
      editedLedBy = '';
      editedLocationSettlementId = '';
      editingEquipmentArmyId = null;
      editingEquipment = {};
      originalEquipment = {};
   }
   
   // Equipment editing functions
   function startEditingEquipment(army: Army) {
      if (!army.actorId) {
         // @ts-ignore
         ui.notifications?.warn('Army must have a linked actor to edit equipment');
         return;
      }
      
      editingArmyId = army.id;
      editingField = 'equipment';
      editingEquipmentArmyId = army.id;
      
      // Initialize editing state with current equipment
      const current = army.equipment || {};
      editingEquipment = {
         armor: !!current.armor,
         runes: !!current.runes,
         weapons: !!current.weapons,
         equipment: !!current.equipment
      };
      
      // Store original state for cancel
      originalEquipment = { ...editingEquipment };
   }
   
   function toggleEquipment(equipmentType: 'armor' | 'runes' | 'weapons' | 'equipment') {
      editingEquipment[equipmentType] = !editingEquipment[equipmentType];
   }
   
   async function saveEquipmentEdit(armyId: string) {
      const army = $kingdomData.armies.find(a => a.id === armyId);
      if (!army || !army.actorId) {
         // @ts-ignore
         ui.notifications?.error('Army or actor not found');
         cancelEdit();
         return;
      }
      
      isSaving = true;
      try {
         const { armyService } = await import('../../../services/army');
         const { createEquipmentEffect } = await import('../../../services/commands/armies/armyCommands');
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         const game = (globalThis as any).game;
         const actor = game?.actors?.get(army.actorId);
         
         if (!actor) {
            // @ts-ignore
            ui.notifications?.error('Actor not found');
            cancelEdit();
            return;
         }
         
         // Find items to add and remove
         const equipmentTypes: Array<'armor' | 'runes' | 'weapons' | 'equipment'> = ['armor', 'runes', 'weapons', 'equipment'];
         
         for (const type of equipmentTypes) {
            const shouldHave = editingEquipment[type];
            const currentlyHas = originalEquipment[type];
            
            if (shouldHave && !currentlyHas) {
               // Add equipment effect
               const effectData = createEquipmentEffect(type, 1); // Default to +1 bonus
               await armyService.addItemToArmy(army.actorId, effectData);
               logger.info(`✅ [ArmiesTab] Added ${type} equipment to ${army.name}`);
            } else if (!shouldHave && currentlyHas) {
               // Remove equipment effect
               const items = Array.from(actor.items.values());
               const item = items.find((i: any) => i.system?.slug === `army-equipment-${type}`);
               
               if (item) {
                  await armyService.removeItemFromArmy(army.actorId, item.id);
                  logger.info(`✅ [ArmiesTab] Removed ${type} equipment from ${army.name}`);
               }
            }
         }
         
         // Update kingdom data to reflect changes (the hook will also do this, but we do it here for immediate UI update)
         await updateKingdom(kingdom => {
            const a = kingdom.armies.find((a: Army) => a.id === armyId);
            if (a) {
               if (!a.equipment) a.equipment = {};
               a.equipment.armor = editingEquipment.armor;
               a.equipment.runes = editingEquipment.runes;
               a.equipment.weapons = editingEquipment.weapons;
               a.equipment.equipment = editingEquipment.equipment;
            }
         });
         
         // @ts-ignore
         ui.notifications?.info('Equipment updated successfully');
         cancelEdit();
      } catch (error) {
         logger.error('Failed to save equipment edit:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to save equipment changes');
      } finally {
         isSaving = false;
      }
   }
   
   async function saveEdit(armyId: string) {
      if (!editedValue && editingField !== 'settlement' && editingField !== 'ledBy' && editingField !== 'location') return;
      
      isSaving = true;
      try {
         const { armyService } = await import('../../../services/army');
         
         if (editingField === 'level') {
            // Update level
            await armyService.updateArmyLevel(armyId, Number(editedValue));
         } else if (editingField === 'settlement') {
            // Update settlement assignment
            await armyService.assignArmyToSettlement(
               armyId,
               editedSettlementId || null
            );
            // @ts-ignore
            ui.notifications?.info('Army support assignment updated');
         } else if (editingField === 'ledBy') {
            // Update faction ownership
            await armyService.updateArmyFaction(armyId, editedLedBy);
            // @ts-ignore
            ui.notifications?.info('Army faction updated');
         } else if (editingField === 'location') {
            // Move or place army token at settlement
            if (!editedLocationSettlementId) {
               // @ts-ignore
               ui.notifications?.warn('Please select a settlement');
               return;
            }
            
            const settlement = $kingdomData.settlements?.find(s => s.id === editedLocationSettlementId);
            if (!settlement) {
               throw new Error('Settlement not found');
            }
            
            await armyService.moveArmyToSettlement(armyId, settlement);
            await refreshArmyLocations();
            // @ts-ignore
            ui.notifications?.info(`Army moved to ${settlement.name}`);
         }
         
         cancelEdit();
      } catch (error) {
         logger.error('Failed to save edit:', error);
         // @ts-ignore
         ui.notifications?.error(error instanceof Error ? error.message : 'Failed to save changes');
      } finally {
         isSaving = false;
      }
   }
   
   function handleKeydown(event: KeyboardEvent, armyId: string) {
      if (event.key === 'Enter') {
         saveEdit(armyId);
      } else if (event.key === 'Escape') {
         cancelEdit();
      }
   }
   
   // Create army functions
   function startCreating() {
      showRecruitDialog = true;
   }
   
   async function handleRecruitConfirm(event: CustomEvent<{ name: string; settlementId: string | null; armyType: string; ledBy?: string }>) {
      const { name, settlementId, armyType, ledBy } = event.detail;
      
      isCreatingArmy = true;
      try {
         const { armyService } = await import('../../../services/army');
         const { ARMY_TYPES } = await import('../../../utils/armyHelpers');
         const { PLAYER_KINGDOM } = await import('../../../types/ownership');
         
         // Use GM-selected faction if provided, otherwise use current faction or player kingdom
         const factionId = ledBy || $currentFaction || PLAYER_KINGDOM;
         
         // Create army with selected type, image, and ledBy faction
         // Token placement is handled by _createArmyInternal, so we don't need to do it here
         const army = await armyService.createArmy(name, userCharacterLevel, {
            type: armyType,
            image: ARMY_TYPES[armyType as keyof typeof ARMY_TYPES].image,
            ledBy: factionId  // Set the faction that leads this army
         });
         
         // Assign to selected settlement if provided
         if (settlementId) {
            await armyService.assignArmyToSettlement(army.id, settlementId);
         }
         
         // Token placement is already handled in _createArmyInternal, so we don't need to do it here
         // This prevents duplicate token placement
         
         // @ts-ignore
         ui.notifications?.info(`Recruited ${name}!`);
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Failed to recruit army';
         // @ts-ignore
         ui.notifications?.error(errorMessage);
      } finally {
         isCreatingArmy = false;
      }
   }
   
   function handleRecruitCancel() {
      // Dialog handles its own state
   }
   
   // Open NPC actor sheet or offer to recreate if missing
   async function openActorSheet(army: Army) {
      const game = (globalThis as any).game;
      
      // Check if actor exists
      if (army.actorId) {
         const actor = game?.actors?.get(army.actorId);
         
         if (actor) {
            // Actor exists - open it
            actor.sheet.render(true);
            return;
         }
      }
      
      // Actor missing or not linked - offer to create/recreate
      // @ts-ignore
      const confirmed = await Dialog.confirm({
         title: 'Missing NPC Actor',
         content: army.actorId 
            ? `<p>The NPC actor for <strong>${army.name}</strong> was not found (may have been deleted).</p><p>Would you like to create a new NPC actor?</p>`
            : `<p><strong>${army.name}</strong> has no linked NPC actor.</p><p>Would you like to create one?</p>`,
         yes: () => true,
         no: () => false
      });
      
      if (!confirmed) return;
      
      try {
         const { armyService } = await import('../../../services/army');
         const { updateKingdom } = await import('../../../stores/KingdomStore');
         
         // Create new NPC actor
         const newActorId = await armyService.createNPCActor(army.name, army.level);
         
         // Update army with new actor ID
         await updateKingdom(k => {
            const armyToUpdate = k.armies.find(a => a.id === army.id);
            if (armyToUpdate) {
               armyToUpdate.actorId = newActorId;
            }
         });
         
         // Open the newly created actor
         const newActor = game?.actors?.get(newActorId);
         if (newActor) {
            newActor.sheet.render(true);
            // @ts-ignore
            ui.notifications?.info(`Created new NPC actor for ${army.name}`);
         }
      } catch (error) {
         logger.error('Failed to create NPC actor:', error);
         // @ts-ignore
         ui.notifications?.error('Failed to create NPC actor');
      }
   }
   
   // Delete army
   function deleteArmy(armyId: string) {
      const army = $kingdomData.armies.find(a => a.id === armyId);
      if (!army) return;
      
      disbandingArmyId = armyId;
      disbandingArmy = army;
      showDisbandDialog = true;
   }
   
   async function handleDisbandConfirm(event: CustomEvent<{ deleteActor: boolean }>) {
      if (!disbandingArmyId) return;
      
      const { deleteActor } = event.detail;
      const armyName = disbandingArmy?.name || 'Army';
      
      try {
         const { armyService } = await import('../../../services/army');
         const result = await armyService.disbandArmy(disbandingArmyId, deleteActor);
         
         // For players, result may be undefined (fire-and-forget)
         // The operation still succeeds on GM side and syncs back
         if (result) {
            // @ts-ignore
            ui.notifications?.info(`Disbanded ${result.armyName}`);
         } else {
            // @ts-ignore
            ui.notifications?.info(`${armyName} disbanded successfully`);
         }
      } catch (error) {
         // Error message already shown by ActionDispatcher or lower-level service
         // Just show user-friendly notification
         const errorMessage = error instanceof Error ? error.message : 'Failed to disband army';
         // @ts-ignore
         ui.notifications?.error(errorMessage);
      } finally {
         disbandingArmyId = null;
         disbandingArmy = null;
      }
   }
   
   function handleDisbandCancel() {
      disbandingArmyId = null;
      disbandingArmy = null;
   }
   
   // Pagination
   function nextPage() {
      if (currentPage < totalPages) {
         currentPage++;
      }
   }
   
   function prevPage() {
      if (currentPage > 1) {
         currentPage--;
      }
   }
   
   function goToPage(page: number) {
      currentPage = Math.max(1, Math.min(page, totalPages));
   }
</script>

<!-- Recruit Army Dialog -->
<RecruitArmyDialog
   bind:show={showRecruitDialog}
   {isGM}
   on:confirm={handleRecruitConfirm}
   on:cancel={handleRecruitCancel}
/>

<!-- Disband Army Dialog -->
{#if disbandingArmy}
   <DisbandArmyDialog
      bind:show={showDisbandDialog}
      armyName={disbandingArmy.name}
      armyLevel={disbandingArmy.level}
      hasLinkedActor={!!disbandingArmy.actorId}
      isSupported={disbandingArmy.isSupported}
      supportedBySettlement={disbandingArmy.supportedBySettlementId 
         ? $kingdomData.settlements.find(s => s.id === disbandingArmy?.supportedBySettlementId)?.name || ''
         : ''}
      on:confirm={handleDisbandConfirm}
      on:cancel={handleDisbandCancel}
   />
{/if}

<div class="armies-tab">
   <!-- Summary Stats -->
   <div class="armies-summary">
      <div class="summary-card">
         <i class="fas fa-shield-alt"></i>
         <div>
            <div class="summary-value">{totalArmies}</div>
            <div class="summary-label">Total</div>
         </div>
      </div>
      <div class="summary-card">
         <i class="fas fa-check-circle status-supported"></i>
         <div>
            <div class="summary-value">{supportedArmies}</div>
            <div class="summary-label">Supported</div>
         </div>
      </div>
      <div class="summary-card">
         <i class="fas fa-exclamation-triangle status-unsupported"></i>
         <div>
            <div class="summary-value">{unsupportedArmies}</div>
            <div class="summary-label">Unsupported</div>
         </div>
      </div>
   </div>
   
   <!-- Filters -->
   <div class="table-controls">
      <select bind:value={filterSupport} class="filter-select">
         <option value="all">All Armies</option>
         <option value="supported">Supported Only</option>
         <option value="unsupported">Unsupported Only</option>
      </select>
      
      {#if isGM}
         <label class="gm-checkbox">
            <input type="checkbox" bind:checked={showAllArmies} />
            <span>Show all factions' armies</span>
         </label>
      {/if}
   </div>
   
   <!-- Table -->
   <div class="armies-table-container">
      <div class="armies-table-wrapper">
         <table class="armies-table">
         <thead>
            <tr>
               <th>Name</th>
               {#if showAllArmies && isGM}
                  <th>Led By</th>
               {/if}
               <th>Location</th>
               <th>Level</th>
               <th>Gear</th>
               <th>Support Status</th>
               <th>Actions</th>
            </tr>
         </thead>
         <tbody>
            <!-- Data Rows -->
            {#each paginatedArmies as army}
               <tr>
                  {#if linkingArmyId === army.id}
                     <!-- Linking mode: Full-width actor search -->
                     <td colspan={showAllArmies && isGM ? 6 : 5}>
                        <div class="actor-autosuggest">
                           <input 
                              type="text" 
                              bind:value={actorSearchTerm}
                              bind:this={searchInputRef}
                              placeholder="Search actors..."
                              class="autosuggest-input"
                           />
                           
                           {#if filteredActors.length > 0}
                              <div class="suggestions-dropdown">
                                 {#if groupedActors.characters.length > 0}
                                    <div class="suggestion-group">
                                       <div class="group-header">Characters ({groupedActors.characters.length})</div>
                                       {#each groupedActors.characters as actor}
                                          <button 
                                             class="suggestion-item"
                                             on:click={() => linkActor(army.id, actor.id)}
                                          >
                                             {actor.name}
                                          </button>
                                       {/each}
                                    </div>
                                 {/if}
                                 
                                 {#if groupedActors.npcs.length > 0}
                                    <div class="suggestion-group">
                                       <div class="group-header">NPCs ({groupedActors.npcs.length})</div>
                                       {#each groupedActors.npcs as actor}
                                          <button 
                                             class="suggestion-item"
                                             on:click={() => linkActor(army.id, actor.id)}
                                          >
                                             {actor.name}
                                          </button>
                                       {/each}
                                    </div>
                                 {/if}
                              </div>
                           {:else if actorSearchTerm.trim() !== ''}
                              <div class="suggestions-dropdown">
                                 <div class="no-results">No actors found</div>
                              </div>
                           {/if}
                        </div>
                     </td>
                     <td>
                        <div class="person-actions">
                           <button class="action-btn" on:click={cancelLinking} title="Cancel">
                              <i class="fas fa-times"></i>
                           </button>
                           <button 
                              class="delete-btn" 
                              on:click={() => deleteArmy(army.id)}
                              title="Disband army"
                           >
                              <i class="fas fa-trash"></i>
                           </button>
                        </div>
                     </td>
                  {:else}
                     <!-- Normal mode: All columns visible -->
                     <!-- Name Column -->
                     <td>
                        <button
                           class="army-name-btn" 
                           on:click={() => openActorSheet(army)}
                           title={army.actorId ? "Open actor sheet" : "Create actor"}
                        >
                           {army.actorId ? getActorName(army.actorId) : army.name}
                           {#if army.actorId}
                              <i class="fas fa-link link-icon"></i>
                           {/if}
                        </button>
                     </td>
                     
                     <!-- Led By Column (GM only when showing all) -->
                     {#if showAllArmies && isGM}
                        <td class="led-by-cell">
                           {#if editingArmyId === army.id && editingField === 'ledBy'}
                              <div class="inline-edit">
                                 <select 
                                    bind:value={editedLedBy}
                                    class="inline-select"
                                    disabled={isSaving}
                                 >
                                    <option value={PLAYER_KINGDOM}>Player Kingdom</option>
                                    {#each $kingdomData.factions || [] as faction}
                                       <option value={faction.id}>{faction.name}</option>
                                    {/each}
                                 </select>
                                 <InlineEditActions
                                    onSave={() => saveEdit(army.id)}
                                    onCancel={cancelEdit}
                                    disabled={isSaving}
                                 />
                              </div>
                           {:else}
                              <button 
                                 class="faction-badge editable" 
                                 class:player={army.ledBy === PLAYER_KINGDOM || !army.ledBy}
                                 on:click={() => startEditingLedBy(army)}
                                 title="Click to change faction"
                              >
                                 {getFactionDisplayName(army.ledBy)}
                              </button>
                           {/if}
                        </td>
                     {/if}
                     
                     <!-- Location Column -->
                     <td class="location-cell">
                        {#if editingArmyId === army.id && editingField === 'location'}
                           <div class="inline-edit">
                              <select 
                                 bind:value={editedLocationSettlementId}
                                 class="inline-select"
                                 disabled={isSaving}
                              >
                                 <option value="">Select settlement...</option>
                                 {#each availableLocationSettlements as settlement}
                                    <option value={settlement.id}>{settlement.name}</option>
                                 {/each}
                              </select>
                              <InlineEditActions
                                 onSave={() => saveEdit(army.id)}
                                 onCancel={cancelEdit}
                                 disabled={isSaving}
                              />
                           </div>
                        {:else}
                           <button 
                              class="location-value editable" 
                              on:click={() => startEditingLocation(army)}
                              title={armyLocations.get(army.id) ? `Current: ${armyLocations.get(army.id)}` : 'Click to place on map'}
                           >
                              {getLocationDisplayName(army)}
                           </button>
                        {/if}
                     </td>
                     
                     <!-- Level Column -->
                     <td>
                        {#if editingArmyId === army.id && editingField === 'level'}
                           <div class="inline-edit">
                              <input 
                                 type="number" 
                                 bind:value={editedValue}
                                 on:keydown={(e) => handleKeydown(e, army.id)}
                                 min="1"
                                 max="20"
                                 class="inline-input"
                                 disabled={isSaving}
                              />
                              <InlineEditActions
                                 onSave={() => saveEdit(army.id)}
                                 onCancel={cancelEdit}
                                 disabled={isSaving}
                              />
                           </div>
                        {:else}
                           <button
                              class="editable-cell" 
                              on:click={() => startEdit(army, 'level')}
                              title="Click to edit"
                           >
                              {army.level}
                           </button>
                        {/if}
                     </td>
                     
                     <!-- Gear Column -->
                     <td>
                        {#if editingArmyId === army.id && editingField === 'equipment'}
                           <!-- Edit mode: Toggleable icons with save/cancel -->
                           <div class="gear-edit">
                              <div class="gear-icons">
                                 <button
                                    class="gear-icon-btn"
                                    class:active={editingEquipment.armor}
                                    on:click={() => toggleEquipment('armor')}
                                    title={editingEquipment.armor ? 'Armor equipped (click to remove)' : 'No armor (click to add)'}
                                    disabled={isSaving}
                                 >
                                    <i class="{EQUIPMENT_ICONS.armor} gear-icon"></i>
                                 </button>
                                 <button
                                    class="gear-icon-btn"
                                    class:active={editingEquipment.runes}
                                    on:click={() => toggleEquipment('runes')}
                                    title={editingEquipment.runes ? 'Runes equipped (click to remove)' : 'No runes (click to add)'}
                                    disabled={isSaving}
                                 >
                                    <i class="{EQUIPMENT_ICONS.runes} gear-icon"></i>
                                 </button>
                                 <button
                                    class="gear-icon-btn"
                                    class:active={editingEquipment.weapons}
                                    on:click={() => toggleEquipment('weapons')}
                                    title={editingEquipment.weapons ? 'Weapons equipped (click to remove)' : 'No weapons (click to add)'}
                                    disabled={isSaving}
                                 >
                                    <i class="{EQUIPMENT_ICONS.weapons} gear-icon"></i>
                                 </button>
                                 <button
                                    class="gear-icon-btn"
                                    class:active={editingEquipment.equipment}
                                    on:click={() => toggleEquipment('equipment')}
                                    title={editingEquipment.equipment ? 'Enhanced gear equipped (click to remove)' : 'No enhanced gear (click to add)'}
                                    disabled={isSaving}
                                 >
                                    <i class="{EQUIPMENT_ICONS.equipment} gear-icon"></i>
                                 </button>
                              </div>
                              <InlineEditActions
                                 onSave={() => saveEquipmentEdit(army.id)}
                                 onCancel={cancelEdit}
                                 disabled={isSaving}
                              />
                           </div>
                        {:else}
                           <!-- Display mode: Click to edit -->
                           <button
                              class="gear-display-btn"
                              on:click={() => startEditingEquipment(army)}
                              title="Click to edit equipment"
                              disabled={!army.actorId}
                           >
                              <div class="gear-icons">
                                 <i 
                                    class="{EQUIPMENT_ICONS.armor} gear-icon" 
                                    class:owned={army.equipment?.armor}
                                    title={army.equipment?.armor ? 'Armor equipped' : 'No armor'}
                                 ></i>
                                 <i 
                                    class="{EQUIPMENT_ICONS.runes} gear-icon" 
                                    class:owned={army.equipment?.runes}
                                    title={army.equipment?.runes ? 'Runes equipped' : 'No runes'}
                                 ></i>
                                 <i 
                                    class="{EQUIPMENT_ICONS.weapons} gear-icon" 
                                    class:owned={army.equipment?.weapons}
                                    title={army.equipment?.weapons ? 'Weapons equipped' : 'No weapons'}
                                 ></i>
                                 <i 
                                    class="{EQUIPMENT_ICONS.equipment} gear-icon" 
                                    class:owned={army.equipment?.equipment}
                                    title={army.equipment?.equipment ? 'Enhanced gear equipped' : 'No enhanced gear'}
                                 ></i>
                              </div>
                           </button>
                        {/if}
                     </td>
                     
                     <!-- Support Status Column -->
                     <td>
                        {#if editingArmyId === army.id && editingField === 'settlement'}
                           <!-- Editing: Show dropdown -->
                           <div class="inline-edit">
                              <select 
                                 bind:value={editedSettlementId}
                                 class="settlement-dropdown"
                                 disabled={isSaving}
                              >
                                 <option value="">Unsupported</option>
                                 {#each getAvailableSettlements(army.id) as settlement}
                                    <option value={settlement.id}>
                                       {settlement.name} ({settlement.tier} {getSettlementCapacityText(settlement, army.id)})
                                    </option>
                                 {/each}
                              </select>
                              <InlineEditActions
                                 onSave={() => saveEdit(army.id)}
                                 onCancel={cancelEdit}
                                 disabled={isSaving}
                              />
                           </div>
                        {:else}
                           <!-- Display: Click to edit (only for player armies) -->
                           {#if army.ledBy !== PLAYER_KINGDOM}
                              <!-- Non-player armies: Read-only, no support mechanics -->
                              <div class="support-status-display {getSupportStatusColor(army)}">
                                 <i class="fas {getSupportStatusIcon(army)}"></i>
                                 {getSupportStatusText(army)}
                              </div>
                           {:else}
                              <!-- Player armies: Editable -->
                              <button
                                 class="support-status-btn {getSupportStatusColor(army)}"
                                 on:click={() => startEditingSettlement(army)}
                                 title="Click to change settlement"
                              >
                                 <i class="fas {getSupportStatusIcon(army)}"></i>
                                 {getSupportStatusText(army)}
                              </button>
                           {/if}
                        {/if}
                     </td>
                     
                     <!-- Actions Column -->
                     <td>
                        <div class="person-actions">
                           {#if army.actorId}
                              <button 
                                 class="action-btn" 
                                 on:click={() => unlinkActor(army.id)}
                                 title="Unlink actor"
                              >
                                 <i class="fas fa-unlink"></i>
                              </button>
                           {:else}
                              <button 
                                 class="action-btn" 
                                 on:click={() => startLinking(army.id)}
                                 title="Link existing actor"
                              >
                                 <i class="fas fa-link"></i>
                              </button>
                              <button 
                                 class="action-btn primary" 
                                 on:click={() => createActorForArmy(army.id)}
                                 title="Create new actor"
                              >
                                 <i class="fas fa-plus"></i>
                              </button>
                           {/if}
                           <button 
                              class="delete-btn" 
                              on:click={() => deleteArmy(army.id)}
                              title="Disband army"
                           >
                              <i class="fas fa-trash"></i>
                           </button>
                        </div>
                     </td>
                  {/if}
               </tr>
            {/each}
            
            <!-- Add Army Row -->
            <tr class="add-row">
               <td colspan="4">
                  {#if linkingArmyId === 'new'}
                     <!-- Linking mode: Actor search autosuggest -->
                     <div class="actor-autosuggest">
                        <input 
                           type="text" 
                           bind:value={actorSearchTerm}
                           bind:this={searchInputRef}
                           placeholder="Search actors..."
                           class="autosuggest-input"
                        />
                        
                        {#if filteredActors.length > 0}
                           <div class="suggestions-dropdown">
                              {#if groupedActors.characters.length > 0}
                                 <div class="suggestion-group">
                                    <div class="group-header">Characters ({groupedActors.characters.length})</div>
                                    {#each groupedActors.characters as actor}
                                       <button 
                                          class="suggestion-item"
                                          on:click={() => linkActor('new', actor.id)}
                                       >
                                          {actor.name}
                                       </button>
                                    {/each}
                                 </div>
                              {/if}
                              
                              {#if groupedActors.npcs.length > 0}
                                 <div class="suggestion-group">
                                    <div class="group-header">NPCs ({groupedActors.npcs.length})</div>
                                    {#each groupedActors.npcs as actor}
                                       <button 
                                          class="suggestion-item"
                                          on:click={() => linkActor('new', actor.id)}
                                       >
                                          {actor.name}
                                       </button>
                                    {/each}
                                 </div>
                              {/if}
                           </div>
                        {:else if actorSearchTerm.trim() !== ''}
                           <div class="suggestions-dropdown">
                              <div class="no-results">No actors found</div>
                           </div>
                        {/if}
                     </div>
                  {:else}
                     <!-- Default: Show prompt -->
                     <span class="add-prompt">Recruit Army</span>
                  {/if}
               </td>
               <td>
                  <div class="person-actions">
                     {#if linkingArmyId === 'new'}
                        <button class="action-btn" on:click={cancelLinking} title="Cancel">
                           <i class="fas fa-times"></i>
                        </button>
                     {:else}
                        <button class="action-btn" on:click={() => startLinking('new')} title="Link existing actor">
                           <i class="fas fa-link"></i>
                        </button>
                        <button class="action-btn primary" on:click={startCreating} title="Recruit new army">
                           <i class="fas fa-plus"></i>
                        </button>
                     {/if}
                  </div>
               </td>
            </tr>
            </tbody>
         </table>
      </div>
   </div>
   
   <!-- Pagination -->
   {#if totalPages > 1}
      <div class="pagination">
         <button 
            class="page-btn" 
            on:click={prevPage}
            disabled={currentPage === 1}
         >
            <i class="fas fa-chevron-left"></i>
         </button>
         
         <span class="page-info">
            Page {currentPage} of {totalPages}
         </span>
         
         <button 
            class="page-btn" 
            on:click={nextPage}
            disabled={currentPage === totalPages}
         >
            <i class="fas fa-chevron-right"></i>
         </button>
      </div>
   {/if}
</div>

<style lang="scss">
   .armies-tab {
      display: flex;
      flex-direction: column;
      gap: var(--space-16);
      height: 100%;
      padding: var(--space-16);
   }
   
   .armies-summary {
      display: flex;
      gap: var(--space-16);
      flex-wrap: wrap;
      align-items: center;
      
      .summary-card {
         display: flex;
         align-items: center;
         gap: var(--space-12);
         background: var(--overlay-low);
         padding: var(--space-12) var(--space-16);
         border-radius: var(--radius-lg);
         border: 1px solid var(--border-subtle);
         
         i {
            font-size: var(--font-2xl);
            color: var(--color-white, #ffffff);
            
            &.status-supported {
               color: #90ee90;
            }
            
            &.status-unsupported {
               color: #ffa500;
            }
         }
         
         .summary-value {
            font-size: var(--font-xl);
            font-weight: var(--font-weight-bold);
            color: var(--color-text-dark-primary, #b5b3a4);
         }
         
         .summary-label {
            font-size: var(--font-sm);
            color: var(--text-medium-light, #9e9b8f);
         }
      }
      
      :global(button) {
         margin-left: auto;
      }
   }
   
   .table-controls {
      display: flex;
      gap: var(--space-16);
      align-items: center;
      
      .filter-select {
         padding: var(--space-8);
         background: var(--overlay);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-lg);
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            border-color: var(--color-primary, #5e0000);
         }
      }
      
      .gm-checkbox {
         display: flex;
         align-items: center;
         gap: var(--space-8);
         cursor: pointer;
         padding: var(--space-8) var(--space-12);
         background: var(--surface-warning-low);
         border: 1px solid var(--border-warning-subtle);
         border-radius: var(--radius-md);
         font-size: var(--font-md);
         color: var(--text-primary);
         
         input[type="checkbox"] {
            width: 1rem;
            height: 1rem;
            cursor: pointer;
         }
         
         span {
            white-space: nowrap;
         }
      }
   }
   
   .led-by-cell {
      .faction-badge {
         display: inline-block;
         padding: var(--space-4) var(--space-8);
         border-radius: var(--radius-sm);
         font-size: var(--font-sm);
         font-weight: 500;
         background: var(--overlay);
         border: 1px solid var(--border-subtle);
         color: var(--text-secondary);
         
         &.player {
            background: var(--surface-success-low);
            border-color: var(--border-success-subtle);
            color: var(--color-green);
         }
         
         &.editable {
            cursor: pointer;
            transition: all 0.2s ease;
            
            &:hover {
               border-color: var(--border-highlight);
               background: var(--overlay-high);
            }
         }
      }
      
      .inline-edit {
         display: flex;
         align-items: center;
         gap: var(--space-8);
      }
      
      .inline-select {
         padding: var(--space-4) var(--space-8);
         background: var(--overlay);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-sm);
         color: var(--text-primary);
         font-size: var(--font-sm);
         min-width: 120px;
         
         &:focus {
            outline: none;
            border-color: var(--color-amber);
         }
      }
   }
   
   .location-cell {
      .location-value {
         display: inline-block;
         padding: var(--space-4) var(--space-8);
         border-radius: var(--radius-sm);
         font-size: var(--font-sm);
         color: var(--text-secondary);
         background: var(--overlay);
         border: 1px solid var(--border-subtle);
         
         &.editable {
            cursor: pointer;
            transition: all 0.2s ease;
            
            &:hover {
               border-color: var(--border-highlight);
               background: var(--overlay-high);
            }
         }
      }
      
      .inline-edit {
         display: flex;
         align-items: center;
         gap: var(--space-8);
      }
      
      .inline-select {
         padding: var(--space-4) var(--space-8);
         background: var(--overlay);
         border: 1px solid var(--border-default);
         border-radius: var(--radius-sm);
         color: var(--text-primary);
         font-size: var(--font-sm);
         min-width: 140px;
         
         &:focus {
            outline: none;
            border-color: var(--color-amber);
         }
      }
   }
   
   .armies-table-container {
      flex: 1;
      overflow-y: auto;
      background: var(--overlay-low);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      position: relative;
   }
   
   .armies-table-wrapper {
      overflow: visible;
      position: relative;
      z-index: auto;
   }
   
   .armies-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      position: relative;
      overflow: visible;
      
      thead {
         background: var(--overlay);
         position: sticky;
         top: 0;
         z-index: 1;
         
         th {
            padding: var(--space-12) var(--space-16);
            text-align: left;
            font-weight: var(--font-weight-semibold);
            color: var(--color-text-dark-primary, #b5b3a4);
            border-bottom: 1px solid var(--border-subtle);
         }
      }
      
      tbody {
         tr {
            border-bottom: 1px solid var(--border-faint);
            
            &:hover:not(.create-row) {
               background: var(--hover-low);
            }
            
            &.add-row {
               background: var(--overlay-low);
            }
         }
         
         td {
            padding: var(--space-12) var(--space-16);
            color: var(--color-text-dark-primary, #b5b3a4);
            position: relative;
            overflow: visible;
            
            &.empty-state {
               padding: var(--space-24);
               text-align: center;
               color: var(--color-text-dark-secondary, #7a7971);
               
               i {
                  font-size: var(--font-4xl);
                  margin-bottom: var(--space-16);
                  opacity: 0.5;
                  display: block;
               }
               
               p {
                  margin: var(--space-8) 0;
                  
                  &.hint {
                     font-size: var(--font-sm);
                     font-style: italic;
                  }
               }
            }
         }
      }
   }
   
   .army-name-btn {
      cursor: pointer;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      display: inline-block;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: var(--font-md);
      text-align: left;
      font-weight: var(--font-weight-semibold);
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 0.1875rem;
      
      &:hover {
         background: var(--hover);
         text-decoration-style: solid;
      }
   }
   
   .link-icon {
      margin-left: var(--space-6);
      font-size: var(--font-xs);
      opacity: 0.7;
   }
   
   .editable-cell {
      cursor: pointer;
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      display: inline-block;
      background: transparent;
      border: none;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: var(--hover);
      }
   }
   
   .inline-edit {
      display: flex;
      gap: var(--space-8);
      align-items: center;
   }
   
   .inline-input {
      padding: var(--space-4) var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--color-primary, #5e0000);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 9.375rem;
      
      &:focus {
         outline: none;
         background: var(--overlay-high);
      }
   }
   
   .delete-btn,
   .actor-link,
   .edit-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .delete-btn {
      background: transparent;
      color: #ff6b6b;
      
      &:hover:not(:disabled) {
         background: rgba(255, 107, 107, 0.1);
      }
   }
   
   .actor-link {
      background: transparent;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover:not(:disabled) {
         background: var(--hover);
      }
      
      &.full-width {
         width: 100%;
         justify-content: center;
      }
   }
   
   .edit-btn {
      background: rgba(94, 0, 0, 0.2);
      color: var(--color-primary, #5e0000);
      
      &:hover:not(:disabled) {
         background: rgba(94, 0, 0, 0.3);
      }
   }
   
   .support-status {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      
      &.status-supported {
         color: #90ee90;
      }
      
      &.status-unsupported {
         color: #ffa500;
      }
   }
   
   .support-status-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: var(--space-8);
      background: var(--overlay-low);
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      
      &.status-supported {
         color: #90ee90;
      }
      
      &.status-unsupported {
         color: #ffa500;
      }
      
      &.status-neutral {
         color: var(--color-text-dark-secondary, #7a7971);
      }
      
      &:hover {
         background: var(--hover);
      }
   }
   
   .support-status-display {
      padding: var(--space-4) var(--space-8);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: var(--space-8);
      background: var(--overlay-low);
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      
      &.status-neutral {
         color: var(--color-text-dark-secondary, #7a7971);
      }
   }
   
   .settlement-dropdown {
      padding: var(--space-4) var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--color-primary, #5e0000);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      min-width: 12.5rem;
      
      &:focus {
         outline: none;
         background: var(--overlay-high);
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
   .no-actor {
      color: var(--color-text-dark-secondary, #7a7971);
      display: flex;
      align-items: center;
      gap: var(--space-8);
      font-style: italic;
   }
   
   .add-prompt {
      color: var(--text-tertiary, #5a5850);
      font-weight: var(--font-weight-thin, 300);
   }
   
   .add-army-inputs {
      display: flex;
      gap: var(--space-8);
      align-items: center;
      
      .level-input {
         width: 5rem;
      }
   }
   
   .text-input {
      width: 100%;
      padding: var(--space-8);
      background: var(--overlay);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      color: var(--color-text-dark-primary, #b5b3a4);
      font-family: inherit;
      font-size: var(--font-md);
      
      &::placeholder {
         color: var(--color-text-dark-secondary, #7a7971);
         font-weight: var(--font-weight-normal);
         font-style: italic;
      }
      
      &:focus {
         outline: none;
         background: var(--overlay-high);
         border-color: var(--border-faint);
      }
      
      &.small {
         padding: var(--space-4) var(--space-8);
         font-size: var(--font-sm);
      }
   }
   
   .person-actions {
      display: flex;
      gap: var(--space-4);
      align-items: center;
      position: relative;
      overflow: visible;
   }
   
   .action-btn {
      padding: var(--space-4) var(--space-8);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      color: var(--color-text-dark-primary, #b5b3a4);
      
      &:hover {
         background: var(--hover);
      }
      
      &.primary {
         background: rgba(144, 238, 144, 0.2);
         color: #90ee90;
         
         &:hover {
            background: rgba(144, 238, 144, 0.3);
         }
      }
      
      &.unlink-btn {
         color: #ffa500;
      }
      
      &.cancel-link {
         color: #ff6b6b;
      }
   }
   
   /* Actor Autosuggest */
   .actor-autosuggest {
      position: relative;
      display: flex;
      gap: var(--space-4);
      align-items: center;
      flex: 1;
      
      .autosuggest-input {
         flex: 1;
         padding: var(--space-4) var(--space-8);
         background: var(--overlay);
         border: 1px solid var(--border-medium);
         border-radius: var(--radius-md);
         color: var(--color-text-dark-primary, #b5b3a4);
         
         &:focus {
            outline: none;
            background: var(--overlay-high);
            border-color: var(--border-faint);
         }
      }
      
      .suggestions-dropdown {
         position: absolute;
         top: 100%;
         left: 0;
         right: 0;
         width: auto;
         min-width: 18.75rem;
         max-height: 12.5rem;
         overflow-y: auto;
         background: var(--overlay-highest);
         border: 1px solid var(--border-medium);
         border-radius: var(--radius-md);
         margin-top: var(--space-4);
         z-index: 10000;
         box-shadow: 0 0.25rem 0.5rem var(--overlay);
         
         .suggestion-group {
            .group-header {
               padding: var(--space-8);
               font-size: var(--font-xs);
               font-weight: var(--font-weight-semibold);
               color: var(--color-text-dark-secondary, #7a7971);
               text-transform: uppercase;
               background: var(--overlay);
               border-bottom: 1px solid var(--border-subtle);
            }
         }
         
         .suggestion-item {
            display: block;
            width: 100%;
            padding: var(--space-8);
            text-align: left;
            border: none;
            background: transparent;
            color: var(--color-text-dark-primary, #b5b3a4);
            cursor: pointer;
            transition: background 0.2s;
            
            &:hover {
               background: var(--hover);
            }
         }
         
         .no-results {
            padding: var(--space-16);
            text-align: center;
            color: var(--color-text-dark-secondary, #7a7971);
            font-style: italic;
         }
      }
   }
   
   /* Pagination */
   .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-16);
      
      .page-btn {
         padding: var(--space-8) var(--space-16);
         background: var(--overlay-low);
         border: 1px solid var(--border-subtle);
         border-radius: var(--radius-lg);
         color: var(--color-text-dark-primary, #b5b3a4);
         cursor: pointer;
         transition: all 0.2s;
         
         &:hover:not(:disabled) {
            background: var(--hover);
         }
         
         &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
         }
      }
      
      .page-info {
         color: var(--color-text-dark-primary, #b5b3a4);
      }
   }
   
   /* Gear Icons */
   .gear-icons {
      display: flex;
      gap: var(--space-8);
      align-items: center;
      
      .gear-icon {
         font-size: var(--font-md);
         color: rgba(255, 255, 255, 0.3);
         transition: all 0.2s;
         
         &.owned {
            color: #90ee90;
         }
      }
   }
   
   .gear-display-btn {
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover:not(:disabled) {
         background: var(--hover);
         border-radius: var(--radius-md);
         padding: var(--space-4);
      }
      
      &:disabled {
         cursor: not-allowed;
         opacity: 0.5;
      }
   }
   
   .gear-edit {
      display: flex;
      gap: var(--space-16);
      align-items: center;
      
      /* Add visual divider between equipment and action buttons */
      .gear-icons {
         margin-right: var(--space-8);
      }
   }
   
   .gear-icon-btn {
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      min-width: 2rem;
      min-height: 2rem;
      
      .gear-icon {
         font-size: var(--font-md);
         color: rgba(255, 255, 255, 0.3);
         transition: all 0.2s;
         display: flex;
         align-items: center;
         justify-content: center;
      }
      
      &:hover:not(:disabled) {
         background: var(--hover);
         border-color: var(--border-default);
      }
      
      &.active {
         border-color: #90ee90;
         background: rgba(144, 238, 144, 0.1);
         
         .gear-icon {
            color: #90ee90;
         }
      }
      
      &:disabled {
         opacity: 0.5;
         cursor: not-allowed;
      }
   }
   
</style>
