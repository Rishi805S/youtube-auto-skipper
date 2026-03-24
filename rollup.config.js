import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

const sharedPlugins = [
  typescript({ tsconfig: './tsconfig.json' }),
  nodeResolve({ browser: true }),
  commonjs(),
];

export default [
  // Build the background script
  {
    input: 'src/background/index.ts',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: [
      ...sharedPlugins,
      copy({
        targets: [
          { src: 'manifest.json', dest: 'dist/' },
          { src: 'public', dest: 'dist/' },
          { src: 'src/popup/popup.html', dest: 'dist/' },
          { src: 'src/popup/popup.css', dest: 'dist/' },
        ],
        copyOnce: true,
        hook: 'writeBundle',
        verbose: true,
      }),
    ],
  },
  // Build the content script
  {
    input: 'src/content/simple-skipper.ts',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: sharedPlugins,
  },
  // Build the popup script
  {
    input: 'src/popup/popup.ts',
    output: {
      file: 'dist/popup.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: sharedPlugins,
  },
];
