import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api-riskpulse.delightfulglacier-38eeee86.koreacentral.azurecontainerapps.io',
        changeOrigin: true,
      },
    },
  },
});
