/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#05070D',
          secondary: '#0B0F1A',
        },
        accent: {
          primary: '#6366F1',
          secondary: '#22D3EE',
        },
        text: {
          primary: '#F9FAFB',
          secondary: '#9CA3AF',
        },
      },
      backdropBlur: {
        light: '8px',
        strong: '20px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.3)',
        soft: '0 10px 30px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
