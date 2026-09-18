import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Guards the Android library picker.
 *
 * `accept="image/*"` on the library input sends Android to its media picker,
 * which offers the camera - and MIUI launches the camera outright, so "Choose
 * from library" opened the viewfinder on Redmi and Xiaomi devices while iOS and
 * One UI behaved. The fix is to name concrete types, which routes the intent to
 * the documents picker instead.
 *
 * This is a source assertion rather than a render test because the suite runs
 * in node with no DOM. It is narrow on purpose: it only fails if someone
 * collapses the type list back to the wildcard.
 */

const SRC = readFileSync(resolve(__dirname, '../components/UploadZone.tsx'), 'utf8')

function inputLine(ref: string): string {
  const line = SRC.split('\n').find((l) => l.includes(`ref={${ref}}`) && l.includes('type="file"'))
  if (!line) throw new Error(`no file input found for ref ${ref}`)
  return line
}

describe('UploadZone accept types', () => {
  it('library picker never uses the image/* wildcard', () => {
    expect(inputLine('pickerRef')).not.toContain('accept="image/*"')
  })

  it('library picker carries no capture attribute', () => {
    expect(inputLine('pickerRef')).not.toContain('capture')
  })

  it('camera input still forces the front camera', () => {
    const camera = inputLine('cameraRef')
    expect(camera).toContain('capture="user"')
    expect(camera).toContain('accept="image/*"')
  })

  it('library types cover every format the decoder accepts', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']) {
      expect(SRC).toContain(t)
    }
    // Extensions matter too: some Android pickers match on filename and hand
    // over a blank MIME type.
    for (const ext of ['.jpg', '.png', '.heic']) {
      expect(SRC).toContain(`'${ext}'`)
    }
  })
})
