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
        'dark-bg': '#111B21',
        'dark-sidebar': '#202C33',
        'dark-hover': '#2A3942',
      },
    },
  },
  plugins: [],
}
