import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#eef1f7',   // page background — clearly darker than the cards
        card: '#ffffff',
        line: '#cbd3e1',
        'line-soft': '#dde3ed',
        ink: {
          DEFAULT: '#0b1220',
          soft: '#3f4a5f',
          mute: '#6b7689',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        mint: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        sun: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        coral: { 50: '#fff1f2', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
        sky: { 50: '#f0f9ff', 500: '#0ea5e9', 600: '#0284c7' },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(17,24,39,0.04), 0 4px 12px rgba(17,24,39,0.05)',
        lift: '0 4px 10px rgba(79,70,229,0.10), 0 12px 32px rgba(17,24,39,0.08)',
      },
      keyframes: {
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-18px) scale(1.04)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.22s ease-out',
        float: 'float 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
