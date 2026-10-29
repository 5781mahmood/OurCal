import type { TrackerApi } from '../hooks/useTracker'
import { StreakWeek } from './StreakWeek'

interface StreakBannerProps {
  streak: number
  streakWeek: TrackerApi['streakWeek']
}

export function StreakBanner({ streak, streakWeek }: StreakBannerProps) {
  const flameScale = 1 + Math.min(streak, 30) * 0.008

  return (
    <section className="streak-banner" aria-label="Logging streak">
      <div
        className="streak-flame"
        aria-hidden
        style={{ transform: `scale(${flameScale})` }}
      >
        <svg viewBox="0 0 48 64" width="48" height="64">
          <path
            d="M24 4c-4 12-14 16-14 32 0 11 7 20 14 24 7-4 14-13 14-24 0-16-10-20-14-32z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="streak-copy">
        <p className="streak-label">Daily streak</p>
        <p className="streak-value">
          <span className="streak-count" key={streak}>
            {streak}
          </span>
          <span className="streak-unit">{streak === 1 ? ' day' : ' days'}</span>
        </p>
        <p className="streak-note">Log at least one meal each day to keep it alive.</p>
      </div>
      <StreakWeek days={streakWeek} />
    </section>
  )
}
