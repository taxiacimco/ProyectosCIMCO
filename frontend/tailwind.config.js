// Versión Arquitectura: V9.9 - Restablecimiento de Tokens de Diseño CIMCO-UI Premium y Filtros de Purga
/**
 * Ubicación: frontend/tailwind.config.js
 * Misión: Configurar el motor de utilidades de Tailwind para compilar fondos translúcidos, desenfoques y acentos corporativos.
 * UI Standard: Glassmorphism Avanzado - Soporte estricto para animaciones de radar y variantes oscuras.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de Identidad de Red de TAXIA CIMCO
        cimco: {
          dark: '#09090b',      // Fondo base absorbente de luz
          panel: '#121214',     // Contenedores Glassmorphism
          accent: '#eab308',    // Amarillo vial transaccional (Yellow-500)
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}