import react from '@vitejs/plugin-react';
import { join } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import ViteFonts from 'vite-plugin-fonts';
import WindiCSS from 'vite-plugin-windicss';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import checker from 'vite-plugin-checker';
import EnvironmentPlugin from 'vite-plugin-environment';

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
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
      ],
    },
  },
  plugins: [
    EnvironmentPlugin({
      BROWSER: 'true', // Anchor <=0.24.2
      ANCHOR_BROWSER: 'true', // Anchor >0.24.2
    }),
    ViteFonts({
      google: {
        families: ['Roboto:wght@400;500;700', 'Space Mono:wght@400'],
      },
    }),
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
    checker({
      typescript: {
        root: PACKAGE_ROOT,
        tsconfigPath: `./tsconfig.json`,
      },
    }),
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
