import react from '@vitejs/plugin-react';
import { join } from 'path';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import WindiCSS from 'vite-plugin-windicss';

const PACKAGE_ROOT = __dirname;
/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '@/': `${join(PACKAGE_ROOT, './')}/`,
    },
  },
  plugins: [
    Icons({
      customCollections: {
        fluency: FileSystemIconLoader('./assets/icons/app-icons'),
      },
    }),
    WindiCSS({
      scan: {
        dirs: ['.'], // all files in the cwd
        fileExtensions: ['tsx', 'js', 'ts'], // also enabled scanning for js/ts
      },
    }),
    react(),
  ],
  base: '',
  server: {
    fs: {
      strict: true,
    },
    host: true,
    port: process.env.PORT ? +process.env.PORT : 1212,
  },
  build: {
    sourcemap: true,
    outDir: '../../release/dist/renderer',
    assetsDir: '.',
    emptyOutDir: true,
    brotliSize: false,
  },
});
