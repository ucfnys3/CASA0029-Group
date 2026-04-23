import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  optimizeDeps: {
    include: ['deck.gl', '@deck.gl/react', 'maplibre-gl'],
  },
});
