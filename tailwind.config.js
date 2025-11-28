/********************
 * Tailwind Config  *
 ********************/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#C89B3C', // gold
          light: '#E6C46D',
          dark: '#8A6B1F'
        },
        ivory: '#F8F4E9',
        ink: '#1F2937'
      }
    },
  },
  plugins: [],
}
