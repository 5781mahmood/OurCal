import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'

export function NotFoundPage() {
  return (
    <div className="marketing">
      <SiteHeader />
      <main className="not-found">
        <p className="hero-kicker">404</p>
        <h1>This page is not in the diary.</h1>
        <p className="hero-body">
          The link may be old or mistyped. Head back to the product page or open the
          app to keep logging.
        </p>
        <div className="hero-actions">
          <Link to="/" className="btn-primary">
            Home
          </Link>
          <Link to="/app" className="btn-secondary">
            Open app
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
