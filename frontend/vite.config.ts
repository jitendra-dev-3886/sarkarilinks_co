import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { proxy: Object.fromEntries(['/api', '/sitemap.xml', '/robots.txt'].map(path => [path, loadEnv(mode, '.', 'PORTAL_').PORTAL_API_TARGET || 'http://127.0.0.1:8000'])) },
}));
