/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The Financial Academy brand palette (from fa.gov.sa)
        tfa: {
          navy: '#1B3A6B',
          'navy-dark': '#122A50',
          'navy-light': '#2D5294',
          gold: '#C9A227',
          'gold-light': '#E0B93A',
          'gold-dark': '#A8861F',
          gray: {
            50: '#F8F9FC',
            100: '#F0F4FF',
            200: '#E4EAF5',
            300: '#C8D2E8',
            400: '#8A96B2',
            500: '#5E6B87',
            600: '#3D4A66',
            700: '#2B3550',
            800: '#1E2840',
            900: '#0F1520',
          },
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'Noto Naskh Arabic', 'Arabic', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(27, 58, 107, 0.08)',
        'card-hover': '0 6px 24px rgba(27, 58, 107, 0.14)',
        modal: '0 20px 60px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
