/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090B',
        surface: '#121215',
        'surface-hover': '#18181B',
        border: '#27272A',
        'border-light': '#3F3F46',
        brand: {
          DEFAULT: '#EC4899',
          pink: '#EC4899',
        },
        civ: '#10B981',      // Civilians / Success
        imp: '#EF4444',      // Impostor / Error
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
