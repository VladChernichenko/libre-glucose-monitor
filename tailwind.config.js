/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Domain semantics, not chrome — left as they were.
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        glucose: {
          low: '#ef4444',
          normal: '#10b981',
          high: '#f59e0b',
          critical: '#dc2626'
        },
        // Chrome, driven by src/ui/tokens.css.
        surface: 'var(--gm-surface)',
        'surface-nested': 'var(--gm-surface-nested)',
        'bg-grouped': 'var(--gm-bg-grouped)',
        separator: 'var(--gm-separator)',
        label: 'var(--gm-label)',
        'label-secondary': 'var(--gm-label-secondary)',
        'label-tertiary': 'var(--gm-label-tertiary)',
        'sys-blue': 'var(--gm-blue)',
        'sys-green': 'var(--gm-green)',
        'sys-orange': 'var(--gm-orange)',
        'sys-red': 'var(--gm-red)',
        'sys-indigo': 'var(--gm-indigo)',
        'sys-purple': 'var(--gm-purple)',
      },
      borderRadius: {
        card: 'var(--gm-radius-card)',
        nested: 'var(--gm-radius-nested)',
        capsule: 'var(--gm-radius-capsule)',
      },
      boxShadow: {
        card: 'var(--gm-shadow-card)',
        capsule: 'var(--gm-shadow-capsule)',
      },
      fontSize: {
        'gm-title': ['34px', { lineHeight: '40px', fontWeight: '800', letterSpacing: '-1px' }],
        'gm-card-title': ['22px', { lineHeight: '28px', fontWeight: '700', letterSpacing: '-0.3px' }],
        'gm-hero': ['56px', { lineHeight: '60px', fontWeight: '700', letterSpacing: '-1.5px' }],
        'gm-body': ['17px', { lineHeight: '22px' }],
        'gm-subhead': ['15px', { lineHeight: '20px' }],
        'gm-caption': ['13px', { lineHeight: '18px' }],
        'gm-label': ['11px', { lineHeight: '14px' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
