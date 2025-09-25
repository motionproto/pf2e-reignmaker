# ⚠️ IMPORTANT: This is a Foundry VTT Module

## NO STANDALONE HTML TEST PAGES

This project is a **Foundry VTT module**, not a standalone web application. Do NOT create HTML test pages.

### ❌ DO NOT CREATE:
- `test-*.html` files for testing functionality
- Standalone HTML demos or examples  
- HTML pages with inline JavaScript for testing
- Any HTML files intended to be opened directly in a browser

### ✅ CORRECT APPROACH:
Test all functionality within Foundry VTT itself:
1. Build the module: `npm run build`
2. Deploy to Foundry (if configured)
3. Test within a Foundry VTT world

### Why This Matters

Standalone HTML test pages:
- Don't test the actual Foundry VTT integration
- Create unnecessary files that clutter the project
- Can give false positives since the Foundry API isn't available  
- May confuse other developers about the project's nature

### Allowed HTML Files

The ONLY HTML files that should exist are:
- `index.html` - Required by the build system
- HTML templates used by Foundry (in template directories)
- Design system documentation (only if specifically requested)

## Remember

If you need to test something, describe what you would test or provide code snippets, but DO NOT create standalone HTML test files.
