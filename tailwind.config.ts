import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy ink and its muted steps.
        //
        // `muted` and `soft` were #74819A and #94A0B5, which measure 3.54:1 and
        // 2.38:1 against the haze page background - both below the 4.5:1 WCAG AA
        // needs for body text, and between them they carry most of the copy in
        // the app. Darkened until they pass on white AND on haze, keeping the
        // hue and the three-step hierarchy intact.
        ink: {
          DEFAULT: '#17213D', // 14.33:1 on haze
          muted: '#4F5D7A', //  5.95:1 on haze
          soft: '#5F6F89', //  4.59:1 on haze
        },
        // Primary indigo ramp, taken from the reference button gradient.
        brand: {
          50: '#F2F5FD',
          100: '#E4EAFA',
          200: '#C7D3F4',
          300: '#A3B6EC',
          400: '#5C7DE2',
          500: '#4262D4',
          600: '#2948B5',
          700: '#223C96',
        },
        // Soft page grounds.
        haze: {
          50: '#F5F9FC',
          100: '#EEF4F8',
          200: '#E8F1F7',
          300: '#E4EEF4',
          400: '#EDF2F7',
        },
        accent: {
          teal: '#64C4CC',
          periwinkle: '#9EB2E5',
          cornflower: '#7F9EE0',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        eyebrow: ['0.656rem', { lineHeight: '1', letterSpacing: '0.3em', fontWeight: '700' }],
      },
      borderRadius: {
        card: '2.875rem', // 46px — the reference card radius
        panel: '1.75rem',
      },
      boxShadow: {
        // Primary button: lifted, with an inner top highlight and bottom shade.
        brand:
          '0 14px 30px -12px rgba(41,72,181,0.55), 0 2px 6px 0 rgba(41,72,181,0.22), inset 0 1px 0 0 rgba(255,255,255,0.45), inset 0 -2px 6px 0 rgba(40,30,160,0.25)',
        ghost:
          '0 6px 18px -10px rgba(70,80,180,0.3), inset 0 1px 0 0 rgba(255,255,255,0.9)',
        card: '0 24px 60px -32px rgba(35,52,112,0.35), 0 2px 8px -4px rgba(35,52,112,0.08)',
        lift: '0 18px 40px -24px rgba(35,52,112,0.4)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(rgba(255,255,255,0.28), rgba(255,255,255,0) 52%), linear-gradient(100deg, #5C7DE2 0%, #4262D4 48%, #2948B5 100%)',
        'page-wash':
          'linear-gradient(165deg, #F5F9FC 0%, #E8F1F7 38%, #EEF4F8 68%, #E4EEF4 100%)',
      },
      keyframes: {
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(3%,-4%) scale(1.06)' },
          '66%': { transform: 'translate(-3%,3%) scale(0.96)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        blob: 'blob 18s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 2.2s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.24,0,0.38,1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
