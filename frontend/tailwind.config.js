/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'telegram-blue': '#0088cc',
        'whatsapp-green': '#25D366',
        'whatsapp-teal': '#075E54',
        'whatsapp-light': '#128C7E',
        'brand': {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        'surface': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        'sidebar': '#0f172a',
        'sidebar-hover': '#1e293b',
        'sidebar-active': '#334155',
        'accent': '#8b5cf6',
        'accent-light': '#a78bfa',
      },
      boxShadow: {
        'premium': '0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.2)',
        'message': '0 1px 2px rgba(0,0,0,0.06)',
        'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
