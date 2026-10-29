import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ActivityLevel, GoalType, Sex, UserProfile } from '../types'
import {
  ACTIVITY_LABELS,
  buildSuggestedProfile,
  estimateTdee,
} from '../lib/nutrition'

interface OnboardingProps {
  onComplete: (profile: UserProfile) => Promise<boolean>
  initial?: UserProfile | null
}

function suggestUsername(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16)
  return base.length >= 3 ? base : 'ourcal_user'
}

export function Onboarding({ onComplete, initial }: OnboardingProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? '')
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male')
  const [age, setAge] = useState(initial?.age?.toString() ?? '22')
  const [heightCm, setHeightCm] = useState(initial?.heightCm?.toString() ?? '175')
  const [weightKg, setWeightKg] = useState(initial?.weightKg?.toString() ?? '75')
  const [activity, setActivity] = useState<ActivityLevel>(
    initial?.activity ?? 'moderate',
  )
  const [goal, setGoal] = useState<GoalType>(initial?.goal ?? 'maintain')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => {
    const a = Number(age)
    const h = Number(heightCm)
    const w = Number(weightKg)
    if (![a, h, w].every((n) => Number.isFinite(n) && n > 0)) return null
    const handle = username.trim() || suggestUsername(name)
    return buildSuggestedProfile({
      name: name.trim() || 'You',
      username: handle,
      avatarUrl,
      sex,
      age: a,
      heightCm: h,
      weightKg: w,
      activity,
      goal,
    })
  }, [name, username, avatarUrl, sex, age, heightCm, weightKg, activity, goal])

  async function onAvatarPick(file: File | undefined) {
    if (!file) return
    if (file.size > 800_000) {
      setError('Use a photo under 800 KB or crop before upload.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!preview) {
      setError('Enter valid age, height, and weight.')
      return
    }
    if (!name.trim()) {
      setError('Add your display name.')
      return
    }
    if (!/^[a-z0-9_]{3,20}$/i.test(preview.username)) {
      setError('Username must be 3–20 characters: letters, numbers, underscore.')
      return
    }
    setError('')
    setBusy(true)
    const ok = await onComplete({
      ...preview,
      name: name.trim(),
      username: preview.username.toLowerCase(),
    })
    setBusy(false)
    if (!ok) setError('Could not save profile. Check username availability.')
  }

  return (
    <div className="onboard">
      <div className="onboard-panel">
        <p className="eyebrow">OurCal</p>
        <h1>Set your daily target</h1>
        <p className="lede">
          Mifflin–St Jeor estimates your calories. Pick a global username for friends
          and QR invites.
        </p>

        <form className="onboard-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Display name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!initial && !username) setUsername(suggestUsername(e.target.value))
              }}
              autoComplete="name"
            />
          </label>

          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              autoComplete="username"
            />
          </label>

          <label>
            Profile photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void onAvatarPick(e.target.files?.[0])}
            />
          </label>

          <div className="row-2">
            <label>
              Sex
              <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label>
              Age
              <input
                type="number"
                min={13}
                max={100}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </label>
          </div>

          <div className="row-2">
            <label>
              Height (cm)
              <input
                type="number"
                min={100}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </label>
            <label>
              Weight (kg)
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </label>
          </div>

          <label>
            Activity
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="goal-set">
            <legend>Goal</legend>
            {(
              [
                ['lose', 'Lose'],
                ['maintain', 'Maintain'],
                ['gain', 'Gain'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={goal === value ? 'chip active' : 'chip'}
                onClick={() => setGoal(value)}
              >
                {label}
              </button>
            ))}
          </fieldset>

          {preview ? (
            <div className="estimate">
              <div>
                <span>Maintenance (TDEE)</span>
                <strong>
                  {estimateTdee(
                    sex,
                    Number(weightKg),
                    Number(heightCm),
                    Number(age),
                    activity,
                  )}{' '}
                  kcal
                </strong>
              </div>
              <div>
                <span>Your daily goal</span>
                <strong>{preview.calorieGoal} kcal</strong>
              </div>
              <div>
                <span>Macros</span>
                <strong>
                  P {preview.macroGoals.protein}g · C {preview.macroGoals.carbs}g · F{' '}
                  {preview.macroGoals.fat}g
                </strong>
              </div>
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="btn-primary" disabled={busy}>
            {initial ? 'Save profile' : 'Start tracking'}
          </button>
        </form>
      </div>
    </div>
  )
}
