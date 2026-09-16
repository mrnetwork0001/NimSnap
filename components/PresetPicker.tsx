'use client'

import { PRESETS, type PresetId } from '@/lib/presets'
import PresetIcon from './PresetIcon'

interface Props {
  selected: PresetId | null
  onSelect: (id: PresetId) => void
  disabled?: boolean
}

/**
 * Swipeable style picker.
 *
 * A horizontal snap-scroll rail rather than a grid: on a phone it keeps the
 * chosen style, the photo above it and the pay button below it all on screen at
 * once, which is what makes the whole flow fit in one thumb-reachable view.
 */
export default function PresetPicker({ selected, onSelect, disabled }: Props) {
  return (
    <section aria-label="Style presets" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="eyebrow">Pick a style</h2>
        <span className="text-[0.6875rem] text-ink-soft">Swipe for more</span>
      </div>

      <div
        role="radiogroup"
        aria-label="Style presets"
        className="no-scrollbar -mx-2.5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2.5 pb-2 pt-1"
      >
        {PRESETS.map((preset) => {
          const active = selected === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onSelect(preset.id)}
              className={`relative w-[10.5rem] shrink-0 snap-start rounded-panel border p-4 text-left transition active:scale-[0.98] disabled:opacity-45 ${
                active
                  ? 'border-brand-300 bg-white shadow-card'
                  : 'border-white bg-white/65 shadow-ghost hover:bg-white/85'
              }`}
            >
              <span className="flex h-full flex-col gap-1.5">
                <span className="chip h-9 w-9">
                  <PresetIcon preset={preset.id} className="h-[1.125rem] w-[1.125rem]" />
                </span>
                <span className="mt-1 block text-[0.875rem] font-bold leading-tight text-ink">{preset.name}</span>
                <span className="block text-[0.6875rem] leading-snug text-ink-muted">{preset.tagline}</span>
                <span className="mt-auto pt-2 text-[0.625rem] uppercase tracking-[0.14em] text-ink-soft">
                  {preset.bestFor}
                </span>
              </span>

              {active && (
                <span aria-hidden="true" className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-white shadow-brand">
                  <svg viewBox="0 0 24 24" className="h-3 w-3">
                    <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
