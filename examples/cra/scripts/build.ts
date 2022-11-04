import esbuild from 'esbuild'
import { options } from './esbuild-options'

esbuild.build(options).catch(() => process.exit(1))
