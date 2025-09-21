/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}",
  ],
  // Optimize for production builds
  mode: 'jit',
  theme: {
    extend: {
      colors: {
        // Foundry VTT color variables - mapped to Tailwind
        'foundry': {
          'primary': 'var(--color-primary, #5e0000)',
          'secondary': 'var(--color-secondary, #171f69)', 
          'tertiary': 'var(--color-tertiary, #E02B6C)',
          'success': 'var(--color-success, #18520b)',
          'warning': 'var(--color-warning, #993300)',
          'error': 'var(--color-error, #6e0000)',
          'info': 'var(--color-info, #004146)',
          
          // Text colors
          'text-primary': 'var(--color-text-dark-primary, #b5b3a4)',
          'text-secondary': 'var(--color-text-dark-secondary, #7a7971)',
          'text-highlight': 'var(--color-text-dark-highlight, #f0f0e0)',
          
          // Background colors
          'bg-dark': 'var(--color-bg-dark, #23221e)',
          'bg-light': 'var(--color-bg-light, #f0f0e0)',
          
          // Border colors  
          'border': 'var(--color-border-dark, #000)',
          'border-light': 'var(--color-border-light, #7a7971)',
        }
      },
      fontFamily: {
        'modesto': ['Modesto Condensed', 'Palatino Linotype', 'serif'],
        'signika': ['Signika', 'Arial', 'sans-serif'],
      },
      spacing: {
        'foundry-sm': 'var(--foundry-spacing-sm, 0.25rem)',
        'foundry-md': 'var(--foundry-spacing-md, 0.5rem)',
        'foundry-lg': 'var(--foundry-spacing-lg, 1rem)',
      },
      borderRadius: {
        'foundry': 'var(--border-radius, 5px)',
      },
      boxShadow: {
        'foundry': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'foundry-lg': '0 2px 6px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'rotate-gear': 'rotate 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          'from': { transform: 'translateX(100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        rotate: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' }
        }
      }
    },
  },
  plugins: [
    require('daisyui'),
  ],
  // Important: Prefix all Tailwind classes to avoid conflicts with other modules
  prefix: 'tw-',
  // DaisyUI config - optimized for smaller build
  daisyui: {
    themes: [
      {
        foundry: {
          // Main colors
          "primary": "#5e0000",
          "primary-content": "#f0f0e0",
          "secondary": "#171f69",
          "secondary-content": "#e0e7ff",
          "accent": "#E02B6C",
          "accent-content": "#ffffff",
          "neutral": "#23221e",
          "neutral-content": "#b5b3a4",
          
          // Base colors for dark theme
          "base-100": "#1a1a17",
          "base-200": "#23221e",
          "base-300": "#2d2c28",
          "base-content": "#b5b3a4",
          
          // Semantic colors
          "info": "#004146",
          "info-content": "#d0f8ff",
          "success": "#18520b",
          "success-content": "#e8ffd0",
          "warning": "#993300",
          "warning-content": "#fff4e6",
          "error": "#6e0000",
          "error-content": "#ffeded",
        },
      },
      {
        "foundry-dark": {
          // Enhanced dark theme variant
          "primary": "#7a1f1f",
          "primary-content": "#f5f5f0",
          "secondary": "#2a3b8f",
          "secondary-content": "#e8ecff",
          "accent": "#ff4d88",
          "accent-content": "#ffffff",
          "neutral": "#1a1917",
          "neutral-content": "#c8c6b7",
          
          // Darker base colors
          "base-100": "#0f0f0d",
          "base-200": "#1a1917",
          "base-300": "#23221e",
          "base-content": "#c8c6b7",
          
          // Adjusted semantic colors for better contrast
          "info": "#00626b",
          "info-content": "#e0fbff",
          "success": "#2a7a1a",
          "success-content": "#f0ffe8",
          "warning": "#b84a00",
          "warning-content": "#fff8f0",
          "error": "#8f1a1a",
          "error-content": "#fff0f0",
        }
      }
    ],
    darkTheme: "foundry",
    base: true,
    styled: true,
    utils: true,
    logs: false,
    prefix: "tw-", // Apply prefix to daisyUI classes too
  },
  // Exclude unused base styles to reduce CSS size
  corePlugins: {
    preflight: true, // Keep reset styles
    // Disable unused utilities
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
    ringOffsetColor: false,
    ringOffsetWidth: false,
    scrollSnapType: false,
    scrollBehavior: false,
    textDecorationThickness: false,
    textUnderlineOffset: false,
    touchAction: false,
  },
}
