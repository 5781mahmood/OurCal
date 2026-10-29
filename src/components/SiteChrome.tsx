import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('menu-open', open)
    return () => document.body.classList.remove('menu-open')
  }, [open])

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-logo" onClick={() => setOpen(false)}>
          OurCal
        </Link>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        <nav id="site-menu" className={open ? 'site-nav open' : 'site-nav'}>
          <Link to="/#product" onClick={() => setOpen(false)}>
            Product
          </Link>
          <Link to="/#balance" onClick={() => setOpen(false)}>
            Balance index
          </Link>
          <Link to="/app" onClick={() => setOpen(false)}>
            Open app
          </Link>
          <a href="mailto:hello@ourcal.app" onClick={() => setOpen(false)}>
            hello@ourcal.app
          </a>
          <a href="tel:+19055550192" onClick={() => setOpen(false)}>
            +1 (905) 555-0192
          </a>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-brand">
          <Link to="/">OurCal</Link>
        </p>
        <nav className="site-footer-nav" aria-label="Footer">
          <Link to="/app">Open app</Link>
          <Link to="/#product">Product</Link>
          <Link to="/#balance">Balance index</Link>
          <a href="mailto:hello@ourcal.app">hello@ourcal.app</a>
          <a href="tel:+19055550192">+1 (905) 555-0192</a>
        </nav>
        <p className="site-footer-copy">© {year} OurCal. Built for daily consistency.</p>
      </div>
    </footer>
  )
}
