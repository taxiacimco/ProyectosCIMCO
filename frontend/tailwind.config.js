/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/**/*.html",              // Todos los HTML, incluyendo admin y módulos
    "./public/js/**/*.{js,ts}",        // Scripts frontend
    "./src/**/*.{js,ts,jsx,tsx,html}", // Compatibilidad si usas Vite o React
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        // 🎨 Paleta corporativa CIMCO
        "primary-cimco": "#7D3C98",     // Púrpura institucional
        "secondary-taxi": "#2E86C1",    // Azul transporte
        "neon-cyan": "#00F0FF",         // Efectos neón
        "neon-purple": "#B300F2",
        "gray-panel": "#1E1E2A",        // Fondo oscuro de paneles
        "success-cimco": "#27AE60",
        "danger-cimco": "#E74C3C",
        "warning-cimco": "#F1C40F",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // Fuente moderna y ligera
      },
      boxShadow: {
        "glow-cimco": "0 0 20px rgba(0, 240, 255, 0.4)",
      },
      keyframes: {
        fluido: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-cimco": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.05)" },
        },
      },
      animation: {
        fluido: "fluido 6s ease infinite",
        "pulse-cimco": "pulse-cimco 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
