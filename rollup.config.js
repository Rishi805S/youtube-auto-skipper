import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { terser } from 'rollup-plugin-terser';

export default [
  // Background service worker bundle
  {
    input: 'src/background/index.ts',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
  },
  // Content script bundle
  {
    input: 'src/content/index.ts',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
    ],
  },
  // Copy manifest and static assets
  {
    input: 'src/empty.js', // dummy input to trigger copy plugin
    plugins: [
      copy({
        targets: [
          { src: 'manifest.json', dest: 'dist/' },
          { src: 'public/*', dest: 'dist/' },
        ],
      }),
    ],
  },
];