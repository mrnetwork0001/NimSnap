import React from 'react'
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from 'remotion'

/**
 * Shared furniture for the NimSnap demo.
 *
 * The palette is the app's own, which matters more than it sounds: NimSnap is a
 * pale, airy product, and a dark demo reel would sell something that does not
 * exist. Everything here is light-first.
 */

export const GROUND = '#EDF2F7'
export const INK = '#17213D'
export const MUTED = '#74819A'
export const SOFT = '#94A0B5'
export const BRAND = '#4262D4'
export const BRAND_LIGHT = '#5C7DE2'
export const BRAND_DEEP = '#2948B5'
export const WHITE = '#FFFFFF'

export const SANS = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif'
export const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace'

export const BRAND_GRADIENT =
  'linear-gradient(rgba(255,255,255,.28), rgba(255,255,255,0) 52%), linear-gradient(100deg,#5C7DE2 0%,#4262D4 48%,#2948B5 100%)'

/** The page wash plus three slow colour blooms, matching the live site. */
export const Backdrop: React.FC<{ tone?: string }> = ({ tone }) => {
  const f = useCurrentFrame()
  const drift = (i: number) => Math.sin((f + i * 90) / 120) * 22
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(165deg,#F5F9FC 0%,#E8F1F7 38%,#EEF4F8 68%,#E4EEF4 100%)',
      }}
    >
      {[
        ['-12%', '-10%', '60%', '55%', tone ?? 'rgba(127,158,224,.30)'],
        ['62%', '4%', '52%', '48%', 'rgba(100,196,204,.24)'],
        ['18%', '58%', '58%', '46%', 'rgba(158,178,229,.22)'],
      ].map(([left, top, w, h, c], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: left as string,
            top: top as string,
            width: w as string,
            height: h as string,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${c} 0%, transparent 65%)`,
            transform: `translate(${drift(i)}px, ${drift(i + 1) * 0.6}px)`,
          }}
        />
      ))}
    </AbsoluteFill>
  )
}

/** Rise-and-fade entrance, the one motion used everywhere so cuts feel of a piece. */
export const useRise = (delay = 0, distance = 24) => {
  const f = useCurrentFrame()
  const p = interpolate(f, [delay, delay + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const eased = 1 - Math.pow(1 - p, 3)
  return { opacity: eased, transform: `translateY(${(1 - eased) * distance}px)` }
}

export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => (
  <div
    style={{
      ...useRise(delay, 14),
      fontFamily: MONO,
      fontSize: 19,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: BRAND,
      fontWeight: 700,
    }}
  >
    {children}
  </div>
)

export const Headline: React.FC<{
  children: React.ReactNode
  delay?: number
  size?: number
}> = ({ children, delay = 0, size = 70 }) => (
  <div
    style={{
      ...useRise(delay, 26),
      fontFamily: SANS,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: '-0.035em',
      fontWeight: 600,
      color: INK,
    }}
  >
    {children}
  </div>
)

export const Body: React.FC<{ children: React.ReactNode; delay?: number; size?: number }> = ({
  children,
  delay = 0,
  size = 30,
}) => (
  <div
    style={{
      ...useRise(delay, 18),
      fontFamily: SANS,
      fontSize: size,
      lineHeight: 1.55,
      color: MUTED,
      maxWidth: 900,
    }}
  >
    {children}
  </div>
)

/** Brand-blue accent inside a headline. */
export const Accent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      background: 'linear-gradient(90deg,#5C7DE2,#2948B5)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}
  >
    {children}
  </span>
)

/** A desktop browser frame around captured footage. */
export const Screen: React.FC<{
  src: string
  delay?: number
  start?: number
  width?: number
  label?: string
}> = ({ src, delay = 0, start = 0, width = 1220, label = 'nimsnap.xyz' }) => {
  const r = useRise(delay, 34)
  return (
    <div
      style={{
        ...r,
        width,
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.9)',
        boxShadow: '0 60px 130px -50px rgba(35,52,112,.55)',
        background: WHITE,
      }}
    >
      <div
        style={{
          height: 42,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
          background: '#F7FAFC',
          borderBottom: '1px solid rgba(23,33,61,.07)',
        }}
      >
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c, opacity: 0.9 }} />
        ))}
        <span style={{ marginLeft: 16, fontFamily: MONO, fontSize: 15, color: SOFT }}>{label}</span>
      </div>
      <OffthreadVideo
        src={staticFile(`clips/${src}.mp4`)}
        startFrom={start}
        muted
        style={{ width: '100%', display: 'block' }}
      />
    </div>
  )
}

/** A phone body around portrait footage - where a Mini App actually runs. */
export const Phone: React.FC<{
  src: string
  delay?: number
  start?: number
  height?: number
}> = ({ src, delay = 0, start = 0, height = 880 }) => {
  const r = useRise(delay, 34)
  const width = Math.round((height * 430) / 932)
  return (
    <div
      style={{
        ...r,
        width: width + 22,
        height: height + 22,
        borderRadius: 54,
        padding: 11,
        background: 'linear-gradient(160deg,#fff,#dbe4ee)',
        boxShadow: '0 70px 150px -50px rgba(35,52,112,.6)',
      }}
    >
      <div
        style={{
          width,
          height,
          borderRadius: 44,
          overflow: 'hidden',
          background: GROUND,
          position: 'relative',
        }}
      >
        <OffthreadVideo
          src={staticFile(`clips/${src}.mp4`)}
          startFrom={start}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    </div>
  )
}

/** The NimSnap mark: four corner brackets around an N. */
export const Mark: React.FC<{ size?: number; color?: string }> = ({ size = 96, color = WHITE }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
    <g stroke={color} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17V11a4 4 0 014-4h6" />
      <path d="M31 7h6a4 4 0 014 4v6" />
      <path d="M41 31v6a4 4 0 01-4 4h-6" />
      <path d="M17 41h-6a4 4 0 01-4-4v-6" />
    </g>
    <path d="M17.5 33V15h3.6l9.4 12V15h3.6v18h-3.6l-9.4-12v12z" fill={color} />
  </svg>
)

export const Lockup: React.FC<{ height?: number; delay?: number }> = ({ height = 108, delay = 0 }) => {
  const r = useRise(delay, 20)
  return (
    <div style={{ ...r, display: 'flex', alignItems: 'center', gap: 26 }}>
      <div
        style={{
          width: height,
          height,
          borderRadius: height * 0.24,
          background: BRAND_GRADIENT,
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 22px 48px -18px rgba(41,72,181,.6)',
        }}
      >
        <Mark size={height * 0.56} />
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: height * 0.62,
          fontWeight: 800,
          letterSpacing: '-0.035em',
          color: INK,
        }}
      >
        NimSnap
      </div>
    </div>
  )
}

/** A soft white card, the shape the whole product is built from. */
export const Card: React.FC<{
  children: React.ReactNode
  delay?: number
  pad?: number
  width?: number | string
}> = ({ children, delay = 0, pad = 34, width }) => (
  <div
    style={{
      ...useRise(delay, 22),
      width,
      background: 'rgba(255,255,255,.72)',
      border: '1px solid #fff',
      borderRadius: 30,
      padding: pad,
      boxShadow: '0 24px 60px -32px rgba(35,52,112,.35)',
      backdropFilter: 'blur(14px)',
    }}
  >
    {children}
  </div>
)

export const Pill: React.FC<{ children: React.ReactNode; delay?: number; tone?: string }> = ({
  children,
  delay = 0,
  tone = BRAND,
}) => (
  <span
    style={{
      ...useRise(delay, 12),
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: MONO,
      fontSize: 20,
      fontWeight: 700,
      color: tone,
      background: 'rgba(255,255,255,.8)',
      border: '1px solid #fff',
      borderRadius: 999,
      padding: '11px 20px',
      boxShadow: '0 6px 18px -10px rgba(70,80,180,.35)',
    }}
  >
    {children}
  </span>
)

/** Counts a number up, for figures that should feel measured rather than stated. */
export const Counter: React.FC<{
  to: number
  delay?: number
  dur?: number
  prefix?: string
  suffix?: string
  decimals?: number
}> = ({ to, delay = 0, dur = 40, prefix = '', suffix = '', decimals = 0 }) => {
  const f = useCurrentFrame()
  const p = interpolate(f, [delay, delay + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const eased = 1 - Math.pow(1 - p, 3)
  return (
    <span>
      {prefix}
      {(to * eased).toFixed(decimals)}
      {suffix}
    </span>
  )
}
