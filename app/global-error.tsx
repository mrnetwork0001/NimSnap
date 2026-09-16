'use client'

/**
 * Last-resort boundary: catches throws in the root layout itself, where
 * app/error.tsx cannot help because the layout never mounted. It has to render
 * its own <html>/<body>, and it cannot rely on the app's CSS having loaded, so
 * the styles here are inline on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#EDF2F7',
          color: '#17213D',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '26rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>NimSnap could not start</h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#74819A' }}>
            Something failed before the app could load. Any shot you already paid for is safe and
            will still be waiting.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              border: 0,
              borderRadius: '999px',
              padding: '0.875rem 1.75rem',
              background: 'linear-gradient(100deg,#5C7DE2,#4262D4 48%,#2948B5)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
