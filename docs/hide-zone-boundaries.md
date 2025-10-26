# Hide Kingmaker Zone Boundaries

## Problem
Zone boundaries on the Stolen Lands map are visible by default.

## Fix
In `_pf2e-kingmaker-module/pf2e-km-compiled.mjs` (around line 1612):

**Find:**
```javascript
zoneGraphics = new PIXI.Graphics();
```

**Replace with:**
```javascript
zoneGraphics = (() => { const g = new PIXI.Graphics(); g.visible = false; return g; })();
```
