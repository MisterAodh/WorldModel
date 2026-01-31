/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist yellow/network theme classes that may be dynamically generated
  safelist: [
    'border-yellow-500',
    'border-yellow-500/30',
    'border-yellow-500/50',
    'text-yellow-500',
    'bg-yellow-500',
    'bg-yellow-500/5',
    'bg-yellow-500/10',
    'bg-yellow-500/20',
    'hover:bg-yellow-500',
    'hover:bg-yellow-400',
    'hover:bg-yellow-500/10',
    'hover:border-yellow-500',
    'hover:text-yellow-500',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Bloomberg specific colors
        bloomberg: {
          orange: "#FF8000",
          black: "#000000",
          grey: "#333333",
          lightgrey: "#666666",
        },
      },
      borderRadius: {
        lg: "0",
        md: "0",
        sm: "0",
        DEFAULT: "0",
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
