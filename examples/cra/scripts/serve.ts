import { spawn } from 'child_process'
import { build, serve } from 'esbuild'
import { options } from './esbuild-options'

const createEsBuildServer = async () => {
  build({
    ...options,
    minify: false,
    incremental: true,
    sourcemap: true,
  }).catch(() => process.exit(1))

  const result = await serve({ servedir: 'public' }, {})

  console.log(`⚡ esbuild serving on ${result.host}:${result.port}`)
}

const createTscServer = () => {
  const tsc = spawn('npx tsc', ['--noEmit --watch --skipLibCheck --pretty --project tsconfig.json'], {
    shell: true
  })
  tsc.stdout.on('data', data => {
    console.log(`${data}`)
  })

  tsc.on('error', error => {
    console.log(`error: ${error.message}`)
  })
}

const main = async () => {
  createEsBuildServer()
  createTscServer()
}

main()
