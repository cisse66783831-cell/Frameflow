import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill pour que 'process.env' fonctionne comme dans votre code actuel
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Si vous ajoutez des clés Firebase plus tard, ajoutez-les ici ou utilisez import.meta.env
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});