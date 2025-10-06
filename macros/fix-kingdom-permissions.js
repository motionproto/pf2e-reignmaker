/**
 * Fix Kingdom Actor Permissions
 * 
 * This macro helps GMs grant all players OWNER permission on a kingdom actor.
 * This is necessary for collaborative kingdom management where all players
 * need to be able to modify the kingdom data.
 * 
 * Usage:
 * 1. Select the Kingdom Actor in the actors directory
 * 2. Run this macro
 * 3. All players will be granted OWNER permission
 */

async function fixKingdomPermissions() {
  // Check if user is GM
  if (!game.user.isGM) {
    ui.notifications.error("Only a GM can run this macro.");
    return;
  }
  
  // Get all actors in the world
  const kingdomActors = game.actors.filter(a => a.type === 'kingdom');
  
  if (kingdomActors.length === 0) {
    ui.notifications.warn("No kingdom actors found in this world.");
    return;
  }
  
  // Show dialog to select which kingdom actor to fix
  const actorChoices = kingdomActors.reduce((acc, actor) => {
    acc[actor.id] = actor.name;
    return acc;
  }, {});
  
  const selectedActorId = await Dialog.prompt({
    title: "Fix Kingdom Permissions",
    content: `
      <form>
        <div class="form-group">
          <label>Select Kingdom Actor:</label>
          <select name="actorId" style="width: 100%;">
            ${Object.entries(actorChoices).map(([id, name]) => 
              `<option value="${id}">${name}</option>`
            ).join('')}
          </select>
        </div>
        <p style="margin-top: 1em; font-size: 0.9em; color: #666;">
          This will grant all non-GM players OWNER permission on the selected kingdom actor,
          allowing them to fully interact with and modify the kingdom.
        </p>
      </form>
    `,
    callback: (html) => html.find('[name="actorId"]').val(),
    rejectClose: false
  });
  
  if (!selectedActorId) {
    ui.notifications.info("Kingdom permission fix cancelled.");
    return;
  }
  
  const actor = game.actors.get(selectedActorId);
  if (!actor) {
    ui.notifications.error("Selected actor not found.");
    return;
  }
  
  // Build ownership object
  const ownership = {};
  
  // Set all non-GM players to OWNER (level 3)
  for (const user of game.users) {
    if (!user.isGM) {
      ownership[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    }
  }
  
  // Keep default for everyone else
  ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  
  // Update the actor
  await actor.update({ ownership });
  
  ui.notifications.info(`✅ Kingdom actor "${actor.name}" permissions updated. All players now have OWNER access.`);
  console.log('[Fix Kingdom Permissions] Updated ownership:', ownership);
}

fixKingdomPermissions();
