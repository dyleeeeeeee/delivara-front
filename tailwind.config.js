/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Futuristic "liquid void" palette ──
        // Deep blue-black base, holographic aurora accents.
        void: {
          DEFAULT: '#06070F',
          900: '#06070F',
          800: '#0A0C1A',
          700: '#11142A',
        },
        iris: '#7C5CFF',     // primary — electric violet
        aqua: '#22E0F0',     // secondary — plasma cyan
        plasma: '#FF4D9D',   // tertiary — neon magenta
        lime: '#7CF59A',     // success / online

        // ── Aliases kept so existing utility classes keep working ──
        bg: {
          primary: '#06070F',
          secondary: '#0A0C1A',
        },
        accent: {
          primary: '#7C5CFF',
          secondary: '#22E0F0',
        },
        text: {
          primary: '#F4F6FF',
          secondary: '#9AA3C7',
        },
      },
      backdropBlur: {
        light: '8px',
        strong: '20px',
      },
      boxShadow: {
        glow: '0 0 28px rgba(124, 92, 255, 0.45)',
        'glow-aqua': '0 0 28px rgba(34, 224, 240, 0.4)',
        soft: '0 12px 40px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(6%, -4%, 0) scale(1.15)' },
          '66%': { transform: 'translate3d(-5%, 5%, 0) scale(0.95)' },
        },
      },
      animation: {
        'aurora-drift': 'aurora-drift 26s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
