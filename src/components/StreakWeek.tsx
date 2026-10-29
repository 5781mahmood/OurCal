import type { CSSProperties } from 'react'
import { format, parseISO } from 'date-fns'
import { todayKey } from '../lib/dates'

export interface StreakDay {
  date: string
  logged: boolean
}

interface StreakWeekProps {
  days: StreakDay[]
  animate?: boolean
  className?: string
}

export function StreakWeek({ days, animate = true, className = '' }: StreakWeekProps) {
  const today = todayKey()

  return (
    <ol className={`streak-week ${animate ? 'is-animated' : ''} ${className}`.trim()}>
      {days.map((d, index) => {
        const isToday = d.date === today
        const classes = [
          'streak-day',
          d.logged ? 'on' : '',
          isToday ? 'is-today' : '',
          d.logged && isToday ? 'just-logged' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <li
            key={d.date}
            className={classes}
            style={animate ? ({ '--day-i': index } as CSSProperties) : undefined}
            title={format(parseISO(d.date), 'EEE MMM d')}
          >
            <span className="streak-day-label">
              {format(parseISO(d.date), 'EEEEE')}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Static demo week for marketing (Mon–Sun labels, fixed logged pattern). */
export function DemoStreakWeek() {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const logged = [true, true, true, true, false, false, false]
  return (
    <ol className="streak-week is-animated">
      {labels.map((label, index) => {
        const on = logged[index]
        const isToday = index === 3
        const classes = [
          'streak-day',
          on ? 'on' : '',
          isToday ? 'is-today' : '',
          on && isToday ? 'just-logged' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <li
            key={`${label}-${index}`}
            className={classes}
            style={{ '--day-i': index } as CSSProperties}
          >
            <span className="streak-day-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
