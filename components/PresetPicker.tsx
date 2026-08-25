'use client'

import { PRESETS, type PresetId } from '@/lib/presets'

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
        <h2 className="label-xs">Pick a style</h2>
        <span className="text-[0.6875rem] text-slate-500">Swipe for more</span>
      </div>

      <div
        role="radiogroup"
        aria-label="Style presets"
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
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
              className={`group relative w-[10.5rem] shrink-0 snap-start overflow-hidden rounded-2xl border p-3.5 text-left transition-all active:scale-[0.97] disabled:opacity-40 ${
                active
                  ? 'border-white/40 bg-white/[0.09] shadow-neon'
                  : 'border-white/10 bg-white/[0.035] hover:border-white/20'
              }`}
            >
              {/* Preset identity comes through as a colour wash rather than an image,
                  so the rail stays instant on a cold load. */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 -top-8 h-24 bg-gradient-to-br ${preset.gradient} opacity-25 blur-2xl transition-opacity group-hover:opacity-40 ${
                  active ? 'opacity-50' : ''
                }`}
              />

              <span className="relative flex h-full flex-col gap-1.5">
                <span className="text-2xl leading-none">{preset.emoji}</span>
                <span className="mt-1 block text-sm font-bold leading-tight text-white">
                  {preset.name}
                </span>
                <span className="block text-[0.6875rem] leading-snug text-slate-400">
                  {preset.tagline}
                </span>
                <span className="mt-auto pt-2 text-[0.625rem] uppercase tracking-wide text-slate-500">
                  {preset.bestFor}
                </span>
              </span>

              {active && (
                <span
                  aria-hidden="true"
                  className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-neon-cyan text-ink-900"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                    <path
                      d="M5 13l4 4L19 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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
