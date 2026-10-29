import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { FoodItem, MealType } from '../types'
import { searchFoods } from '../data/foods'

interface AddFoodModalProps {
  open: boolean
  meal: MealType
  customFoods: FoodItem[]
  communityFoods: FoodItem[]
  shareEnabled: boolean
  onClose: () => void
  onAdd: (payload: {
    meal: MealType
    name: string
    servings: number
    calories: number
    protein: number
    carbs: number
    fat: number
  }) => void
  onSaveCustom: (
    food: Omit<FoodItem, 'id'>,
    options?: { shareGlobally?: boolean },
  ) => Promise<FoodItem>
}

type Tab = 'search' | 'custom'

export function AddFoodModal({
  open,
  meal,
  customFoods,
  communityFoods,
  shareEnabled,
  onClose,
  onAdd,
  onSaveCustom,
}: AddFoodModalProps) {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [servings, setServings] = useState('1')
  const [shareGlobally, setShareGlobally] = useState(true)
  const [formError, setFormError] = useState('')
  const [custom, setCustom] = useState({
    name: '',
    servingLabel: '1 serving',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  })

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setTab('search')
    setQuery('')
    setSelected(null)
    setServings('1')
    setFormError('')
  }, [open, meal])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(
    () => searchFoods(query, customFoods, communityFoods),
    [query, customFoods, communityFoods],
  )

  if (!open) return null

  function submitSelected(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    const s = Number(servings)
    if (!Number.isFinite(s) || s <= 0) {
      setFormError('Enter a valid serving amount.')
      return
    }
    onAdd({
      meal,
      name: selected.name,
      servings: s,
      calories: selected.calories,
      protein: selected.protein,
      carbs: selected.carbs,
      fat: selected.fat,
    })
    onClose()
  }

  async function submitCustom(e: FormEvent) {
    e.preventDefault()
    const calories = Number(custom.calories)
    const protein = Number(custom.protein || 0)
    const carbs = Number(custom.carbs || 0)
    const fat = Number(custom.fat || 0)
    if (!custom.name.trim() || !Number.isFinite(calories) || calories < 0) {
      setFormError('Food name and calories are required.')
      return
    }

    const saved = await onSaveCustom(
      {
        name: custom.name.trim(),
        servingLabel: custom.servingLabel.trim() || '1 serving',
        calories,
        protein,
        carbs,
        fat,
      },
      { shareGlobally: shareEnabled && shareGlobally },
    )

    onAdd({
      meal,
      name: saved.name,
      servings: 1,
      calories: saved.calories,
      protein: saved.protein,
      carbs: saved.carbs,
      fat: saved.fat,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Add to ${meal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="eyebrow">Add food</p>
            <h2>{meal}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="tabs">
          <button
            type="button"
            className={tab === 'search' ? 'active' : ''}
            onClick={() => setTab('search')}
          >
            Search
          </button>
          <button
            type="button"
            className={tab === 'custom' ? 'active' : ''}
            onClick={() => setTab('custom')}
          >
            Custom
          </button>
        </div>

        {tab === 'search' ? (
          <form className="modal-body" onSubmit={submitSelected}>
            <label>
              Search foods
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelected(null)
                }}
              />
            </label>

            <ul className="food-results">
              {results.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    className={selected?.id === food.id ? 'food-row selected' : 'food-row'}
                    onClick={() => setSelected(food)}
                  >
                    <span>
                      <strong>{food.name}</strong>
                      <em>
                        {food.servingLabel}
                        {food.contributedBy ? ` · @${food.contributedBy}` : ''}
                      </em>
                    </span>
                    <span className="kcal">{food.calories} kcal</span>
                  </button>
                </li>
              ))}
            </ul>

            {selected ? (
              <div className="servings-row">
                <label>
                  Servings
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </label>
                <p>
                  ≈{' '}
                  {Math.round(selected.calories * Number(servings || 0))} kcal · P{' '}
                  {(selected.protein * Number(servings || 0)).toFixed(1)}g
                </p>
              </div>
            ) : null}

            {formError ? <p className="form-error">{formError}</p> : null}

            <button type="submit" className="btn-primary" disabled={!selected}>
              Log food
            </button>
          </form>
        ) : (
          <form className="modal-body" onSubmit={(e) => void submitCustom(e)}>
            <label>
              Food name
              <input
                value={custom.name}
                onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                required
              />
            </label>
            <label>
              Serving label
              <input
                value={custom.servingLabel}
                onChange={(e) =>
                  setCustom({ ...custom, servingLabel: e.target.value })
                }
              />
            </label>
            <div className="row-2">
              <label>
                Calories
                <input
                  type="number"
                  min={0}
                  value={custom.calories}
                  onChange={(e) =>
                    setCustom({ ...custom, calories: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Protein (g)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={custom.protein}
                  onChange={(e) =>
                    setCustom({ ...custom, protein: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="row-2">
              <label>
                Carbs (g)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={custom.carbs}
                  onChange={(e) =>
                    setCustom({ ...custom, carbs: e.target.value })
                  }
                />
              </label>
              <label>
                Fat (g)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={custom.fat}
                  onChange={(e) => setCustom({ ...custom, fat: e.target.value })}
                />
              </label>
            </div>
            {shareEnabled ? (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={shareGlobally}
                  onChange={(e) => setShareGlobally(e.target.checked)}
                />
                Share this food with all OurCal users
              </label>
            ) : (
              <p className="meta">
                Cloud sync is off. Custom foods stay on this device until Supabase is
                configured.
              </p>
            )}
            {formError ? <p className="form-error">{formError}</p> : null}
            <button type="submit" className="btn-primary">
              Save and log
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
