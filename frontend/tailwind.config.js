/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Support explicit dark mode toggles if needed, default is dark industrial theme
  theme: {
    extend: {
      colors: {
        tesla: {
          red: '#e82127',
          darkred: '#b81418',
        },
        industry: {
          bg: '#0a0b0d',          // Very dark console background
          panel: '#12141c',       // Card panel dark gray
          border: '#1f2430',      // Industrial border tint
          highlight: '#2a3142',   // Active element highlight
          text: '#f3f4f6',        // Crisp white text
          muted: '#9ca3af',       // Silver gray text
        },
        status: {
          pass: '#10b981',        // Vibrant emerald for PASS
          rework: '#f59e0b',      // Warning amber for REWORK
          reject: '#ef4444',      // Hot red for REJECT
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-red': '0 0 15px rgba(232, 33, 39, 0.4)',
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.4)',
        'glow-orange': '0 0 15px rgba(245, 158, 11, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
