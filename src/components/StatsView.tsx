import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { UserProfile } from '../types'
import type { TrackerApi } from '../hooks/useTracker'
import { sumMacros } from '../lib/nutrition'
import { lastNDateKeys, todayKey } from '../lib/dates'
import { macroLevel } from '../lib/macroLevel'

interface StatsViewProps {
  tracker: TrackerApi
  profile: UserProfile
}

function levelColor(level: ReturnType<typeof macroLevel>): string {
  if (level === 'low') return '#c41e3a'
  if (level === 'mid') return '#c76b00'
  return '#1b7f3a'
}

export function StatsView({ tracker, profile }: StatsViewProps) {
  const { state, dailySeries, streak, dayTotals } = tracker

  const weekChart = useMemo(() => {
    return dailySeries.slice(-7).map((d) => ({
      ...d,
      label: format(parseISO(d.date), 'EEE'),
      goal: profile.calorieGoal,
    }))
  }, [dailySeries, profile.calorieGoal])

  const fourteen = useMemo(() => {
    const keys = lastNDateKeys(todayKey(), 14)
    const loggedDays = keys.filter((k) =>
      state.entries.some((e) => e.date === k),
    )
    const all = keys.flatMap((k) => state.entries.filter((e) => e.date === k))
    const totals = sumMacros(all)
    const avgCalories =
      loggedDays.length > 0
        ? Math.round(totals.calories / loggedDays.length)
        : 0
    return {
      loggedDays: loggedDays.length,
      avgCalories,
    }
  }, [state.entries])

  const macroPie = [
    {
      name: 'Protein',
      value: Math.round(dayTotals.protein * 4),
      level: macroLevel(dayTotals.protein, profile.macroGoals.protein),
    },
    {
      name: 'Carbs',
      value: Math.round(dayTotals.carbs * 4),
      level: macroLevel(dayTotals.carbs, profile.macroGoals.carbs),
    },
    {
      name: 'Fat',
      value: Math.round(dayTotals.fat * 9),
      level: macroLevel(dayTotals.fat, profile.macroGoals.fat),
    },
  ].filter((s) => s.value > 0)

  const mealBreakdown = useMemo(() => {
    const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
    const today = todayKey()
    const todayEntries = state.entries.filter((e) => e.date === today)
    return meals.map((meal) => ({
      meal,
      calories: todayEntries
        .filter((e) => e.meal === meal)
        .reduce((s, e) => s + e.calories, 0),
    }))
  }, [state.entries])

  return (
    <div className="stats view-enter">
      <header className="section-head">
        <p className="eyebrow">Insights</p>
        <h1>Your numbers</h1>
        <p className="lede">Charts use only what you logged in this browser.</p>
      </header>

      <dl className="metric-list">
        <div>
          <dt>Logging streak</dt>
          <dd>{streak} days</dd>
        </div>
        <div>
          <dt>14-day average</dt>
          <dd>
            {fourteen.avgCalories || '—'} kcal across {fourteen.loggedDays} logged days
          </dd>
        </div>
        <div>
          <dt>Today vs goal</dt>
          <dd>
            {dayTotals.calories} / {profile.calorieGoal} kcal
          </dd>
        </div>
      </dl>

      <section className="chart-panel">
        <h2>Last 7 days</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekChart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d2d2d7" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <Tooltip
                formatter={(value) => [`${value} kcal`, 'Calories']}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { date?: string } | undefined
                  return row?.date ? format(parseISO(row.date), 'MMM d, yyyy') : ''
                }}
              />
              <Bar dataKey="calories" radius={[2, 2, 0, 0]}>
                {weekChart.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={
                      entry.calories === 0
                        ? '#d2d2d7'
                        : entry.calories > profile.calorieGoal
                          ? '#c41e3a'
                          : '#00656b'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="charts-2">
        <section className="chart-panel">
          <h2>Today’s calories by macro</h2>
          {macroPie.length === 0 ? (
            <p className="empty-meal">Log food today to see this split.</p>
          ) : (
            <div className="chart-wrap pie">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={macroPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {macroPie.map((s) => (
                      <Cell key={s.name} fill={levelColor(s.level)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} kcal`, 'Energy']} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="pie-legend">
                {macroPie.map((s) => (
                  <li key={s.name}>
                    <i style={{ background: levelColor(s.level) }} />
                    {s.name} · {s.value} kcal
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="chart-panel">
          <h2>Today by meal</h2>
          <ul className="meal-stat-list">
            {mealBreakdown.map((m) => (
              <li key={m.meal}>
                <span>{m.meal}</span>
                <div className="mini-track">
                  <div
                    className="mini-fill"
                    style={{
                      width: `${
                        profile.calorieGoal > 0
                          ? Math.min((m.calories / profile.calorieGoal) * 100, 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <strong>{m.calories}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
