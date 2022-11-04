import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill'
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill'
import inlineImage from 'esbuild-plugin-inline-image'

export const options = {
  entryPoints: ['./src/index.js'],
  outfile: './public/build/app.js',
  tsconfig: './tsconfig.json',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts'
  } as any,
  minify: true,
  bundle: true,
  plugins: [
    inlineImage(),
    NodeModulesPolyfills(),
    GlobalsPolyfills({
      process: true,
      buffer: true,
    }),
  ],
  define: {
    'process.env.NODE_ENV': process.env.NODE_ENV || '"development"',
  },
}
