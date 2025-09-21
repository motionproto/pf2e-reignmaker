/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,svelte}",
  ],
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
  plugins: [],
  // Important: Prefix all Tailwind classes to avoid conflicts with other modules
  prefix: 'tw-',
}
