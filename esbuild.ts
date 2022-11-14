import GlobalsPolyfills from '@esbuild-plugins/node-globals-polyfill'
import NodeModulesPolyfills from '@esbuild-plugins/node-modules-polyfill'
import de from 'dotenv'
import esbuild from 'esbuild'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

// read .env vars
const opts = de.config()

const watch = process.argv.slice(2, 3).pop() === '--watch'

const define = {}

for (const k in opts.parsed) {
  define[`process.env.${k}`] = JSON.stringify(opts.parsed[k])
}

// Select all typescript files of src directory as entry points
const entryPoints = readdirSync(join(process.cwd(), 'src'))
  .filter(
    (file) =>
      file.endsWith('.ts') &&
      statSync(join(process.cwd(), 'src', file)).isFile()
  )
  .map((file) => `src/${file}`)

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
        define,
        plugins: [
          NodeModulesPolyfills(),
          GlobalsPolyfills({
            buffer: true,
            process: true,
            define,
          }),
        ],
    })
    .catch(() => process.exit(1))
