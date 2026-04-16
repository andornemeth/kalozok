import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        sea: {
          50: '#e6f4f5',
          100: '#bfe2e4',
          200: '#94cfd2',
          300: '#68bbc0',
          400: '#47abb1',
          500: '#1a7f86',
          600: '#145f65',
          700: '#0e4044',
          800: '#082427',
          900: '#04141a',
        },
        parchment: {
          50: '#fbf5e3',
          100: '#f3e7c1',
          200: '#e8d28a',
          300: '#d9b85a',
          400: '#b99137',
          500: '#8b6a22',
        },
        rum: '#7a2e0e',
        gold: '#e0b24f',
      },
      boxShadow: {
        pixel: '4px 4px 0 0 rgba(0,0,0,0.55)',
      },
      animation: {
        'rope-swing': 'rope 3.2s ease-in-out infinite',
        'flag-wave': 'flag 1.6s ease-in-out infinite',
      },
      keyframes: {
        rope: {
          '0%,100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        flag: {
          '0%,100%': { transform: 'skewX(-6deg)' },
          '50%': { transform: 'skewX(6deg)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
