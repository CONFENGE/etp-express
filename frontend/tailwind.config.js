/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    // Responsive breakpoints (mobile-first)
    screens: {
      xs: '375px', // iPhone SE and small phones
      sm: '640px', // Large phones and small tablets
      md: '768px', // Tablets portrait
      lg: '1024px', // Tablets landscape and small desktops
      xl: '1280px', // Desktops
      '2xl': '1536px', // Large desktops and wide screens
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter var',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Apple HIG Surface Colors
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          tertiary: 'var(--surface-tertiary)',
          elevated: 'var(--surface-elevated)',
        },
        // Apple HIG System Colors
        apple: {
          red: 'var(--apple-red)',
          orange: 'var(--apple-orange)',
          yellow: 'var(--apple-yellow)',
          green: 'var(--apple-green)',
          teal: 'var(--apple-teal)',
          blue: 'var(--apple-blue)',
          indigo: 'var(--apple-indigo)',
          purple: 'var(--apple-purple)',
          pink: 'var(--apple-pink)',
          accent: {
            DEFAULT: 'var(--apple-accent)',
            hover: 'var(--apple-accent-hover)',
            active: 'var(--apple-accent-active)',
            light: 'var(--apple-accent-light)',
          },
        },
        // Apple HIG Text Colors
        'text-apple': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          quaternary: 'var(--text-quaternary)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Apple HIG Border Radius
        apple: 'var(--radius-apple)',
        'apple-lg': 'var(--radius-apple-lg)',
      },
      boxShadow: {
        // Apple HIG Shadows
        'apple-sm': 'var(--shadow-sm)',
        apple: 'var(--shadow-md)',
        'apple-lg': 'var(--shadow-lg)',
        'apple-xl': 'var(--shadow-xl)',
        'apple-inset': 'var(--shadow-inset)',
      },
      transitionTimingFunction: {
        // Apple HIG Easing
        apple: 'var(--ease-apple)',
        'apple-spring': 'var(--ease-apple-spring)',
      },
      transitionDuration: {
        // Apple HIG Durations
        instant: 'var(--duration-instant)',
        apple: 'var(--duration-apple)',
        'apple-slow': 'var(--duration-apple-slow)',
      },
      spacing: {
        // Apple HIG Spacing Scale
        'apple-1': 'var(--space-1)',
        'apple-2': 'var(--space-2)',
        'apple-3': 'var(--space-3)',
        'apple-4': 'var(--space-4)',
        'apple-5': 'var(--space-5)',
        'apple-6': 'var(--space-6)',
        'apple-8': 'var(--space-8)',
        'apple-10': 'var(--space-10)',
        'apple-12': 'var(--space-12)',
        'apple-16': 'var(--space-16)',
        // WCAG 2.5.5 Touch Target Size (44x44px minimum)
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      minHeight: {
        touch: '44px',
      },
      fontSize: {
        // Apple HIG Typography Scale
        'apple-xs': [
          'var(--font-size-xs)',
          { lineHeight: 'var(--line-height-tight)' },
        ],
        'apple-sm': [
          'var(--font-size-sm)',
          { lineHeight: 'var(--line-height-normal)' },
        ],
        'apple-base': [
          'var(--font-size-base)',
          { lineHeight: 'var(--line-height-normal)' },
        ],
        'apple-md': [
          'var(--font-size-md)',
          { lineHeight: 'var(--line-height-normal)' },
        ],
        'apple-lg': [
          'var(--font-size-lg)',
          { lineHeight: 'var(--line-height-tight)' },
        ],
        'apple-xl': [
          'var(--font-size-xl)',
          { lineHeight: 'var(--line-height-tight)' },
        ],
        'apple-2xl': [
          'var(--font-size-2xl)',
          { lineHeight: 'var(--line-height-tight)' },
        ],
        'apple-3xl': [
          'var(--font-size-3xl)',
          { lineHeight: 'var(--line-height-tight)' },
        ],
        'apple-4xl': [
          'var(--font-size-4xl)',
          { lineHeight: 'var(--line-height-tight)' },
        ],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Apple HIG Animations
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        // Login page entrance animations (more dramatic)
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-fade-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        // Micro-interaction animations
        'bounce-in': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'check-scale-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'lift-up': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-4px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(var(--apple-accent-rgb), 0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(var(--apple-accent-rgb), 0.1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Apple HIG Animations
        'fade-in': 'fade-in var(--duration-apple) var(--ease-apple)',
        'fade-out': 'fade-out var(--duration-apple) var(--ease-apple)',
        'slide-in-up':
          'slide-in-up var(--duration-apple-slow) var(--ease-apple-spring)',
        'slide-in-down':
          'slide-in-down var(--duration-apple-slow) var(--ease-apple-spring)',
        'scale-in': 'scale-in var(--duration-apple) var(--ease-apple-spring)',
        // Login page entrance animations
        'fade-in-up':
          'fade-in-up 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'scale-fade-in':
          'scale-fade-in 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        // Micro-interaction animations
        'bounce-in': 'bounce-in 0.3s ease-out',
        'check-scale-in': 'check-scale-in 0.2s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
