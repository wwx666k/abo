/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#322c3a',
          700: '#554d5f',
          500: '#7b7286',
          400: '#a49bab',
        },
        brand: {
          purple: '#a855f7',
          violet: '#8b5cf6',
          pink: '#f0abfc',
          gold: '#e0a63c',
          orange: '#f97316',
        },
      },
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '22px',
        capsule: '999px',
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(88, 28, 135, 0.18)',
        soft: '0 6px 18px -8px rgba(88, 28, 135, 0.14)',
        option: '0 2px 10px -4px rgba(88, 28, 135, 0.12)',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.85)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        floatSlow: 'floatSlow 5s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        pulseRing: 'pulseRing 2.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
