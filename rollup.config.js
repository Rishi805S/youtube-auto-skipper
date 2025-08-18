import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

export default [
  // Build the background script
  {
    input: 'src/background/index.ts',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // Build the content script
  {
    input: 'src/content/index.ts',
    output: {
      file: 'dist/content.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  // This part handles copying static files
  {
    input: 'empty.js', // Uses an empty file in the root to trigger the copy plugin
    plugins: [
      copy({
        targets: [
          // This line tells Rollup to copy manifest.json to the dist folder
          { src: 'manifest.json', dest: 'dist/' },
          // This line copies your icons
          { src: 'public', dest: 'dist/' },
        ],
        copyOnce: true,
        hook: 'writeBundle',
        verbose: true,
      }),
    ],
    // Rollup requires an output, even for a dummy entry
    output: {
      file: 'dist/dummy.js',
    },
  },
];
