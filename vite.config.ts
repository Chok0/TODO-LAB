import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Tauri sert le frontend buildé ; en dev il attend un serveur sur un port fixe.
export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // fuseau fixe : les tests couvrent le passage à l'heure d'été (docs/03 §8)
    env: { TZ: 'Europe/Paris' },
  },
});
