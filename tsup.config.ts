import {defineConfig} from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.js'],
    format: 'cjs',
    outDir: 'dist/cjs',
    clean: true,
    dts: true,
    target: 'node18',
    sourcemap: true,
    splitting: false,
  },
  {
    entry: ['src/cli.ts'],
    format: 'cjs',
    outDir: 'dist/cjs',
    clean: false, // Don't clean, append to dist/cjs
    dts: false, // Skip dts for CLI to avoid internal resolution errors
    target: 'node18',
    sourcemap: true,
    splitting: false,
  },
  {
    entry: ['src/index.js'],
    format: 'esm',
    outDir: 'dist/esm',
    clean: true,
    dts: true,
    target: 'node18',
    sourcemap: true,
    splitting: false,
    banner: {
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
  },
]);
