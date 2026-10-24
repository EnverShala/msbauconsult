/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      colors: {
        alabaster: '#FBFBF9',
        pearl: '#F3F3EE',
        'light-card': '#FFFFFF',
        charcoal: '#1A1C23',
        slate: {
          600: '#5A6072',
          700: '#3D4251',
          800: '#282C37',
        },
        gold: {
          100: '#FFFDF5',
          300: '#E5C671',
          400: '#D4AF37',
          500: '#C59B27',
          600: '#9E7A1B',
        },
      },
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
