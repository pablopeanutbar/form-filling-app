import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { extensionDownload } from './dev/extension-download.js';

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), ...(command === 'serve' ? [extensionDownload({
    downloadUrl: loadEnv(mode, process.cwd(), '').FORMER_EXTENSION_ZIP_URL || undefined
  })] : [])],
  server: {
    port: 5173,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/artifacts/**'] },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
}));
