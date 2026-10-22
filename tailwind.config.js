/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,mjs,ts}'],
  theme: {
    extend: {
      // One accent: the mascot's purple.
      colors: { accent: { 200: '#d6d0ff', 300: '#b3a8ff', 400: '#8b7dff', 500: '#7565f0' } },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
        vcr: ['VT323', 'ui-monospace', 'monospace'],
      },
    },
  },
};
