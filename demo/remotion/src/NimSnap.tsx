import React from 'react'
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import {
  Accent, Backdrop, BRAND, BRAND_GRADIENT, Body, Card, Counter, Eyebrow, Headline, INK,
  Lockup, MONO, MUTED, Phone, Pill, SANS, SOFT, Screen, WHITE, useRise,
} from './ui'

const FPS = 30
const s = (sec: number) => Math.round(sec * FPS)

/**
 * Scene lengths come from the measured narration in vo/*.mp3 plus a little air,
 * so picture and voice never drift. Total lands just under 2:30.
 */
const SCENES = [
  { id: 'v00', dur: s(4.0) },
  { id: 'v01', dur: s(11.0) },
  { id: 'v02', dur: s(9.6) },
  { id: 'v03', dur: s(12.3) },
  { id: 'v04', dur: s(14.3) },
  { id: 'v05', dur: s(10.3) },
  { id: 'v06', dur: s(11.0) },
  { id: 'v07', dur: s(17.5) },
  { id: 'v08', dur: s(29.6) },
  { id: 'v09', dur: s(17.0) },
  { id: 'v10', dur: s(11.6) },
]
const STARTS = SCENES.reduce<number[]>(
  (a, sc, i) => [...a, i === 0 ? 0 : a[i - 1] + SCENES[i - 1].dur],
  [],
)
export const NIMSNAP_DURATION = SCENES.reduce((n, sc) => n + sc.dur, 0)

const Pad: React.FC<{ children: React.ReactNode; center?: boolean }> = ({ children, center }) => (
  <AbsoluteFill
    style={{
      padding: '92px 120px',
      justifyContent: 'center',
      alignItems: center ? 'center' : 'flex-start',
    }}
  >
    {children}
  </AbsoluteFill>
)

/** Fade every scene in and out so cuts never snap. */
const Scene: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame()
  const o = Math.min(
    interpolate(f, [0, 9], [0, 1], { extrapolateRight: 'clamp' }),
    interpolate(f, [dur - 10, dur - 1], [1, 0], { extrapolateLeft: 'clamp' }),
  )
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
}

/* 00 - title */
const S0: React.FC = () => (
  <>
    <Backdrop />
    <Pad center>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34 }}>
        <Lockup height={112} />
        <div
          style={{
            ...useRise(10),
            fontFamily: SANS,
            fontSize: 38,
            color: MUTED,
            letterSpacing: '-0.01em',
          }}
        >
          Studio photos for ten cents a shot
        </div>
      </div>
    </Pad>
  </>
)

/* 01 - the problem: subscriptions */
const S1: React.FC = () => (
  <>
    <Backdrop />
    <Pad>
      <div style={{ display: 'flex', gap: 80, alignItems: 'center', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>The problem</Eyebrow>
          <div style={{ height: 24 }} />
          <Headline delay={6} size={66}>
            Eleven months you
            <br />
            never use.
          </Headline>
          <div style={{ height: 26 }} />
          <Body delay={16} size={29}>
            Every AI photo tool is a subscription. Most people need three headshots a year.
          </Body>
        </div>
        <div style={{ width: 620, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            ['Remini', '$29 / month', 14],
            ['Aragon', '$35 one-off bundle', 21],
            ['HeadshotPro', '$29 / month', 28],
            ['Lensa', '$35 / year + packs', 35],
          ].map(([name, price, d], i) => (
            <div
              key={i}
              style={{
                ...useRise(d as number, 18),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,.7)',
                border: '1px solid #fff',
                borderRadius: 18,
                padding: '24px 30px',
                boxShadow: '0 16px 40px -28px rgba(35,52,112,.4)',
              }}
            >
              <span style={{ fontFamily: SANS, fontSize: 27, fontWeight: 600, color: INK }}>
                {name as string}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 23, color: SOFT }}>{price as string}</span>
            </div>
          ))}
          <div
            style={{
              ...useRise(44, 18),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: BRAND_GRADIENT,
              borderRadius: 18,
              padding: '26px 30px',
              boxShadow: '0 22px 50px -22px rgba(41,72,181,.6)',
            }}
          >
            <span style={{ fontFamily: SANS, fontSize: 28, fontWeight: 700, color: WHITE }}>
              NimSnap
            </span>
            <span style={{ fontFamily: MONO, fontSize: 25, fontWeight: 700, color: WHITE }}>
              $0.10 / photo
            </span>
          </div>
        </div>
      </div>
    </Pad>
  </>
)

/* 02 - the landing page */
const S2: React.FC = () => (
  <>
    <Backdrop />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Screen src="landing" width={1330} delay={4} />
    </AbsoluteFill>
    <AbsoluteFill style={{ padding: '70px 110px', pointerEvents: 'none' }}>
      <div style={{ display: 'flex', gap: 14 }}>
        <Pill delay={24}>No account</Pill>
        <Pill delay={30}>No subscription</Pill>
        <Pill delay={36}>Nothing to cancel</Pill>
      </div>
    </AbsoluteFill>
  </>
)

/* 03 - the eight styles, on a phone */
const S3: React.FC = () => (
  <>
    <Backdrop />
    <Pad>
      <div style={{ display: 'flex', gap: 90, alignItems: 'center', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Pick a style</Eyebrow>
          <div style={{ height: 24 }} />
          <Headline delay={6} size={62}>
            Eight presets,
            <br />
            <Accent>tuned per subject.</Accent>
          </Headline>
          <div style={{ height: 34 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {[
              ['Executive Portrait', 'Selfies'],
              ['Cyberpunk Hero', 'Avatars'],
              ['E-Commerce Studio', 'Products'],
              ['Anime Portrait', 'Selfies, pets'],
              ['Pet Portrait', 'Dogs, cats'],
            ].map(([n, f], i) => (
              <div
                key={i}
                style={{
                  ...useRise(18 + i * 6, 14),
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 18,
                }}
              >
                <span style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: INK }}>
                  {n as string}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 20, color: SOFT }}>{f as string}</span>
              </div>
            ))}
          </div>
        </div>
        <Phone src="styles" height={860} delay={8} />
      </div>
    </Pad>
  </>
)

/* 04 - the two that must not change the subject */
const S4: React.FC = () => (
  <>
    <Backdrop />
    <Pad>
      <div style={{ width: '100%' }}>
        <Eyebrow>Where the subject must not change</Eyebrow>
        <div style={{ height: 24 }} />
        <Headline delay={5} size={60}>
          A restored photo of <Accent>someone else</Accent> is worthless.
        </Headline>
        <div style={{ height: 46 }} />
        <div style={{ display: 'flex', gap: 34 }}>
          {[
            ['Restore & Enhance', '0.28', 'Repairs the damage. Keeps the person, the clothing, the era - and does not colourise a black-and-white print.', 16],
            ['Passport Photo', '0.34', 'Changes the background, the lighting and the framing. Leaves the face exactly as it is: no smoothing, no slimming, no de-aging.', 26],
          ].map(([name, drift, body, d], i) => (
            <Card key={i} delay={d as number} pad={40} width={720}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: SANS, fontSize: 34, fontWeight: 700, color: INK }}>
                  {name as string}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 22, color: BRAND, fontWeight: 700 }}>
                  drift {drift as string}
                </span>
              </div>
              <div style={{ height: 18 }} />
              <div style={{ fontFamily: SANS, fontSize: 25, lineHeight: 1.5, color: MUTED }}>
                {body as string}
              </div>
            </Card>
          ))}
        </div>
        <div style={{ height: 34 }} />
        <Body delay={44} size={26}>
          Every other preset is allowed to reinterpret. These two are not, and their settings say so.
        </Body>
      </div>
    </Pad>
  </>
)

/* 05 - why Nimiq */
const S5: React.FC = () => (
  <>
    <Backdrop />
    <Pad center>
      <div style={{ textAlign: 'center', maxWidth: 1400 }}>
        <Eyebrow>Why a Nimiq Mini App</Eyebrow>
        <div style={{ height: 28 }} />
        <Headline delay={6} size={68}>
          Ten cents only works where
          <br />
          <Accent>ten cents survives the fee.</Accent>
        </Headline>
        <div style={{ height: 46 }} />
        <div style={{ display: 'flex', gap: 22, justifyContent: 'center' }}>
          {[
            ['Card payment', '~$0.30 + 2.9%', 'more than the product costs', 18],
            ['Most chains', 'gas > the payment', 'economically impossible', 26],
            ['Nimiq', '$0.10 arrives as $0.10', 'the business model works', 34],
          ].map(([rail, fee, note, d], i) => (
            <Card key={i} delay={d as number} pad={32} width={420}>
              <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '.14em', textTransform: 'uppercase', color: i === 2 ? BRAND : SOFT, fontWeight: 700 }}>
                {rail as string}
              </div>
              <div style={{ height: 16 }} />
              <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 700, color: INK }}>
                {fee as string}
              </div>
              <div style={{ height: 10 }} />
              <div style={{ fontFamily: SANS, fontSize: 21, color: MUTED }}>{note as string}</div>
            </Card>
          ))}
        </div>
      </div>
    </Pad>
  </>
)

/* 06 - no connect step */
const S6: React.FC = () => (
  <>
    <Backdrop />
    <Pad>
      <div style={{ display: 'flex', gap: 90, alignItems: 'center', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Inside Nimiq Pay</Eyebrow>
          <div style={{ height: 24 }} />
          <Headline delay={6} size={62}>
            There is no
            <br />
            <Accent>connect wallet</Accent> step.
          </Headline>
          <div style={{ height: 28 }} />
          <Body delay={16} size={28}>
            The app runs inside the wallet, so the user is already there. It hands the host a
            transaction, and Nimiq Pay draws its own confirmation sheet.
          </Body>
          <div style={{ height: 30 }} />
          <Card delay={26} pad={30} width={720}>
            <div style={{ fontFamily: MONO, fontSize: 21, lineHeight: 1.8, color: INK }}>
              <div style={{ color: SOFT }}>const nimiq = await init()</div>
              <div>await nimiq.sendBasicTransactionWithData({'{'}</div>
              <div style={{ paddingLeft: 30 }}>recipient: <span style={{ color: BRAND }}>NIM_TREASURY</span>,</div>
              <div style={{ paddingLeft: 30 }}>value: <span style={{ color: BRAND }}>quote.lunas</span>,</div>
              <div style={{ paddingLeft: 30 }}>data: <span style={{ color: BRAND }}>orderId</span>,</div>
              <div>{'}'})</div>
            </div>
          </Card>
        </div>
        <Phone src="upload" height={840} delay={10} />
      </div>
    </Pad>
  </>
)

/* 07 - verification */
const S7: React.FC = () => (
  <>
    <Backdrop />
    <Pad>
      <div style={{ width: '100%' }}>
        <Eyebrow>Paid first, generated second</Eyebrow>
        <div style={{ height: 24 }} />
        <Headline delay={5} size={62}>
          We never take the
          <br />
          <Accent>client&rsquo;s word for it.</Accent>
        </Headline>
        <div style={{ height: 44 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, maxWidth: 1420 }}>
          {[
            ['1', 'Order minted', 'a single-use id, planted in the transaction', 16],
            ['2', 'Payment confirmed', 'Nimiq Pay signs; the user approves', 24],
            ['3', 'Chain read by the server', 'finds that id, checks the amount, ignores the client', 32],
            ['4', 'Only now, the model runs', 'nothing is spent before the money lands', 40],
          ].map(([n, title, sub, d], i) => (
            <div
              key={i}
              style={{
                ...useRise(d as number, 16),
                display: 'flex',
                alignItems: 'center',
                gap: 26,
                background: i === 2 ? 'rgba(66,98,212,.08)' : 'rgba(255,255,255,.7)',
                border: `1px solid ${i === 2 ? 'rgba(66,98,212,.3)' : '#fff'}`,
                borderRadius: 20,
                padding: '26px 34px',
              }}
            >
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 99,
                  background: BRAND_GRADIENT,
                  color: WHITE,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: SANS,
                  fontSize: 23,
                  fontWeight: 700,
                }}
              >
                {n as string}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: INK, width: 400 }}>
                {title as string}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 22, color: MUTED }}>{sub as string}</span>
            </div>
          ))}
        </div>
      </div>
    </Pad>
  </>
)

/* 08 - the real payment (your iPhone footage) */
const S8: React.FC = () => (
  <>
    <Backdrop />
    <Pad>
      <div style={{ display: 'flex', gap: 90, alignItems: 'center', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Live on Nimiq mainnet</Eyebrow>
          <div style={{ height: 24 }} />
          <Headline delay={6} size={64}>
            <Counter to={260.24} delay={14} dur={58} decimals={2} /> NIM
          </Headline>
          <div style={{ height: 20 }} />
          <Body delay={26} size={29}>
            A real payment, from a real wallet, on the live network. The server verifies it and the
            photo comes back.
          </Body>
          <div style={{ height: 30 }} />
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Pill delay={34}>$0.10 at the live rate</Pill>
            <Pill delay={40}>order id on chain</Pill>
          </div>
        </div>
        <Phone src="phone-pay" height={880} delay={8} />
      </div>
    </Pad>
  </>
)

/* 09 - explorer verification (your iPhone footage) */
const S9: React.FC = () => (
  <>
    <Backdrop />
    <Pad>
      <div style={{ display: 'flex', gap: 90, alignItems: 'center', width: '100%' }}>
        <Phone src="phone-explorer" height={880} delay={8} />
        <div style={{ flex: 1 }}>
          <Eyebrow>Check it yourself</Eyebrow>
          <div style={{ height: 24 }} />
          <Headline delay={6} size={58}>
            Every shot links to
            <br />
            <Accent>its own transaction.</Accent>
          </Headline>
          <div style={{ height: 28 }} />
          <Body delay={18} size={28}>
            Same amount, same order id, same block - on a public explorer, not on our word.
          </Body>
          <div style={{ height: 28 }} />
          <Card delay={28} pad={28} width={760}>
            <div style={{ fontFamily: MONO, fontSize: 20, lineHeight: 1.9, color: INK }}>
              <div><span style={{ color: SOFT }}>value</span>  260.24047 NIM</div>
              <div><span style={{ color: SOFT }}>to   </span>  NQ38 XNPD 6KN6 &hellip; T8NG J4P2</div>
              <div><span style={{ color: SOFT }}>data </span>  37306362656165356666376636316138</div>
              <div><span style={{ color: BRAND }}>utf8 </span>  70cbeae5ff7f61a8  <span style={{ color: SOFT }}>&larr; the order id</span></div>
              <div><span style={{ color: SOFT }}>block</span>  61780517</div>
            </div>
          </Card>
        </div>
      </div>
    </Pad>
  </>
)

/* 10 - close */
const S10: React.FC = () => (
  <>
    <Backdrop />
    <Pad center>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
        <Lockup height={104} />
        <div
          style={{
            ...useRise(12),
            fontFamily: SANS,
            fontSize: 40,
            color: MUTED,
            textAlign: 'center',
            lineHeight: 1.35,
          }}
        >
          Eight styles. Ten cents a shot.
          <br />
          Verified before you are charged.
        </div>
        <div style={{ ...useRise(24), display: 'flex', gap: 14 }}>
          <Pill>nimsnap.xyz</Pill>
          <Pill>MIT open source</Pill>
        </div>
      </div>
    </Pad>
  </>
)

const BODIES = [S0, S1, S2, S3, S4, S5, S6, S7, S8, S9, S10]

export const NimSnap: React.FC = () => (
  <AbsoluteFill style={{ background: '#EDF2F7' }}>
    {SCENES.map((sc, i) => {
      const Body_ = BODIES[i]
      return (
        <Sequence key={sc.id} from={STARTS[i]} durationInFrames={sc.dur}>
          <Scene dur={sc.dur}>
            <Body_ />
          </Scene>
          <Audio src={staticFile(`vo/${sc.id}.mp3`)} />
        </Sequence>
      )
    })}
  </AbsoluteFill>
)
