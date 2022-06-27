import react from '@vitejs/plugin-react';
import { join } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import ViteFonts from 'vite-plugin-fonts';
import InlineCSSModules from 'vite-plugin-inline-css-modules';
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
    ViteFonts({
      google: {
        families: ['Roboto:wght@400;500;700', 'Space Mono:wght@400'],
      },
    }),
    InlineCSSModules(),
    Icons({
      compiler: 'jsx',
      jsx: 'react',
    }),
    AutoImport({
      resolvers: [
        IconsResolver({
          prefix: 'Icon',
          extension: 'jsx',
        }),
      ],
    }),
    WindiCSS({
      scan: {
        dirs: ['.'], // all files in the cwd
        fileExtensions: ['tsx', 'js', 'ts'], // also enabled scanning for js/ts
      },
    }),
    react(),
    WindiCSS(),
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