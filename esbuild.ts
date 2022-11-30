import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill';
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill';
import esbuild from 'esbuild';

const watch = process.argv.slice(2, 3).pop() === '--watch';

const common : esbuild.BuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  minify: true,
  watch,
};

esbuild
  .build({
    ...common,
    outfile: 'dist/index.js',
    platform: 'node',
    target: ['node14'],
  })
  .catch(() => process.exit(1));

esbuild
  .build({
    ...common,
    outfile: 'dist/index.browser.js',
    platform: 'browser',
    format: 'esm',
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
