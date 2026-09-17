import Link from 'next/link'
import PhoneMock from './PhoneMock'

export default function Hero() {
  return (
    <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-8 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-12 lg:pt-16">
      <div className="animate-fade-up">
        <p className="eyebrow">Pay per shot · no subscription</p>

        <h1 className="mt-5 text-[2.5rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem]">
          Studio photos for{' '}
          <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
            ten cents a shot.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-lg font-medium text-ink/80">
          Your photo, restyled by AI in seconds.
        </p>

        <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
          Upload a selfie, a product or your pet, pick one of eight styles, and pay $0.10
          in NIM - from Nimiq Pay on your phone, or a Nimiq Wallet in any browser. No
          account to create, and no monthly fee for photos you take three times a year.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/app" className="btn-primary">
            Open the studio
          </Link>
          <Link href="#how" className="btn-ghost">
            How it works
          </Link>
        </div>

        <p className="mt-6 flex max-w-lg items-start gap-2 text-xs leading-relaxed text-ink-soft">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Payment settles onchain before anything is generated, and a failed render never
          charges you twice.
        </p>
      </div>

      <div className="animate-fade-up [animation-delay:120ms]">
        <PhoneMock />
      </div>
    </section>
  )
}
