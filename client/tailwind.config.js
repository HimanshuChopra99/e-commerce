/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        rubik: ['Rubik', 'sans-serif'],
        display: ['Archivo Black', 'sans-serif'],
        kicks: ['Bebas Neue', 'cursive'],
      },

      colors: {
        brand: '#F5A623',
        branddark: '#E09512',
        ink: '#141414',
        paper: '#F4F4F2',
        // legacy brand colors
        'brand-blue': '#3B5BDB',
        'brand-orange': '#FF6B00',
        'brand-cream': '#F4F4F0',
        'brand-dark': '#111111',
        'brand-mid': '#555555',
      },
      boxShadow: {
        mega: '0 24px 60px -12px rgba(0,0,0,0.18)',
        head: '0 6px 24px -8px rgba(0,0,0,0.12)',
      },
      fontSize: {
        '10xl': ['10rem', { lineHeight: '1' }],
        '11xl': ['12rem', { lineHeight: '1' }],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        badgePop: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.28)' },
          '70%': { transform: 'scale(.94)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.5s ease-out forwards',
        'badge-pop': 'badgePop .45s cubic-bezier(.36,.66,.4,1.4)',
        'fade-up': 'fadeUp .7s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};
