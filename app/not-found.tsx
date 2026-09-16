import Link from 'next/link'
import PageBackdrop from '@/components/PageBackdrop'
import Wordmark from '@/components/Wordmark'

export default function NotFound() {
  return (
    <>
      <PageBackdrop />
      <main className="grid min-h-[100dvh] place-items-center px-6">
        <div className="card w-full max-w-md px-8 py-10 text-center">
          <div className="flex justify-center">
            <Wordmark />
          </div>
          <p className="eyebrow mt-6">404</p>
          <h1 className="mt-3 text-[1.5rem] leading-tight text-ink">
            There is nothing at this address
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            The page you were looking for does not exist.
          </p>
          <Link href="/app" className="btn-primary mt-7 w-full">
            Open the studio
          </Link>
        </div>
      </main>
    </>
  )
}
