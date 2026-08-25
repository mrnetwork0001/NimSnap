import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Nimiq brand ramp — keeps us visually native inside Nimiq Pay
        nimiq: {
          blue: '#0582CA',
          lightblue: '#41A38E',
          gold: '#E9B213',
          orange: '#FC8702',
          red: '#D94432',
          purple: '#5F4B8B',
        },
        ink: {
          900: '#05060B',
          800: '#0A0C16',
          700: '#111428',
          600: '#1A1E3A',
        },
        neon: {
          cyan: '#22E7FF',
          magenta: '#FF3DCB',
          lime: '#B6FF3D',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, rgba(34,231,255,0.08) 1px, transparent 1px), linear-gradient(to right, rgba(34,231,255,0.08) 1px, transparent 1px)',
      },
      backgroundSize: { grid: '32px 32px' },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.45), inset 0 1px 0 0 rgba(255,255,255,0.06)',
        neon: '0 0 24px -4px rgba(34,231,255,0.55)',
        'neon-magenta': '0 0 24px -4px rgba(255,61,203,0.55)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'scan-line': {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.24,0,0.38,1) infinite',
        float: 'float 4s ease-in-out infinite',
        'scan-line': 'scan-line 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
