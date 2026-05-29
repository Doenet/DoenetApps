import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import react from '@vitejs/plugin-react';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig((env) => ({
  appType: 'mpa',
  plugins: [react()],
  server: {
    host: true,
    port: 8000,
    proxy: {
      '/api': 'http://apache',
      '/cyapi': 'http://apache',
      '/media': 'http://apache',
    },
  },
  resolve: {
    alias: [
      { find: 'csv-parse', replacement: 'csv-parse/browser/esm' },
      { find: '@Toast', replacement: '/src/Tools/_framework/Toast' },
      { find: '@Tool', replacement: '/src/Tools/_framework/Tool' },
      { find: '@ToolRoot', replacement: '/src/Tools/_framework/NewToolRoot' },
      { find: 'solid-svg', replacement: '@fortawesome/free-solid-svg-icons' },
    ],
  },
  optimizeDeps: {
    // Node.js global to browser globalThis
    define: {
      global: 'globalThis',
    },
    // Enable esbuild polyfill plugins
    plugins: [
      NodeGlobalsPolyfillPlugin({
        process: true,
        buffer: true,
      }),
      NodeModulesPolyfillPlugin(),
    ],
  },
  worker: {
    format: 'iife',
  },
  build: {
    outDir: './dist_local',
    rollupOptions: {
      plugins: [nodePolyfills()],
      input:
        env.mode === 'development'
          ? {
              main: resolve(__dirname, 'index.html'),
              cypressTest: resolve(
                __dirname,
                'src/Tools/',
                'cypressTest/index.html',
              ),
            }
          : 'index.html',
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      // Bugfix required to handle issue with vite, rollup and libs (like react-datetime)
      // https://github.com/vitejs/vite/issues/2139#issuecomment-1399098579
      defaultIsModuleExports(id) {
        try {
          const module = require(id);
          if (module?.default) return false;
          return 'auto';
        } catch (error) {
          return 'auto';
        }
      },
    },
  },
}));
