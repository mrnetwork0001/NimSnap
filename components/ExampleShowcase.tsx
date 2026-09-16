'use client'

import { useState } from 'react'
import CompareSlider from './CompareSlider'
import PresetIcon from './PresetIcon'
import { getPreset } from '@/lib/presets'
import type { ExamplePair } from '@/lib/examples'

interface Props {
  examples: ExamplePair[]
}

/**
 * "See it first" showcase.
 *
 * Shown before the user has uploaded anything, so someone arriving without a
 * wallet - a shared link on a laptop, a judge opening the demo URL - can drag a
 * real before/after instead of meeting a disabled button and a banner telling
 * them they cannot use the app.
 *
 * It sits below the upload zone deliberately: on mobile inside Nimiq Pay the
 * user came here to make something, so the camera stays the first thing they
 * reach. This costs them nothing but is there if they scroll.
 */
export default function ExampleShowcase({ examples }: Props) {
  const [active, setActive] = useState(0)

  if (examples.length === 0) return null

  const pair = examples[Math.min(active, examples.length - 1)]
  const preset = getPreset(pair.presetId)

  return (
    <section aria-label="Example transformations" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="eyebrow">See it first</h2>
        <span className="text-[0.6875rem] text-ink-soft">Drag to compare</span>
      </div>

      <div className="card overflow-hidden p-3">
        <CompareSlider
          key={pair.presetId}
          beforeSrc={pair.before}
          afterSrc={pair.after}
          className="aspect-[4/5] w-full"
        />

        <p className="mt-3 px-1 text-center text-xs text-ink-muted">
          {preset ? `${preset.name} - ` : ''}
          {pair.caption}
        </p>

        {examples.length > 1 && (
          <div
            role="tablist"
            aria-label="Example style"
            className="mt-3 flex flex-wrap justify-center gap-1.5"
          >
            {examples.map((ex, i) => {
              const p = getPreset(ex.presetId)
              const selected = i === active
              return (
                <button
                  key={ex.presetId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(i)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6875rem] font-bold transition ${
                    selected
                      ? 'bg-brand-gradient text-white shadow-brand'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {p && <PresetIcon preset={p.id} className="h-3.5 w-3.5" />}
                  {p?.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <p className="px-1 text-center text-[0.6875rem] text-ink-soft">
        Every example is real output from the same $0.10 pipeline.
      </p>
    </section>
  )
}
