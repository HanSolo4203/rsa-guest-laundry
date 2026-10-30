/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' },
        },
      },
      animation: {
        'caret-blink': 'caret-blink 1.2s ease-out infinite',
      },
    },
  },
  plugins: [
    // Tailwind loads this config as CommonJS.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('tailwindcss-animate'),
  ],
}