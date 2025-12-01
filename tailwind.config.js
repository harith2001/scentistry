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
        // Map to CSS variables with alpha support
        gold: {
          DEFAULT: 'rgb(var(--gold) / <alpha-value>)',
          light: 'rgb(var(--gold-light) / <alpha-value>)',
          dark: 'rgb(var(--gold-dark) / <alpha-value>)'
        },
        brand: {
          DEFAULT: 'rgb(var(--gold) / <alpha-value>)',
          light: 'rgb(var(--gold-light) / <alpha-value>)',
          dark: 'rgb(var(--gold-dark) / <alpha-value>)'
        },
        white: 'rgb(var(--white) / <alpha-value>)',
        black: 'rgb(var(--black) / <alpha-value>)',
        ivory: '#F8F4E9',
        ink: '#1F2937'
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
        serif: ["Playfair Display", "ui-serif", "Georgia", "Cambria", "Times New Roman", "Times", "serif"],
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0,0,0,0.05)",
        lux: "0 8px 30px rgba(0,0,0,0.08)",
        'ring-gold': "0 0 0 3px rgba(212,175,55,0.25)",
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, rgb(var(--white)) 0%, rgba(212,175,55,0.08) 100%)',
        'gold-soft': 'radial-gradient(100% 100% at 0% 0%, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0) 60%), radial-gradient(100% 100% at 100% 100%, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0) 60%)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        'fade-in': 'fade-in 400ms ease-out both',
        'slide-up': 'slide-up 450ms ease-out both',
        'scale-in': 'scale-in 300ms ease-out both'
      },
      borderColor: {
        gold: 'var(--gold)'
      }
    },
  },
  plugins: [],
}
