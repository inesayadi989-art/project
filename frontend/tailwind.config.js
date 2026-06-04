export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Premium Modern Palette
        primary: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F8B4D6',
          400: '#F472B6',
          500: '#EC4899',
          600: '#FF6B35', // Main primary (Red Orange)
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843'
        },
        secondary: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B', // Or chaud (Accent)
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F'
        },
        dark: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A' // Bleu nuit profond (Dark background)
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444'
      },
      backgroundColor: {
        light: '#FAFAFA' // Blanc chaud
      }
    }
  },
  plugins: []
}

