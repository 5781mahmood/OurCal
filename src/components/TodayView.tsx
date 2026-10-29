import { useMemo, useState } from 'react'
import type { DiaryEntry, MealType, UserProfile } from '../types'
import { formatDisplayDate, shiftDateKey } from '../lib/dates'
import { balanceIndex } from '../lib/balanceIndex'
import { macroLevel, macroLevelClass } from '../lib/macroLevel'
import { ProgressRing } from './ProgressRing'
import { AddFoodModal } from './AddFoodModal'
import { StreakBanner } from './StreakBanner'
import type { TrackerApi } from '../hooks/useTracker'

const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

interface TodayViewProps {
  tracker: TrackerApi
  profile: UserProfile
}

export function TodayView({ tracker, profile }: TodayViewProps) {
  const {
    selectedDate,
    setSelectedDate,
    dayEntries,
    dayTotals,
    addEntry,
    deleteEntry,
    addCustomFood,
    clearDay,
    state,
    streak,
    streakWeek,
    communityFoods,
    cloudEnabled,
  } = tracker

  const [modalMeal, setModalMeal] = useState<MealType | null>(null)

  const byMeal = useMemo(() => {
    const map: Record<MealType, DiaryEntry[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snack: [],
    }
    for (const e of dayEntries) map[e.meal].push(e)
    return map
  }, [dayEntries])

  const remaining = profile.calorieGoal - dayTotals.calories
  const score = balanceIndex(dayTotals, profile)

  const macros = [
    {
      key: 'protein',
      label: 'Protein',
      value: dayTotals.protein,
      goal: profile.macroGoals.protein,
      unit: 'g',
    },
    {
      key: 'carbs',
      label: 'Carbs',
      value: dayTotals.carbs,
      goal: profile.macroGoals.carbs,
      unit: 'g',
    },
    {
      key: 'fat',
      label: 'Fat',
      value: dayTotals.fat,
      goal: profile.macroGoals.fat,
      unit: 'g',
    },
  ] as const

  return (
    <div className="today view-enter">
      <StreakBanner streak={streak} streakWeek={streakWeek} />

      <header className="day-nav">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setSelectedDate(shiftDateKey(selectedDate, -1))}
          aria-label="Previous day"
        >
          ‹
        </button>
        <div>
          <p className="eyebrow">Diary</p>
          <h1>{formatDisplayDate(selectedDate)}</h1>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setSelectedDate(shiftDateKey(selectedDate, 1))}
          aria-label="Next day"
        >
          ›
        </button>
      </header>

      <div className="balance-strip">
        <p className="balance-label">Balance index</p>
        <p className="balance-value">{score}</p>
        <p className="meta">Single score from calories and macro targets today.</p>
      </div>

      <section className="hero-day">
        <ProgressRing
          value={dayTotals.calories}
          max={profile.calorieGoal}
          label="kcal logged"
          sublabel={
            remaining >= 0
              ? `${remaining} left`
              : `${Math.abs(remaining)} over`
          }
        />
        <div className="macro-bars">
          {macros.map((m) => {
            const pct = m.goal > 0 ? Math.min((m.value / m.goal) * 100, 100) : 0
            const level = macroLevel(m.value, m.goal)
            return (
              <div key={m.key} className="macro-bar">
                <div className="macro-bar-head">
                  <span>{m.label}</span>
                  <span>
                    {Math.round(m.value)}
                    {m.unit} / {m.goal}
                    {m.unit}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${macroLevelClass(level)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          {dayEntries.length > 0 ? (
            <button type="button" className="btn-secondary danger-outline" onClick={clearDay}>
              Clear all food for this day
            </button>
          ) : null}
        </div>
      </section>

      <section className="meals">
        {MEALS.map((meal) => {
          const items = byMeal[meal]
          const mealCals = items.reduce((s, e) => s + e.calories, 0)
          return (
            <article key={meal} className="meal-block">
              <header>
                <div>
                  <h2>{meal}</h2>
                  <p>{mealCals} kcal · {items.length} item{items.length === 1 ? '' : 's'}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalMeal(meal)}
                >
                  Add food
                </button>
              </header>
              {items.length === 0 ? (
                <p className="empty-meal">Nothing logged yet.</p>
              ) : (
                <ul className="entry-list">
                  {items.map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <strong>{entry.name}</strong>
                        <span>
                          {entry.servings}× · P {entry.protein}g · C {entry.carbs}g · F{' '}
                          {entry.fat}g
                        </span>
                      </div>
                      <div className="entry-actions">
                        <em>{entry.calories}</em>
                        <button
                          type="button"
                          className="icon-btn sm"
                          aria-label={`Delete ${entry.name}`}
                          onClick={() => deleteEntry(entry.id)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )
        })}
      </section>

      <AddFoodModal
        open={modalMeal !== null}
        meal={modalMeal ?? 'Breakfast'}
        customFoods={state.customFoods}
        communityFoods={communityFoods}
        shareEnabled={cloudEnabled}
        onClose={() => setModalMeal(null)}
        onAdd={addEntry}
        onSaveCustom={addCustomFood}
      />
    </div>
  )
}
