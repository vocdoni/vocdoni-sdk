import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill';
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill';
import esbuild from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const watch = process.argv.slice(2, 3).pop() === '--watch';

// Select all typescript files of src directory as entry points
const entryPoints = readdirSync(join(process.cwd(), 'src'))
  .filter((file) => file.endsWith('.ts') && statSync(join(process.cwd(), 'src', file)).isFile())
  .map((file) => `src/${file}`);

esbuild
  .build({
    entryPoints,
    outdir: 'dist',
    bundle: true,
    sourcemap: true,
    minify: true,
    watch,
    format: 'esm',
    platform: 'browser',
    target: ['esnext'],
    plugins: [
      NodeModulesPolyfills(),
      GlobalsPolyfills({
        buffer: true,
        process: true,
      }),
    ],
  })
  .catch(() => process.exit(1));
