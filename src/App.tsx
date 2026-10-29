import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { useTracker } from './hooks/useTracker'
import { Onboarding } from './components/Onboarding'
import { TodayView } from './components/TodayView'
import { StatsView } from './components/StatsView'
import { ProfileView } from './components/ProfileView'
import { CommunityView } from './components/CommunityView'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import type { ViewId } from './types'
import './index.css'

const NAV: { id: ViewId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'stats', label: 'Stats' },
  { id: 'community', label: 'People' },
  { id: 'profile', label: 'Profile' },
]

function StatusToasts({
  success,
  error,
  onDismiss,
}: {
  success: string | null
  error: string | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!success && !error) return
    const t = window.setTimeout(onDismiss, 4200)
    return () => window.clearTimeout(t)
  }, [success, error, onDismiss])

  if (!success && !error) return null
  return (
    <div className="toast-stack" role="status">
      {success ? <p className="toast success">{success}</p> : null}
      {error ? <p className="toast error">{error}</p> : null}
    </div>
  )
}

function TrackerApp() {
  const tracker = useTracker()
  const [view, setView] = useState<ViewId>('today')
  const [params] = useSearchParams()

  const inviteHandled = useRef<string | null>(null)

  useEffect(() => {
    const u = params.get('u')
    if (!u || !tracker.profile || inviteHandled.current === u) return
    inviteHandled.current = u
    const username = u.replace('@', '').toLowerCase()
    if (username === tracker.profile.username) return
    tracker.addFriend({
      username,
      displayName: username,
      avatarUrl: '',
      addedAt: new Date().toISOString(),
    })
    setView('community')
  }, [params, tracker.profile, tracker])

  if (!tracker.profile) {
    return (
      <>
        <Onboarding onComplete={tracker.setProfile} />
        <StatusToasts
          success={tracker.statusMessage}
          error={tracker.errorMessage}
          onDismiss={tracker.dismissMessages}
        />
      </>
    )
  }

  return (
    <div className="app-shell">
      <aside className="brand-rail" aria-label="OurCal">
        <a href="/" className="brand-mark">
          <span className="brand-word">OurCal</span>
          <span className="brand-tag">calorie diary</span>
        </a>
        <nav className="side-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'nav-link active' : 'nav-link'}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        {view === 'today' ? (
          <TodayView tracker={tracker} profile={tracker.profile} />
        ) : null}
        {view === 'stats' ? (
          <StatsView tracker={tracker} profile={tracker.profile} />
        ) : null}
        {view === 'community' ? (
          <CommunityView tracker={tracker} profile={tracker.profile} />
        ) : null}
        {view === 'profile' ? (
          <ProfileView tracker={tracker} profile={tracker.profile} />
        ) : null}
      </main>

      <nav className="mobile-nav" aria-label="Primary">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <StatusToasts
        success={tracker.statusMessage}
        error={tracker.errorMessage}
        onDismiss={tracker.dismissMessages}
      />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<TrackerApp />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
