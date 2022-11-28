import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill'
import inlineImage from 'esbuild-plugin-inline-image'

const define : any = {
  'process.env.NODE_ENV': process.env.NODE_ENV || '"development"',
  'process.env.VOCDONI_API_BASE' : '"https://api-dev.vocdoni.net/v2"',
  'global' : 'window',
}

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
    // wallet connect requires Buffer, that's why we need to add global polyfills
    GlobalsPolyfills({
      buffer: true,
      define,
    }),
  ],
  define,
}
