# Manual Testing Instructions for Army Pathfinding

The automatic debug registration may not have loaded yet. Here's how to test manually:

## Simple Test (Works in Dev & Production)

**After reloading Foundry (F5), check console for:**

```
[Debug] ✅ Army movement debug utilities registered on game.reignmaker
```

**Then test with these commands:**

```javascript
// Test pathfinding calculations
game.reignmaker.testPathfinding('6.19', '8.21', 20);

// Activate interactive movement mode (hover + click)
game.reignmaker.testArmyMovement('test', '6.19');

// Check hex movement cost
game.reignmaker.getHexMovementCost('6.19');

// List all reachable hexes
game.reignmaker.listReachableHexes('6.19', 20);

// Deactivate when done
game.reignmaker.deactivateArmyMovement();
```

## Expected Behavior

**Interactive Mode (`testArmyMovement`):**
- Origin hex highlighted in green
- Movement range shown as light green overlay (20 movement)
- Hover over hexes → See path preview as green lines
- Valid targets → Green circle endpoint
- Unreachable hexes → Red X
- Click valid hex → Notification with movement cost

## Alternative: Wait for Module Init

The debug utilities should auto-register when the module loads. Look for this console message:

```
[Debug] ✅ Army movement debug utilities registered on game.reignmaker
```

## If Auto-Registration Fails

Try reloading the page (F5) after the module compiles. The registration happens on the `ready` hook.

## Alternative: Check Game Object

Try this first to see if the module loaded:

```javascript
// Check if module loaded
console.log(game.modules.get('pf2e-reignmaker'));

// Check what's available
console.log('Module exports:', game.modules.get('pf2e-reignmaker')?.api);
```

## If Import Fails

The import path includes a hash that changes each build. Check the actual filename:

1. Look at your `dist/` folder
2. Find the file named like `index-[HASH].js` (the largest one)
3. Replace the hash in the import statement above

For example, if the file is `index-XYZ123.js`, use:
```javascript
await import('/modules/pf2e-reignmaker/dist/index-XYZ123.js');
