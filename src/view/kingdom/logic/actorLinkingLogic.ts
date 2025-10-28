/**
 * Actor Linking Logic
 * 
 * Reusable business logic for actor filtering, grouping, and validation.
 * Used by both FactionDetailView (notable people) and ArmiesTab (army actors).
 */

/**
 * Get all available actors (characters and NPCs) from Foundry
 */
export function getAvailableActors(): any[] {
   const game = (globalThis as any).game;
   return game?.actors?.filter((a: any) => a.type === 'character' || a.type === 'npc') || [];
}

/**
 * Filter actors by search term
 */
export function filterActors(allActors: any[], searchTerm: string): any[] {
   if (!searchTerm.trim()) {
      return allActors;
   }
   
   const searchLower = searchTerm.toLowerCase();
   return allActors.filter((a: any) => a.name.toLowerCase().includes(searchLower));
}

/**
 * Group actors by type (characters vs NPCs)
 */
export function groupActorsByType(actors: any[]): { characters: any[], npcs: any[] } {
   const characters: any[] = [];
   const npcs: any[] = [];
   
   actors.forEach((actor: any) => {
      if (actor.type === 'character') {
         characters.push(actor);
      } else {
         npcs.push(actor);
      }
   });
   
   return { characters, npcs };
}

/**
 * Get actor name by ID
 */
export function getActorName(actorId: string): string {
   const game = (globalThis as any).game;
   const actor = game?.actors?.get(actorId);
   return actor?.name || 'Unknown Actor';
}

/**
 * Validate if an actor can be linked (checks for existing links)
 */
export function canLinkActor(
   actorId: string,
   existingLinks: string[]
): { valid: boolean; reason?: string } {
   if (existingLinks.includes(actorId)) {
      return {
         valid: false,
         reason: 'This actor is already linked'
      };
   }
   
   return { valid: true };
}
