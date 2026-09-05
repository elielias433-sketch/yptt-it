/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Alien Blue Design System
        alien: {
          // Deep navy backgrounds
          950: '#020617',
          900: '#0c1222',
          850: '#0f172a',
          800: '#111827',
          
          // Mid blues
          700: '#1e293b',
          600: '#1e3a5f',
          500: '#2563eb',
          
          // Alien Blue accents
          400: '#3b82f6',
          300: '#60a5fa',
          200: '#93c5fd',
          100: '#dbeafe',
        },

        // Electric/Cyan accents
        electric: {
          500: '#06b6d4',
          400: '#22d3ee',
          300: '#67e8f9',
          200: '#a5f3fc',
          100: '#cffafe',
        },
        
        // Glow variants
        glow: {
          subtle: 'rgba(59, 130, 246, 0.15)',
          medium: 'rgba(59, 130, 246, 0.3)',
          strong: 'rgba(59, 130, 246, 0.5)',
          electric: 'rgba(6, 182, 212, 0.4)',
        },
        
        // Semantic colors
        surface: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#1e3a5f',
          card: '#1e293b',
          cardHover: '#2563eb20',
        },
        
        border: {
          primary: '#2563eb33',
          secondary: '#334155',
          focus: '#3b82f6',
          glow: '#3b82f680',
        },
        
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
          accent: '#60a5fa',
          electric: '#22d3ee',
        },
        
        status: {
          planning: '#3b82f6',
          inProgress: '#f59e0b',
          completed: '#10b981',
          onHold: '#64748b',
          cancelled: '#ef4444',
          pending: '#f59e0b',
        },
        
        region: {
          kal: '#3b82f6',
          sul: '#10b981',
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'heading-xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        'heading-md': ['1.125rem', { lineHeight: '1.4', letterSpacing: '0' }],
        'heading-sm': ['1rem', { lineHeight: '1.45', letterSpacing: '0' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5' }],
        'caption': ['0.6875rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      
      boxShadow: {
        'glow-sm': '0 0 8px rgba(59, 130, 246, 0.2), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'glow-md': '0 0 16px rgba(59, 130, 246, 0.25), 0 4px 8px rgba(0, 0, 0, 0.4)',
        'glow-lg': '0 0 24px rgba(59, 130, 246, 0.3), 0 8px 16px rgba(0, 0, 0, 0.4)',
        'glow-electric': '0 0 16px rgba(6, 182, 212, 0.3), 0 4px 8px rgba(0, 0, 0, 0.4)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3), 0 0 24px rgba(59, 130, 246, 0.15)',
      },
      
      borderRadius: {
        'card': '12px',
        'card-lg': '16px',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(59, 130, 246, 0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(59, 130, 246, 0.4)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
        'radial-glow': 'radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)',
        'mesh-gradient': 'radial-gradient(ellipse at 20% 20%, rgba(59,130,246,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.1) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
}