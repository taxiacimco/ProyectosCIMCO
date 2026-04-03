/**
 * PROYECTO: TAXIA CIMCO - Configuración Maestra Frontend
 * Estado: Corrección de Errores de Optimización (Vite 6)
 */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path'; // Uso de prefijo node: para mayor estabilidad
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    
    // 🛡️ SOLUCIÓN AL ERROR DE CHUNKS: Excluimos las librerías conflictivas de la pre-optimización
    optimizeDeps: {
      exclude: ['lucide-react', 'firebase/app', 'firebase/auth', 'firebase/firestore']
    },

    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '.ngrok-free.dev', 
        '192.168.100.34' 
      ],
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://127.0.0.1:5001',
          changeOrigin: true,
          secure: false,
          // Ajuste para la ruta de las funciones emuladas
          rewrite: (path) => path.replace(/^\/api/, '/pelagic-chalice-467818-e1/us-central1/api')
        }
      }
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
        },
      },
    },

    // 🛡️ Evita el error de 'process.env' que vimos antes
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    }
  };
});