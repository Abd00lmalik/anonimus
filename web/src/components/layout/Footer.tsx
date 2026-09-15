import { Link } from 'react-router-dom'
import { Logo } from '../ui/Logo'

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: 'var(--space-16) var(--space-8) var(--space-8)',
        background: 'var(--bg-primary)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-12)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Logo size={24} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              ANONIMUS
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Privacy-preserving humanity verification on Midnight Network.
          </p>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Protocol
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Link to="/how-it-works" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>How it works</Link>
            <Link to="/campaigns" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Campaigns</Link>
            <Link to="/developers" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Developers</Link>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Resources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <a href="https://github.com/Abd00lmalik/anonimus" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>GitHub</a>
            <a href="https://docs.midnight.network" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Midnight Docs</a>
            <a href="/privacy" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Privacy Policy</a>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            Network
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Midnight PREPROD</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Network ID: preprod</span>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          marginTop: 'var(--space-12)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          &copy; 2026 Anonimus. Open source.
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Built on Midnight Network
        </span>
      </div>
    </footer>
  )
}
