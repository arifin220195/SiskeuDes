import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        primary: '#156100',
        'on-primary': '#ffffff',
        'primary-container': '#2a7c13',
        'on-primary-container': '#c1ffa8',
        'inverse-primary': '#85db69',
        'primary-fixed': '#a0f882',
        'primary-fixed-dim': '#85db69',
        'on-primary-fixed': '#032100',
        'on-primary-fixed-variant': '#115300',
        
        // Secondary
        secondary: '#226d03',
        'on-secondary': '#ffffff',
        'secondary-container': '#a5f783',
        'on-secondary-container': '#29730c',
        'secondary-fixed': '#a5f783',
        'secondary-fixed-dim': '#8bda6a',
        'on-secondary-fixed': '#052100',
        'on-secondary-fixed-variant': '#165200',
        
        // Tertiary
        tertiary: '#605237',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#7a6a4d',
        'on-tertiary-container': '#ffeccd',
        'tertiary-fixed': '#f5e0bc',
        'tertiary-fixed-dim': '#d8c4a2',
        'on-tertiary-fixed': '#241a05',
        'on-tertiary-fixed-variant': '#52452b',
        
        // Error
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        
        // Surface
        surface: '#f3fcee',
        'on-surface': '#161e15',
        'on-surface-variant': '#40493b',
        'surface-variant': '#dce5d7',
        'surface-dim': '#d4ddcf',
        'surface-bright': '#f3fcee',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#edf6e8',
        'surface-container': '#e8f1e2',
        'surface-container-high': '#e2ebdd',
        'surface-container-highest': '#dce5d7',
        'surface-tint': '#196d00',
        
        // Inverse
        'inverse-surface': '#2a3329',
        'inverse-on-surface': '#eaf3e5',
        
        // Outline
        outline: '#707a69',
        'outline-variant': '#c0cab6',
        
        // Background
        background: '#f3fcee',
        'on-background': '#161e15',
      },
      fontFamily: {
        'display': ['"Plus Jakarta Sans"', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        // Named font families for specific use cases
        'label-xs': ['Inter'],
        'headline-md': ['"Plus Jakarta Sans"'],
        'label-numeric-lg': ['Inter'],
        'body-lg': ['Inter'],
        'body-md': ['Inter'],
        'headline-sm': ['"Plus Jakarta Sans"'],
        'display-lg-mobile': ['"Plus Jakarta Sans"'],
        'display-lg': ['"Plus Jakarta Sans"'],
        'body-sm': ['Inter'],
        'headline-lg-mobile': ['"Plus Jakarta Sans"'],
        'headline-lg': ['"Plus Jakarta Sans"'],
        'label-numeric-md': ['Inter'],
      },
      fontSize: {
        'label-xs': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'label-numeric-lg': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'headline-sm': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'display-lg-mobile': ['30px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '800' }],
        'display-lg': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'label-numeric-md': ['14px', { lineHeight: '20px', fontWeight: '600' }],
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        'full': '9999px',
      },
      spacing: {
        'space-xxs': '0.25rem',
        'space-xs': '0.5rem',
        'space-sm': '0.75rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        'space-2xl': '3rem',
        'gutter-mobile': '1rem',
        'gutter-desktop': '1.5rem',
        'container-max': '80rem',
      },
    },
  },
  plugins: [],
} satisfies Config
