/**
 * Delete all NPC actors in the Kingdom Armies folder
 * 
 * CAUTION: This is a destructive operation that cannot be undone!
 */

// Find the Kingdom Armies folder
const folderName = "Kingdom Armies";
const folder = game.folders.find(f => f.name === folderName && f.type === "Actor");

if (!folder) {
  ui.notifications.error(`Folder "${folderName}" not found!`);
  return;
}

// Get all NPC actors in this folder
const npcsToDelete = game.actors.filter(actor => 
  actor.folder?.id === folder.id && actor.type === "npc"
);

if (npcsToDelete.length === 0) {
  ui.notifications.info(`No NPC actors found in "${folderName}" folder.`);
  return;
}

// Confirm deletion
const confirmed = await Dialog.confirm({
  title: "Delete Kingdom Army NPCs",
  content: `<p>Are you sure you want to delete <strong>${npcsToDelete.length} NPC actor(s)</strong> from the "${folderName}" folder?</p>
    <p><em>This action cannot be undone!</em></p>
    <ul style="max-height: 200px; overflow-y: auto; margin-top: 10px;">
      ${npcsToDelete.map(a => `<li>${a.name}</li>`).join('')}
    </ul>`,
  yes: () => true,
  no: () => false,
  defaultYes: false
});

if (!confirmed) {
  ui.notifications.info("Deletion cancelled.");
  return;
}

// Delete the actors
ui.notifications.info(`Deleting ${npcsToDelete.length} NPC actor(s)...`);

const deletePromises = npcsToDelete.map(actor => actor.delete());
await Promise.all(deletePromises);

ui.notifications.success(`Successfully deleted ${npcsToDelete.length} NPC actor(s) from "${folderName}" folder.`);
