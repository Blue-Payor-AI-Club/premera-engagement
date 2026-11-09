/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // shadcn/ui tokens (components/ui/*), set to the UST/Premera brand palette.
      colors: {
        border: '#e2e8f0',
        input: '#cbd5e1',
        ring: '#00a0df',
        background: '#ffffff',
        foreground: '#0f172a',
        primary: { DEFAULT: '#0067b1', foreground: '#ffffff' },
        secondary: { DEFAULT: '#f1f5f9', foreground: '#0f172a' },
        destructive: { DEFAULT: '#dc2626', foreground: '#ffffff' },
        muted: { DEFAULT: '#f1f5f9', foreground: '#64748b' },
        accent: { DEFAULT: '#e7f1fa', foreground: '#0067b1' },
        popover: { DEFAULT: '#ffffff', foreground: '#0f172a' },
        success: '#16a34a',
        warning: '#f59e0b',
      },
      boxShadow: {
        card: '0 10px 30px rgba(18, 24, 33, 0.06)',
      },
      borderRadius: {
        xl: '12px',
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
    },
  },
  plugins: [],
}
