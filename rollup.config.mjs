import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { default as pkg } from './package.json' assert { type: 'json' };

// take name from package "output" defined field
const name = pkg.output;

// generics
const bundle = (config) => ({
  ...config,
  input: pkg.main,
  external: [...Object.keys(pkg.dependencies), '@vocdoni/proto/vochain'],
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
        sourcemap: false,
      },
      // es modules
      {
        file: `${name}.mjs`,
        format: 'es',
        sourcemap: false,
      },
      // umd
      {
        name: 'VocdoniSDK',
        file: `${name}.umd.js`,
        format: 'umd',
        sourcemap: false,
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
