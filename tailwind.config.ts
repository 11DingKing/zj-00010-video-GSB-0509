import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a24',
          600: '#252530',
          500: '#3a3a47',
          400: '#5a5a67',
          300: '#8a8a97',
          200: '#b5b5c0',
          100: '#e5e5ea',
        },
        accent: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          highlight: '#22d3ee',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};

export default config;
