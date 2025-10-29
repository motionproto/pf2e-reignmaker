/**
 * Shared Actor Management Service
 * Provides complete CRUD operations for Reignmaker actors (armies, factions)
 * All operations route through GM for consistent permissions
 */

import { logger } from '../../utils/Logger';

// ===== TYPES =====

export interface ActorUpdateData {
  name?: string;
  level?: number;
  img?: string;
  hp?: { value: number; max: number };
  [key: string]: any; // Allow additional Foundry actor properties
}

export interface ItemData {
  name: string;
  type: string;
  data?: any;
}

// ===== FOLDER MANAGEMENT =====

/**
 * Ensure a folder structure exists for Reignmaker actors
 * Creates parent "Reignmaker" folder and specified subfolder if they don't exist
 * 
 * @param subfolderName - Name of subfolder to create (e.g., "Armies", "Factions")
 * @returns The subfolder ID for actor creation
 */
export async function ensureReignmakerFolder(subfolderName: string): Promise<string> {
  const game = (globalThis as any).game;
  
  if (!game?.folders) {
    throw new Error('Foundry VTT not initialized - cannot create folders');
  }
  
  const parentFolderName = "Reignmaker";
  
  // 1. Find or create parent folder
  let parentFolder = game.folders.find((f: any) =>
    f.type === "Actor" && f.name === parentFolderName && !f.folder
  );
  
  if (!parentFolder) {
    logger.warn(`📁 [FolderManager] "${parentFolderName}" folder not found, creating...`);
    parentFolder = await game.folders.documentClass.create({
      name: parentFolderName,
      type: "Actor",
      color: "#5e0000",
      img: "icons/svg/castle.svg",
      ownership: {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      }
    });
    
    if (!parentFolder) {
      throw new Error(`Failed to create "${parentFolderName}" folder`);
    }
    logger.info(`✅ [FolderManager] Created "${parentFolderName}" folder`);
  }
  
  // 2. Find or create subfolder
  let subfolder = game.folders.find((f: any) =>
    f.type === "Actor" && f.name === subfolderName && f.folder?.id === parentFolder.id
  );
  
  if (!subfolder) {
    logger.warn(`📁 [FolderManager] "${parentFolderName}/${subfolderName}" subfolder not found, creating...`);
    subfolder = await game.folders.documentClass.create({
      name: subfolderName,
      type: "Actor",
      folder: parentFolder.id,
      color: "#5e0000",
      ownership: {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      }
    });
    
    if (!subfolder) {
      throw new Error(`Failed to create "${subfolderName}" subfolder`);
    }
    logger.info(`✅ [FolderManager] Created "${parentFolderName}/${subfolderName}" subfolder`);
  }
  
  return subfolder.id;
}

/**
 * Create an NPC actor in a Reignmaker subfolder
 * 
 * @param name - Actor name
 * @param subfolderName - Subfolder to place actor in (e.g., "Armies", "Factions")
 * @param additionalData - Additional actor data to merge
 * @returns Created actor
 */
export async function createNPCInFolder(
  name: string,
  subfolderName: string,
  additionalData?: any
): Promise<any> {
  const game = (globalThis as any).game;
  
  if (!game?.actors) {
    throw new Error('Foundry VTT not initialized - cannot create actors');
  }
  
  // Ensure folder exists
  const folderId = await ensureReignmakerFolder(subfolderName);
  
  // Create actor with base data
  const actorData = {
    name: name,
    type: 'npc',
    folder: folderId,
    ownership: {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    },
    ...additionalData
  };
  
  const actor = await game.actors.documentClass.create(actorData);
  
  if (!actor?.id) {
    throw new Error(`Failed to create NPC actor: ${name}`);
  }
  
  logger.info(`✅ [ActorManager] Created actor "${name}" in Reignmaker/${subfolderName}`);
  
  return actor;
}

// ===== ACTOR CRUD OPERATIONS =====

/**
 * Update an actor's properties
 * 
 * @param actorId - Actor ID to update
 * @param updateData - Data to update (name, level, hp, etc.)
 * @returns Updated actor
 */
export async function updateActor(actorId: string, updateData: ActorUpdateData): Promise<any> {
  const game = (globalThis as any).game;
  
  const actor = game?.actors?.get(actorId);
  if (!actor) {
    throw new Error(`Actor not found: ${actorId}`);
  }
  
  // Build update object based on provided data
  const update: any = {};
  
  if (updateData.name !== undefined) {
    update.name = updateData.name;
  }
  
  if (updateData.img !== undefined) {
    update.img = updateData.img;
  }
  
  // PF2e system-specific properties
  if (updateData.level !== undefined) {
    update['system.details.level.value'] = updateData.level;
  }
  
  if (updateData.hp !== undefined) {
    update['system.attributes.hp.value'] = updateData.hp.value;
    update['system.attributes.hp.max'] = updateData.hp.max;
  }
  
  // Apply any additional custom updates
  Object.keys(updateData).forEach(key => {
    if (!['name', 'img', 'level', 'hp'].includes(key)) {
      update[key] = updateData[key];
    }
  });
  
  await actor.update(update);
  
  logger.info(`✅ [ActorManager] Updated actor "${actor.name}"`, update);
  
  return actor;
}

/**
 * Delete an actor
 * 
 * @param actorId - Actor ID to delete
 */
export async function deleteActor(actorId: string): Promise<void> {
  const game = (globalThis as any).game;
  
  const actor = game?.actors?.get(actorId);
  if (!actor) {
    throw new Error(`Actor not found: ${actorId}`);
  }
  
  const actorName = actor.name;
  await actor.delete();
  
  logger.info(`✅ [ActorManager] Deleted actor "${actorName}"`);
}

// ===== ITEM MANAGEMENT =====

/**
 * Add an item to an actor
 * 
 * @param actorId - Actor ID
 * @param itemData - Item data to add
 * @returns Created item
 */
export async function addItemToActor(actorId: string, itemData: ItemData): Promise<any> {
  const game = (globalThis as any).game;
  
  const actor = game?.actors?.get(actorId);
  if (!actor) {
    throw new Error(`Actor not found: ${actorId}`);
  }
  
  const items = await actor.createEmbeddedDocuments('Item', [itemData]);
  
  if (!items || items.length === 0) {
    throw new Error(`Failed to create item: ${itemData.name}`);
  }
  
  logger.info(`✅ [ActorManager] Added item "${itemData.name}" to actor "${actor.name}"`);
  
  return items[0];
}

/**
 * Remove an item from an actor
 * 
 * @param actorId - Actor ID
 * @param itemId - Item ID to remove
 */
export async function removeItemFromActor(actorId: string, itemId: string): Promise<void> {
  const game = (globalThis as any).game;
  
  const actor = game?.actors?.get(actorId);
  if (!actor) {
    throw new Error(`Actor not found: ${actorId}`);
  }
  
  const item = actor.items.get(itemId);
  if (!item) {
    throw new Error(`Item not found: ${itemId}`);
  }
  
  const itemName = item.name;
  await actor.deleteEmbeddedDocuments('Item', [itemId]);
  
  logger.info(`✅ [ActorManager] Removed item "${itemName}" from actor "${actor.name}"`);
}

/**
 * Get all items from an actor
 * 
 * @param actorId - Actor ID
 * @returns Array of items
 */
export async function getActorItems(actorId: string): Promise<any[]> {
  const game = (globalThis as any).game;
  
  const actor = game?.actors?.get(actorId);
  if (!actor) {
    throw new Error(`Actor not found: ${actorId}`);
  }
  
  return Array.from(actor.items);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get an actor by ID
 * 
 * @param actorId - Actor ID
 * @returns Actor or null
 */
export async function getActor(actorId: string): Promise<any | null> {
  const game = (globalThis as any).game;
  return game?.actors?.get(actorId) || null;
}

/**
 * Check if an actor exists
 * 
 * @param actorId - Actor ID
 * @returns True if actor exists
 */
export async function actorExists(actorId: string): Promise<boolean> {
  const actor = await getActor(actorId);
  return actor !== null;
}
