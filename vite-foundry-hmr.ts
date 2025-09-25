import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin for Foundry VTT Hot Module Replacement
 * This plugin sets up a full proxy to enable hot reloading with Foundry
 */
export function foundryHMR(): Plugin {
    return {
        name: 'foundry-hmr',
        
        configureServer(server) {
            // Add middleware to handle Foundry module requests
            server.middlewares.use((req, res, next) => {
                // Allow CORS for all Foundry requests
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                
                // Handle OPTIONS requests for CORS
                if (req.method === 'OPTIONS') {
                    res.statusCode = 204;
                    res.end();
                    return;
                }
                
                next();
            });
        },
        
        transform(code, id) {
            // Add HMR accept to all Svelte components
            if (id.endsWith('.svelte')) {
                return {
                    code: code + '\nif (import.meta.hot) { import.meta.hot.accept(); }',
                    map: null
                };
            }
            
            return null;
        }
    };
}

/**
 * Create a proxy configuration for Foundry development
 */
export function createFoundryProxy(foundryUrl = 'http://localhost:30000') {
    return {
        // Proxy WebSocket connections for Foundry
        '/socket.io': {
            target: foundryUrl,
            ws: true,
            changeOrigin: true
        },
        // Proxy API requests to Foundry
        '/api': {
            target: foundryUrl,
            changeOrigin: true
        },
        // Proxy game resources
        '/game': {
            target: foundryUrl,
            changeOrigin: true
        },
        // Proxy system resources
        '/systems': {
            target: foundryUrl,
            changeOrigin: true
        },
        // Proxy other modules
        '/modules': {
            target: foundryUrl,
            changeOrigin: true,
            bypass: (req: any) => {
                // Don't proxy our own module
                if (req.url?.startsWith('/modules/pf2e-reignmaker/')) {
                    return false;
                }
                return null;
            }
        }
    };
}
