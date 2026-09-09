import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carga explícita de variables de entorno según el modo activo (dev, tunnel, prod)
  const env = loadEnv(mode, process.cwd(), '');
  const isTunnel = mode === 'tunnel';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true, // Expone el servidor en la red local/túnel
      historyApiFallback: true,
      // Si está en modo túnel permite cualquier host, de lo contrario usa la lista explícita
      allowedHosts: isTunnel ? true : [
        '192.168.100.34',
        'localhost',
        '127.0.0.1',
        '.trycloudflare.com',
        '.ngrok-free.app',
        '.ngrok-free.dev',
        '.loca.lt'
      ],
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              console.warn('⚠️ [Vite Proxy Error]: Backend no disponible', err.message);
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend fuera de línea' }));
              }
            });
          }
        },
        '/socket.io': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.warn('⚠️ [Vite WS Proxy Error]: Canal Socket.io desconectado', err.message);
            });
          }
        },
      },
      watch: {
        usePolling: false,
      },
      hmr: isTunnel ? {
        clientPort: 443,
        protocol: 'wss',
      } : {
        protocol: 'ws',
        port: 5173
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id) return;
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
              return 'vendor-core';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-ui-icons';
            }
            if (id.includes('node_modules/axios')) {
              return 'vendor-network';
            }
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
          },
        },
      },
    },
  };
});