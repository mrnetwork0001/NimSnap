import Link from 'next/link'
import PageBackdrop from '@/components/PageBackdrop'
import Wordmark from '@/components/Wordmark'
import Hero from '@/components/landing/Hero'
import MobileNav from '@/components/landing/MobileNav'
import { ClosingCta, Features, HowItWorks, PaymentStory, Styles } from '@/components/landing/Sections'

export default function Home() {
  return (
    <>
      <PageBackdrop />

      <header className="pt-safe sticky top-0 z-40 border-b border-white/60 bg-haze-400/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-[1.125rem] py-3">
          <Wordmark className="h-9 sm:h-10" />

          {/* Inline on desktop, collapsed behind a hamburger on phones so the
              wordmark keeps its room at 360px. */}
          <nav className="hidden items-center gap-6 text-[0.8125rem] font-semibold text-ink-muted sm:flex sm:gap-7">
            <Link href="#how" className="transition hover:text-ink">How it works</Link>
            <Link href="#styles" className="transition hover:text-ink">Styles</Link>
          </nav>
          <MobileNav
            links={[
              { href: '#how', label: 'How it works' },
              { href: '#styles', label: 'Styles' },
            ]}
          />
        </div>
      </header>

      <main>
        <Hero />
        <Features />
        <div id="styles" className="scroll-mt-24">
          <Styles />
        </div>
        <HowItWorks />
        <PaymentStory />
        <ClosingCta />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-10">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/70 pt-6 text-center sm:flex-row sm:text-left">
          <Wordmark className="h-10" />
          <p className="max-w-md text-[0.6875rem] leading-relaxed text-ink-soft">
            NimSnap generates images from photos you upload. Uploads are sent to our AI
            provider to produce your result. MIT open source.
          </p>
        </div>
      </footer>
    </>
  )
}
