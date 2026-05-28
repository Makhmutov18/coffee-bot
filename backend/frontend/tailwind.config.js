/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdf8f0',
          100: '#f5e6d0',
          200: '#e8cba0',
          300: '#d4a574',
          400: '#c0854f',
          500: '#a06b3f',
          600: '#7a5232',
          700: '#5c3d26',
          800: '#3f2a1a',
          900: '#2c1d12',
          950: '#1a0f08',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}