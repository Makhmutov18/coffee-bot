/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tech: {
          accent: '#DEFF9A',
          surface: '#0A0A0A',
          border: '#1E293B',
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          bg: '#000000',
          input: '#050505',
        },
      },
      fontFamily: {
        heading: ['Urbanist', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '24px',
        xl: '16px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}