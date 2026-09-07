import { existsSync } from 'fs'
import { join } from 'path'
import { EXAMPLE_MANIFEST, type ExamplePair } from './examples'

/**
 * Which showcase pairs are actually present on disk.
 *
 * Checked on the server at render time rather than shipped as a hard-coded list,
 * so the showcase lights up the moment real assets are added and stays hidden
 * until then. A missing file is a normal state, not an error.
 */
export function availableExamples(): ExamplePair[] {
  const publicDir = join(process.cwd(), 'public')
  return EXAMPLE_MANIFEST.filter(
    (pair) =>
      existsSync(join(publicDir, pair.before)) && existsSync(join(publicDir, pair.after)),
  )
}
