/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Influenciando - Preto e Verde Neon
        influenciando: {
          black: {
            DEFAULT: '#000000',
            light: '#0A0A0A',
            medium: '#1A1A1A',
            dark: '#050505',
          },
          green: {
            neon: '#00FF41',
            DEFAULT: '#00FF41',
            light: '#39FF70',
            dark: '#00CC34',
            glow: '#00FF41',
            muted: '#00D936',
          },
          gray: {
            DEFAULT: '#2A2A2A',
            light: '#3A3A3A',
            dark: '#1F1F1F',
            muted: '#4A4A4A',
          }
        },
        // Aliases para facilitar uso
        primary: '#00FF41',
        secondary: '#000000',
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 255, 65, 0.5), 0 0 20px rgba(0, 255, 65, 0.3)',
        'neon-lg': '0 0 20px rgba(0, 255, 65, 0.6), 0 0 40px rgba(0, 255, 65, 0.4), 0 0 60px rgba(0, 255, 65, 0.2)',
        'neon-sm': '0 0 5px rgba(0, 255, 65, 0.5)',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { 
            boxShadow: '0 0 10px rgba(0, 255, 65, 0.5), 0 0 20px rgba(0, 255, 65, 0.3)',
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(0, 255, 65, 0.8), 0 0 40px rgba(0, 255, 65, 0.5)',
          },
        },
        'glow': {
          'from': {
            textShadow: '0 0 10px rgba(0, 255, 65, 0.5), 0 0 20px rgba(0, 255, 65, 0.3)',
          },
          'to': {
            textShadow: '0 0 20px rgba(0, 255, 65, 0.8), 0 0 30px rgba(0, 255, 65, 0.5)',
          },
        },
      },
    },
  },
  plugins: [],
};
