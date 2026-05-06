/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        target: {
          gold: '#FFD700',
          red: '#E03131',
          blue: '#1971C2',
          black: '#212529',
          white: '#F8F9FA',
        },
      },
    },
  },
  plugins: [],
};
