import Link from 'next/link'
import PageBackdrop from '@/components/PageBackdrop'
import Wordmark from '@/components/Wordmark'
import Hero from '@/components/landing/Hero'
import LiveStats from '@/components/landing/LiveStats'
import MobileNav from '@/components/landing/MobileNav'
import SiteFooter from '@/components/SiteFooter'
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
        <LiveStats />
        <Features />
        <div id="styles" className="scroll-mt-24">
          <Styles />
        </div>
        <HowItWorks />
        <PaymentStory />
        <ClosingCta />
      </main>

      <SiteFooter />
    </>
  )
}
