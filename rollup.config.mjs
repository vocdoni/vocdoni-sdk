import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { default as pkg } from './package.json' assert { type: 'json' };

// take name from package "output" defined file
const name = pkg.output;
const embeded = [
  'blakejs/blake2b',
  'blindsecp256k1',
  'circomlibjs',
  'blake-hash',
  'ffjavascript',
  'crypto',
  'os',
  'ethers',
  'assert',
  'snarkjs',
  'circom_runtime',
  '@iden3/binfileutils',
];

// generics
const bundle = (config) => ({
  ...config,
  input: 'src/index.ts',
  external: (id) => {
    if (embeded.includes(id)) {
      return false;
    }
    if (process.platform === 'win32') {
      return !id.includes('src');
    }
    return !id.startsWith('src') && !/^[./]/.test(id);
  },
});

export default [
  bundle({
    plugins: [
      json(),
      // convert commonjs to esm modules
      commonjs(),
      // resolve node modules
      resolve({
        browser: true,
      }),
      nodePolyfills(),
      // final transformation
      esbuild({
        target: 'esnext',
      }),
    ],
    output: [
      // commonjs
      {
        file: `${name}.js`,
        format: 'cjs',
        sourcemap: true,
      },
      // es modules
      {
        file: `${name}.mjs`,
        format: 'es',
        sourcemap: true,
      },
      // umd
      {
        name: 'VocdoniSDK',
        file: `${name}.umd.js`,
        format: 'umd',
        sourcemap: true,
      },
    ],
  }),
  // typings
  bundle({
    plugins: [dts()],
    output: {
      file: `${name}.d.ts`,
      format: 'es',
    },
  }),
];
