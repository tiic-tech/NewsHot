/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        success: {
          50: 'var(--color-success-50)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
        },
        danger: {
          50: 'var(--color-danger-50)',
          500: 'var(--color-danger-500)',
          600: 'var(--color-danger-600)',
        },
        info: {
          50: 'var(--color-info-50)',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
        },
        bg: {
          base: 'var(--color-bg-base)',
          subtle: 'var(--color-bg-subtle)',
          muted: 'var(--color-bg-muted)',
          emphasis: 'var(--color-bg-emphasis)',
        },
        border: {
          default: 'var(--color-border-default)',
          muted: 'var(--color-border-muted)',
          emphasis: 'var(--color-border-emphasis)',
        },
      },
      fontFamily: {
        sans: 'var(--font-family-sans)',
        mono: 'var(--font-family-mono)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-default)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        inner: 'var(--shadow-inner)',
      },
    },
  },
  plugins: [],
}