import { NextPageContext } from 'next'
import Link from 'next/link'

/**
 * Custom error page for Pages Router fallback
 * This handles errors that occur outside the App Router
 */
function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
    }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 'bold', color: '#dc2626' }}>
        {statusCode || 'Hata'}
      </h1>
      <p style={{ marginTop: '1rem', color: '#4b5563' }}>
        {statusCode === 404
          ? 'Sayfa bulunamadi'
          : 'Bir hata olustu'}
      </p>
      <Link
        href="/"
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#2563eb',
          color: 'white',
          borderRadius: '0.5rem',
          textDecoration: 'none',
        }}
      >
        Ana Sayfaya Don
      </Link>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
