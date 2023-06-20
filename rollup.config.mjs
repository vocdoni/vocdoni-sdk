import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import nodePolyfills from 'rollup-plugin-polyfill-node';

import { default as pkg } from './package.json' assert { type: 'json' };
import json from '@rollup/plugin-json';

// take name from package "main" defined file
const name = pkg.main.replace(/\.js$/, '');

// generics
const bundle = (config) => ({
  ...config,
  input: 'src/index.ts',
  external: (id) => {
    if (id === 'blakejs/blake2b' || id === 'blindsecp256k1') {
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
      // convert esm to commonjs modules (for cjs support)
      commonjs(),
      // resolve node modules
      resolve({
        browser: true,
      }),
      /*
        {
          "assert": require("assert"),
          "buffer": require("browser-buffer"),
          "constants": req uire("constants-browserify"), // this package does not export required constants and needs to envolve it in other file :P
          "crypto": require("crypto-browserify"),
          "fs": require("browserify-fs"),
          "path": require("path-browserify"),
          "os": require("os-browserify/browser"),
          "stream": require("stream-browserify"),
        }
      */
      nodePolyfills({ include: null }),
      // final transformation
      esbuild(),
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
