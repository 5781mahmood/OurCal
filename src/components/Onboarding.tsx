import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { ActivityLevel, GoalType, Sex, UserProfile } from '../types'
import {
  ACTIVITY_LABELS,
  buildSuggestedProfile,
  estimateTdee,
} from '../lib/nutrition'
import { compressImageFile } from '../lib/image'
import {
  USERNAME_MIN,
  isValidUsername,
  normalizeUsername,
  suggestUsername,
  usernameError,
  usernameHint,
} from '../lib/username'

interface OnboardingProps {
  onComplete: (profile: UserProfile) => Promise<boolean>
  initial?: UserProfile | null
  onCancel?: () => void
}

export function Onboarding({ onComplete, initial, onCancel }: OnboardingProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  // Keep suggesting from the display name until the user types a username.
  const [usernameEdited, setUsernameEdited] = useState(Boolean(initial))
  const [submitted, setSubmitted] = useState(false)
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
  const [photoNote, setPhotoNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  const preview = useMemo(() => {
    const a = Number(age)
    const h = Number(heightCm)
    const w = Number(weightKg)
    if (![a, h, w].every((n) => Number.isFinite(n) && n > 0)) return null
    const handle = normalizeUsername(username) || suggestUsername(name)
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
    setError('')
    setPhotoNote('')
    setPhotoBusy(true)
    try {
      const dataUrl = await compressImageFile(file)
      setAvatarUrl(dataUrl)
      setPhotoNote('Photo resized for the app. You can remove it anytime.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!preview) {
      setError('Enter valid age, height, and weight.')
      return
    }
    if (!name.trim()) {
      setError('Add your display name.')
      return
    }
    if (!isValidUsername(preview.username)) {
      setError(usernameHint())
      return
    }
    setError('')
    setBusy(true)
    try {
      await onComplete({
        ...preview,
        name: name.trim(),
        username: normalizeUsername(preview.username),
      })
    } catch (err) {
      // Should not block entry; still show a readable note.
      setError(
        err instanceof Error
          ? `Saved with a sync warning: ${err.message}`
          : 'Profile saved on this device.',
      )
    } finally {
      setBusy(false)
    }
  }

  const tdee =
    preview &&
    estimateTdee(sex, Number(weightKg), Number(heightCm), Number(age), activity)

  // Too-short is only reported after a submit so the first keystrokes stay quiet.
  const liveUsernameError = usernameError(username)
  const usernameTooShort = normalizeUsername(username).length < USERNAME_MIN
  const showUsernameError =
    liveUsernameError !== null && (submitted || !usernameTooShort)

  return (
    <div className="onboard">
      <div className="onboard-panel">
        <p className="eyebrow">OurCal</p>
        <h1>Set your daily target</h1>
        <p className="lede">
          Mifflin-St Jeor estimates your calories. Pick a username for friends and QR
          invites. You can start tracking even if cloud sync is offline.
        </p>

        <form className="onboard-form" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Display name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!usernameEdited) setUsername(suggestUsername(e.target.value))
              }}
              autoComplete="name"
            />
          </label>

          <label>
            Username
            <input
              value={username}
              onChange={(e) => {
                setUsernameEdited(true)
                setUsername(e.target.value)
              }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={showUsernameError}
              aria-describedby={
                showUsernameError ? 'username-hint username-error' : 'username-hint'
              }
            />
            <span id="username-hint" className="field-hint">
              {usernameHint()}
            </span>
            {showUsernameError ? (
              <span id="username-error" className="field-error" role="alert">
                {liveUsernameError}
              </span>
            ) : null}
          </label>

          <div className="avatar-picker">
            <div className="avatar lg preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile preview" />
              ) : (
                <span>{(name.trim() || '?').slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="avatar-picker-actions">
              <label className="btn-secondary file-label">
                {photoBusy ? 'Resizing…' : 'Choose photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  disabled={photoBusy}
                  onChange={(e) => {
                    void onAvatarPick(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
              {avatarUrl ? (
                <button
                  type="button"
                  className="btn-ghost danger"
                  onClick={() => {
                    setAvatarUrl('')
                    setPhotoNote('Photo removed.')
                  }}
                >
                  Remove photo
                </button>
              ) : null}
              {photoNote ? <p className="field-hint">{photoNote}</p> : null}
            </div>
          </div>

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

          {preview && tdee ? (
            <div className="estimate">
              <div>
                <span>Maintenance (TDEE)</span>
                <strong className="estimate-num">{tdee} kcal</strong>
              </div>
              <div>
                <span>Your daily goal</span>
                <strong className="estimate-num">{preview.calorieGoal} kcal</strong>
              </div>
              <div className="estimate-macros">
                <span>Macros</span>
                <ul>
                  <li>
                    <em>Protein</em>
                    <strong>{preview.macroGoals.protein}g</strong>
                  </li>
                  <li>
                    <em>Carbs</em>
                    <strong>{preview.macroGoals.carbs}g</strong>
                  </li>
                  <li>
                    <em>Fat</em>
                    <strong>{preview.macroGoals.fat}g</strong>
                  </li>
                </ul>
              </div>
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <div className="btn-row">
            <button type="submit" className="btn-primary" disabled={busy || photoBusy}>
              {busy ? 'Saving…' : initial ? 'Save profile' : 'Start tracking'}
            </button>
            {onCancel ? (
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
