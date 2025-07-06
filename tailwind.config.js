/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.prod.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        '2xl-top': '0 -25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      colors: {
        // Base Palette
        background: 'rgb(var(--color-background-rgb) / <alpha-value>)',
        surface: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
        'surface-soft': 'rgb(var(--color-surface-soft-rgb) / <alpha-value>)',
        'surface-subtle': 'rgb(var(--color-surface-subtle-rgb) / <alpha-value>)',
        'surface-hover': 'rgb(var(--color-surface-hover-rgb) / <alpha-value>)',
        border: 'rgb(var(--color-border-rgb) / <alpha-value>)',
        'border-strong': 'rgb(var(--color-border-strong-rgb) / <alpha-value>)',
        'border-subtle': 'rgb(var(--color-border-subtle-rgb) / <alpha-value>)',
        
        // Text Palette
        'text-primary': 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted-rgb) / <alpha-value>)',
        'text-inverted': 'rgb(var(--color-text-inverted-rgb) / <alpha-value>)',
        
        // Primary
        primary: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
        'primary-focus': 'rgb(var(--color-primary-focus-rgb) / <alpha-value>)',
        'primary-text': 'rgb(var(--color-primary-text-rgb) / <alpha-value>)',
        'primary-subtle-bg': 'rgb(var(--color-primary-subtle-bg-rgb) / <alpha-value>)',
        'primary-subtle-text': 'rgb(var(--color-primary-subtle-text-rgb) / <alpha-value>)',
        'focus-ring': 'rgb(var(--color-focus-ring-rgb) / <alpha-value>)',
        
        // Accent
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
        'accent-text': 'rgb(var(--color-accent-text-rgb) / <alpha-value>)',
        'accent-subtle-bg': 'rgb(var(--color-accent-subtle-bg-rgb) / <alpha-value>)',
        'accent-selected-bg': 'rgb(var(--color-accent-selected-bg-rgb) / <alpha-value>)',

        // Destructive
        destructive: 'rgb(var(--color-destructive-rgb) / <alpha-value>)',
        'destructive-hover': 'rgb(var(--color-destructive-hover-rgb) / <alpha-value>)',
        'destructive-subtle-bg': 'rgb(var(--color-destructive-subtle-bg-rgb) / <alpha-value>)',
        'destructive-subtle-text': 'rgb(var(--color-destructive-subtle-text-rgb) / <alpha-value>)',

        // Warning
        'warning-text': 'rgb(var(--color-warning-text-rgb) / <alpha-value>)',
        
        // Part of Speech Colors
        'pos-noun-bg': 'rgb(var(--color-pos-noun-bg-rgb) / <alpha-value>)',
        'pos-noun-text': 'rgb(var(--color-pos-noun-text-rgb) / <alpha-value>)',
        'pos-verb-bg': 'rgb(var(--color-pos-verb-bg-rgb) / <alpha-value>)',
        'pos-verb-text': 'rgb(var(--color-pos-verb-text-rgb) / <alpha-value>)',
        'pos-particle-bg': 'rgb(var(--color-pos-particle-bg-rgb) / <alpha-value>)',
        'pos-particle-text': 'rgb(var(--color-pos-particle-text-rgb) / <alpha-value>)',
        'pos-adjective-bg': 'rgb(var(--color-pos-adjective-bg-rgb) / <alpha-value>)',
        'pos-adjective-text': 'rgb(var(--color-pos-adjective-text-rgb) / <alpha-value>)',
        'pos-adverb-bg': 'rgb(var(--color-pos-adverb-bg-rgb) / <alpha-value>)',
        'pos-adverb-text': 'rgb(var(--color-pos-adverb-text-rgb) / <alpha-value>)',
        'pos-auxiliary-bg': 'rgb(var(--color-pos-auxiliary-bg-rgb) / <alpha-value>)',
        'pos-auxiliary-text': 'rgb(var(--color-pos-auxiliary-text-rgb) / <alpha-value>)',
        'pos-conjunction-bg': 'rgb(var(--color-pos-conjunction-bg-rgb) / <alpha-value>)',
        'pos-conjunction-text': 'rgb(var(--color-pos-conjunction-text-rgb) / <alpha-value>)',
        'pos-suffix-bg': 'rgb(var(--color-pos-suffix-bg-rgb) / <alpha-value>)',
        'pos-suffix-text': 'rgb(var(--color-pos-suffix-text-rgb) / <alpha-value>)',

        // Review Card Type Colors
        'review-jp-en': 'rgb(var(--color-review-jp-en-rgb) / <alpha-value>)',
        'review-kanji-read': 'rgb(var(--color-review-kanji-read-rgb) / <alpha-value>)',
      },
      fontFamily: {
        'reading': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'japanese': ['Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    }
  },
  plugins: [],
}
