import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import { defineConfig } from 'vite';
import * as path from 'path';
import { foundryHMR, createFoundryProxy } from './vite-foundry-hmr';

// Get Foundry URL from environment or use default
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';

// Development configuration for hot reloading with Foundry VTT
export default defineConfig({
  root: './',  // Use project root for development
  base: 'http://localhost:5173/',  // Base URL for serving to Foundry
  
  resolve: {
    conditions: ['browser', 'import'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@models': path.resolve(__dirname, './src/models'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@api': path.resolve(__dirname, './src/api'),
      '@core': path.resolve(__dirname, './src/core'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@types': path.resolve(__dirname, './src/types'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@view': path.resolve(__dirname, './src/view'),
      '@typhonjs-fvtt/runtime': path.resolve(__dirname, 'node_modules/@typhonjs-fvtt/runtime'),
      '#runtime': path.resolve(__dirname, 'node_modules/@typhonjs-fvtt/runtime'),
    }
  },

  server: {
    port: 5173,
    open: false,  // Don't open browser, we'll use Foundry
    watch: {
      usePolling: false,
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: true,  // Show errors in browser overlay
    },
    // Full proxy configuration for Foundry
    proxy: createFoundryProxy(FOUNDRY_URL),
    // CORS headers for cross-origin access from Foundry
    cors: {
      origin: '*',
      credentials: true
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    },
    fs: {
      // Allow serving files from the dist folder
      allow: ['..', 'dist']
    }
  },

  publicDir: 'dist',  // Serve dist folder as static files

  css: {
    postcss: {
      plugins: []
    }
  },

  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        postcss: true,
      }),
      hot: true,
      compilerOptions: {
        dev: true,
        hydratable: true,  // Enable hydration for better HMR
      }
    }),
    foundryHMR()  // Add custom Foundry HMR plugin
  ],

  // Build configuration (for reference, not used in dev mode)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'PF2eKingdomLite',
      fileName: () => 'index.js',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        // Foundry globals - these are available in the Foundry environment
        /^foundry/,
        'game',
        'ui',
        'canvas',
        'CONFIG',
        'Hooks',
        'Actor',
        'Item',
        'ChatMessage',
        'Dialog',
        'Application',
        'FormApplication',
        'Handlebars',
        'Roll',
        'CONST'
      ],
      output: {
        format: 'es',
        globals: {
          'game': 'game',
          'ui': 'ui',
          'canvas': 'canvas',
          'CONFIG': 'CONFIG',
          'Hooks': 'Hooks',
          'Actor': 'Actor',
          'Item': 'Item',
          'ChatMessage': 'ChatMessage',
          'Dialog': 'Dialog',
          'Application': 'Application',
          'FormApplication': 'FormApplication',
          'Handlebars': 'Handlebars',
          'Roll': 'Roll',
          'CONST': 'CONST'
        }
      }
    }
  },

  optimizeDeps: {
    include: ['svelte', '@typhonjs-fvtt/runtime'],
    exclude: ['game', 'ui', 'canvas', 'CONFIG', 'Hooks', 'CONST']
  },

  define: {
    'import.meta.env.DEV': 'true'
  }
});
