# Development Environment Constraints

## ⚠️ This is a Foundry VTT Module

### DO NOT Run as Standalone Application

**NEVER** run as standalone application with `npm start`, `vite`, etc.

**Correct Commands:**
- **Development:** `npm run dev` (HMR for Foundry)
- **Build:** `npm run build`

**Why This Matters:**
Standalone servers lack Foundry API access and don't test actual module integration.

---

## ⚠️ DO NOT Create Standalone HTML Test Pages

**NEVER** create standalone HTML test pages (`test-*.html`, demos, etc.).

**Why This Matters:**
Standalone HTML lacks Foundry API access and creates false test results.

**Allowed HTML Files:**
- `index.html` (build system requirement)
- Foundry template files only

**Testing:** Test functionality within Foundry VTT, not standalone HTML.

---

## ⚠️ Static Asset Imports (Images, Fonts, etc.)

### CRITICAL: Always Use ES Module Imports for Static Assets

**DO NOT use hardcoded module paths** - they break during HMR development.

### The Problem

```typescript
// ❌ WRONG - Breaks during HMR (404 errors)
const imagePath = 'modules/pf2e-reignmaker/img/my-image.webp';
<img src="modules/pf2e-reignmaker/img/my-image.webp" alt="..." />
```

**Why it fails:**
- During HMR, Vite's dev server intercepts requests
- The proxy sends these to Foundry server (port 30000)
- Foundry doesn't have the latest files until build runs
- Result: 404 errors during development

### The Solution

```typescript
// ✅ CORRECT - Works in both dev and production
import myImage from '../path/to/my-image.webp';
<img src={myImage} alt="..." />
```

### How Vite Handles Imports

**Development (HMR):**
- Serves directly from source: `http://localhost:30001/src/img/image.webp`
- No proxy issues, instant updates

**Production (Build):**
- Copies to `dist/assets/`
- Adds content hash: `image-a1b2c3d4.webp`
- Updates imports automatically

### Examples

**Single Image (Svelte):**
```svelte
<script lang="ts">
  import logo from '../../../img/logo.webp';
</script>

<img src={logo} alt="Logo" />
```

**Multiple Images (TypeScript):**
```typescript
import villageImg from '../../img/settlements/village.webp';
import townImg from '../../img/settlements/town.webp';
import cityImg from '../../img/settlements/city.webp';

function getImage(tier: string): string {
  switch (tier) {
    case 'village': return villageImg;
    case 'town': return townImg;
    case 'city': return cityImg;
    default: return villageImg;
  }
}
```

### No Configuration Needed

- ✅ Vite handles everything automatically
- ✅ No helper functions required
- ✅ Scales to hundreds of images
- ✅ Works for all file types (`.webp`, `.png`, `.jpg`, `.svg`, `.woff2`, etc.)

### When to Use Hardcoded Paths

**Only for runtime/user content:**
```typescript
// ✅ OK - User-uploaded files in Foundry's data directory
const userImage = settlement.imagePath; // e.g., "worlds/my-world/uploads/custom.webp"
<img src={userImage} alt="..." />
```

These are served by Foundry's file system, not bundled with the module.

**Rule of Thumb:** If the file is in your source code (`img/`, `src/`, etc.), use ES imports. If it's user content or from another module, use the path string.

---

## ⚠️ Browser Environment - NO CommonJS

### CRITICAL: This is a browser-based Foundry VTT module

- ❌ **NEVER use `require()`** - causes "require is not defined" errors
- ✅ **ALWAYS use ES6 imports** - `import { foo } from './bar'`
- ✅ **Use dynamic imports** if needed - `await import('./module')`

### Common Mistake

```typescript
// ❌ WRONG - Browser doesn't have require()
const { calculateProduction } = require('../services/economics/production');

// ✅ CORRECT - Use ES6 import at top of file
import { calculateProduction } from '../services/economics/production';

// ✅ CORRECT - Or dynamic import if needed inside function
const { calculateProduction } = await import('../services/economics/production');
```

**Why this matters:** Foundry VTT modules run in the browser, not Node.js. The browser doesn't have a `require()` function. Always use ES6 module syntax.

---

## Design System Constraints

### Typography
- Always use design system variables from `src/styles/variables.css`
- Use `var(--font-md)` or larger for all font sizes
- **NO** `var(--font-sm)` or smaller (accessibility)

### Spacing & Layout
- Use `var(--space-*)` for spacing
- Use `var(--radius-*)` for border radius

### Colors
- Use `var(--text-*)` for text colors
- Use `var(--surface-*)` for backgrounds
- Use `var(--border-*)` for borders

### Forms
- Form controls should use classes from `src/styles/form-controls.css`
- Example: `form-field-vertical`

---

## Testing Constraints

- Test actions within Foundry VTT, not standalone
- Use `src/constants/migratedActions.ts` to track testing status
- Follow `docs/guides/testing-guide.md` for systematic testing
- Check `docs/guides/debugging-guide.md` for common issues

---

## Code Quality

- Use proper TypeScript types, avoid `any` when possible
- Fix all linter errors before completing tasks
- Use ES module imports, avoid CommonJS `require()`
- Follow existing code patterns and conventions
