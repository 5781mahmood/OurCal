import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import type { DiaryEntry, FoodItem, MealType } from '../types'
import { searchFoods } from '../data/foods'
import { recentFoodsFromEntries } from '../lib/recentFoods'
import {
  lookupBarcode,
  normalizeBarcode,
  productUrl,
  scaleTo,
  type BarcodeProduct,
} from '../lib/openFoodFacts'

const BARCODE_READER_ID = 'ourcal-barcode-reader'

interface AddFoodModalProps {
  open: boolean
  meal: MealType
  entries: DiaryEntry[]
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

type Tab = 'search' | 'barcode' | 'custom'

/** e.g. "Oatmeal (cooked), 1 cup, 158 kcal" */
function foodRowLabel(food: FoodItem): string {
  const parts = [food.name, food.servingLabel, `${food.calories} kcal`]
  if (food.contributedBy) parts.push(`shared by @${food.contributedBy}`)
  return parts.join(', ')
}

export function AddFoodModal({
  open,
  meal,
  entries,
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
  const [barcodeInput, setBarcodeInput] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const [product, setProduct] = useState<BarcodeProduct | null>(null)
  const [grams, setGrams] = useState('')
  const [scanning, setScanning] = useState(false)
  const [customNotice, setCustomNotice] = useState('')
  const lookupRef = useRef<AbortController | null>(null)
  const [custom, setCustom] = useState({
    name: '',
    servingLabel: '1 serving',
    barcode: '',
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
    setBarcodeInput('')
    setLookupBusy(false)
    setProduct(null)
    setGrams('')
    setScanning(false)
    setCustomNotice('')
    setCustom((c) => ({ ...c, barcode: '' }))
  }, [open, meal])

  useEffect(() => {
    if (!open) return
    return () => lookupRef.current?.abort()
  }, [open])

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

  const recent = useMemo(() => recentFoodsFromEntries(entries, 8), [entries])
  const showRecent = query.trim().length === 0 && recent.length > 0

  function selectTab(next: Tab) {
    setTab(next)
    setFormError('')
    setCustomNotice('')
    if (next !== 'barcode') setScanning(false)
  }

  async function runLookup(raw: string) {
    setProduct(null)
    setGrams('')
    setServings('1')
    const code = normalizeBarcode(raw)
    if (!code) {
      setFormError('Enter a barcode of 8 to 14 digits.')
      return
    }
    setFormError('')
    lookupRef.current?.abort()
    const controller = new AbortController()
    lookupRef.current = controller
    setLookupBusy(true)
    const result = await lookupBarcode(code, { signal: controller.signal })
    // Closed or superseded by a newer lookup.
    if (controller.signal.aborted) return
    lookupRef.current = null
    setLookupBusy(false)

    if (result.status === 'found') {
      setProduct(result.product)
      return
    }
    const name = result.status === 'incomplete' ? result.name : undefined
    setCustom((c) => ({ ...c, barcode: code, name: name ?? c.name }))
    setCustomNotice(
      result.status === 'error'
        ? `Could not reach Open Food Facts. Add barcode ${code} as a custom food.`
        : result.status === 'incomplete'
          ? `Open Food Facts has no calorie data for barcode ${code}. Add it as a custom food.`
          : `Barcode ${code} is not on Open Food Facts. Add it as a custom food.`,
    )
    setFormError('')
    setTab('custom')
  }

  const onScanned = useEffectEvent((decoded: string) => {
    setScanning(false)
    setBarcodeInput(decoded)
    void runLookup(decoded)
  })

  useEffect(() => {
    if (!open || tab !== 'barcode' || !scanning) return
    let cancelled = false
    let running = false
    let scanner: Html5Qrcode | null = null

    void (async () => {
      try {
        // Loaded on demand so the scanner stays out of the main bundle.
        const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import('html5-qrcode')
        if (cancelled) return
        scanner = new Html5Qrcode(BARCODE_READER_ID, {
          verbose: false,
          formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E],
          useBarCodeDetectorIfSupported: true,
        })
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 140 } },
          (decoded) => {
            if (cancelled) return
            cancelled = true
            onScanned(decoded)
          },
          () => {},
        )
        running = true
        if (cancelled) void scanner.stop().catch(() => {})
      } catch {
        if (cancelled) return
        setScanning(false)
        setFormError('Camera access failed. Type the barcode number instead.')
      }
    })()

    return () => {
      cancelled = true
      if (running) void scanner?.stop().catch(() => {})
    }
  }, [open, tab, scanning])

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

  function submitProduct(e: FormEvent) {
    e.preventDefault()
    if (!product) return
    if (product.basis === '100g') {
      const g = Number(grams)
      if (!grams.trim() || !Number.isFinite(g) || g <= 0) {
        setFormError('Enter how many grams you had.')
        return
      }
      onAdd({
        meal,
        name: `${product.name} (${g} g)`,
        servings: 1,
        ...scaleTo(product.nutrition, g),
      })
    } else {
      const s = Number(servings)
      if (!Number.isFinite(s) || s <= 0) {
        setFormError('Enter a valid serving amount.')
        return
      }
      onAdd({ meal, name: product.name, servings: s, ...product.nutrition })
    }
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
    const barcode = custom.barcode.trim() ? normalizeBarcode(custom.barcode) : undefined
    if (barcode === null) {
      setFormError('Barcode must be 8 to 14 digits.')
      return
    }

    const saved = await onSaveCustom(
      {
        name: custom.name.trim(),
        servingLabel: custom.servingLabel.trim() || '1 serving',
        ...(barcode ? { barcode } : {}),
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
            onClick={() => selectTab('search')}
          >
            Search
          </button>
          <button
            type="button"
            className={tab === 'barcode' ? 'active' : ''}
            onClick={() => selectTab('barcode')}
          >
            Barcode
          </button>
          <button
            type="button"
            className={tab === 'custom' ? 'active' : ''}
            onClick={() => selectTab('custom')}
          >
            Custom
          </button>
        </div>

        {tab === 'barcode' ? (
          <div className="modal-body">
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault()
                void runLookup(barcodeInput)
              }}
            >
              <label>
                Barcode number
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="off"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </label>
              <div className="btn-row">
                <button type="submit" className="btn-primary" disabled={lookupBusy}>
                  {lookupBusy ? 'Looking up…' : 'Look up'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setFormError('')
                    setScanning((s) => !s)
                  }}
                >
                  {scanning ? 'Stop camera' : 'Scan barcode'}
                </button>
              </div>
            </form>

            {scanning ? <div id={BARCODE_READER_ID} className="qr-reader" /> : null}

            {product ? (
              <form
                className="modal-body"
                aria-label="Barcode result"
                onSubmit={submitProduct}
              >
                <div className="barcode-result">
                  <strong>{product.name}</strong>
                  {product.brand ? <span className="meta">{product.brand}</span> : null}
                  <p>
                    {product.basis === 'serving'
                      ? `Per serving (${product.servingLabel})`
                      : 'Per 100 g'}
                    : {product.nutrition.calories} kcal · P {product.nutrition.protein}g · C{' '}
                    {product.nutrition.carbs}g · F {product.nutrition.fat}g
                  </p>
                  <p className="meta">
                    Source:{' '}
                    <a href={productUrl(product.barcode)} target="_blank" rel="noreferrer">
                      Open Food Facts
                    </a>
                  </p>
                </div>

                {product.basis === 'serving' ? (
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
                      ≈ {Math.round(product.nutrition.calories * Number(servings || 0))} kcal
                    </p>
                  </div>
                ) : (
                  <div className="servings-row">
                    <label>
                      Grams
                      <input
                        type="number"
                        min={1}
                        step="any"
                        inputMode="decimal"
                        autoFocus
                        value={grams}
                        onChange={(e) => setGrams(e.target.value)}
                      />
                    </label>
                    <p>
                      {Number(grams) > 0
                        ? `≈ ${scaleTo(product.nutrition, Number(grams)).calories} kcal`
                        : 'Only per 100 g values are listed. How many grams did you have?'}
                    </p>
                  </div>
                )}

                {formError ? <p className="form-error">{formError}</p> : null}

                <button type="submit" className="btn-primary">
                  Log food
                </button>
              </form>
            ) : formError ? (
              <p className="form-error">{formError}</p>
            ) : null}
          </div>
        ) : tab === 'search' ? (
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

            {showRecent ? (
              <div className="food-recent">
                <h3 className="food-recent-heading">Recent</h3>
                <ul className="food-results" aria-label="Recent foods">
                  {recent.map(({ food, servings: lastServings }) => (
                    <li key={food.id}>
                      <button
                        type="button"
                        className="food-row"
                        aria-label={`${foodRowLabel(food)}, last time ${lastServings} servings`}
                        aria-pressed={selected?.id === food.id}
                        onClick={() => {
                          setSelected(food)
                          setServings(String(lastServings))
                        }}
                      >
                        <span>
                          <strong>{food.name}</strong>
                          <em>
                            Last time · {lastServings} serving
                            {lastServings === 1 ? '' : 's'}
                          </em>
                        </span>
                        <span className="kcal">
                          {Math.round(food.calories * lastServings)} kcal
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ul className="food-results" aria-label="Search results">
              {results.length === 0 && query.trim() ? (
                <li className="meta food-empty">
                  No foods match. Try another name or add a custom food.
                </li>
              ) : null}
              {results.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    className="food-row"
                    aria-label={foodRowLabel(food)}
                    aria-pressed={selected?.id === food.id}
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
            {customNotice ? (
              <p className="barcode-notice" role="status">
                {customNotice}
              </p>
            ) : null}
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
            <label>
              Barcode (optional)
              <input
                inputMode="numeric"
                autoComplete="off"
                value={custom.barcode}
                onChange={(e) => setCustom({ ...custom, barcode: e.target.value })}
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
