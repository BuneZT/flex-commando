import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      phaser: 'phaser/dist/phaser.js'
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext'
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts']
  }
});



