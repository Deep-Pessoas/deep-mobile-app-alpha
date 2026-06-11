/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff6ed',
          100: '#ffead4',
          200: '#ffd2a8',
          300: '#ffb270',
          400: '#fb8736',
          500: '#ef561d',
          600: '#dc3e13',
          700: '#b72c12',
          800: '#922516',
          900: '#762116',
          950: '#400e0a',
        },
      },
    },
  },
  plugins: [],
};
