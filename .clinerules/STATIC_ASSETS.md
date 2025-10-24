# Static Asset Imports (Images, Fonts, etc.)

## ⚠️ CRITICAL: Always Use ES Module Imports for Static Assets

**DO NOT use hardcoded module paths** - they break during HMR development.

## The Problem

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

## The Solution

```typescript
// ✅ CORRECT - Works in both dev and production
import myImage from '../path/to/my-image.webp';
<img src={myImage} alt="..." />
```

## How Vite Handles Imports

**Development (HMR):**
- Serves directly from source: `http://localhost:30001/src/img/image.webp`
- No proxy issues, instant updates

**Production (Build):**
- Copies to `dist/assets/`
- Adds content hash: `image-a1b2c3d4.webp`
- Updates imports automatically

## Examples

### Single Image (Svelte)
```svelte
<script lang="ts">
  import logo from '../../../img/logo.webp';
</script>

<img src={logo} alt="Logo" />
```

### Multiple Images (TypeScript)
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

### Dynamic Imports (Advanced)
```typescript
// When image name is determined at runtime
const imagePath = await import(`./images/${name}.webp`);
```

## No Configuration Needed

- ✅ Vite handles everything automatically
- ✅ No helper functions required
- ✅ Scales to hundreds of images
- ✅ Works for all file types (`.webp`, `.png`, `.jpg`, `.svg`, `.woff2`, etc.)

## When to Use Hardcoded Paths

**Only for runtime/user content:**
```typescript
// ✅ OK - User-uploaded files in Foundry's data directory
const userImage = settlement.imagePath; // e.g., "worlds/my-world/uploads/custom.webp"
<img src={userImage} alt="..." />
```

These are served by Foundry's file system, not bundled with the module.

---

**Rule of Thumb:** If the file is in your source code (`img/`, `src/`, etc.), use ES imports. If it's user content or from another module, use the path string.
