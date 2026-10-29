import { useRef, useState } from 'react'
import type { UserProfile } from '../types'
import { ACTIVITY_LABELS } from '../lib/nutrition'
import { BADGE_META } from '../lib/badges'
import { compressImageFile } from '../lib/image'
import { Onboarding } from './Onboarding'
import type { TrackerApi } from '../hooks/useTracker'
import { updateCloudAvatar } from '../lib/cloud'

interface ProfileViewProps {
  tracker: TrackerApi
  profile: UserProfile
}

export function ProfileView({ tracker, profile }: ProfileViewProps) {
  const {
    setProfile,
    exportData,
    importData,
    resetAll,
    updateAvatar,
    state,
    cloudEnabled,
  } = tracker
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  function downloadExport() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ourcal-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Export downloaded.')
    setError('')
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text()
      importData(text)
      setMessage('Import successful.')
      setError('')
    } catch {
      setError('Could not import that file. Use an OurCal JSON export.')
      setMessage('')
    }
  }

  async function onAvatarPick(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file)
      updateAvatar(dataUrl)
      if (cloudEnabled) {
        const cloud = await updateCloudAvatar(profile.username, dataUrl)
        if (!cloud.ok) setError(cloud.error ?? 'Could not sync photo.')
      }
      setMessage('Profile photo updated.')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that photo.')
      setMessage('')
    }
  }

  async function removePhoto() {
    updateAvatar('')
    if (cloudEnabled) {
      const cloud = await updateCloudAvatar(profile.username, '')
      if (!cloud.ok) {
        setError(cloud.error ?? 'Could not clear cloud photo.')
        return
      }
    }
    setMessage('Photo removed.')
    setError('')
  }

  if (editing) {
    return (
      <Onboarding
        initial={profile}
        onCancel={() => setEditing(false)}
        onComplete={async (p) => {
          const ok = await setProfile(p)
          if (ok) {
            setEditing(false)
            setMessage('Profile updated.')
          }
          return ok
        }}
      />
    )
  }

  return (
    <div className="profile view-enter">
      <header className="section-head profile-head">
        <div className="avatar lg">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            <span>{profile.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{profile.name}</h1>
          <p className="meta">@{profile.username}</p>
          <p className="meta cloud-status">
            {cloudEnabled ? 'Synced' : 'This device only'}
          </p>
        </div>
        <div className="btn-row">
          <button type="button" className="btn-secondary" onClick={() => avatarRef.current?.click()}>
            Change photo
          </button>
          {profile.avatarUrl ? (
            <button
              type="button"
              className="btn-ghost danger"
              onClick={() => void removePhoto()}
            >
              Remove photo
            </button>
          ) : null}
        </div>
        <input
          ref={avatarRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            void onAvatarPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </header>

      <section className="profile-card">
        <h2>Badges</h2>
        {state.earnedBadges.length === 0 ? (
          <p className="meta">Log meals and keep your streak to earn badges.</p>
        ) : (
          <ul className="badge-list">
            {state.earnedBadges.map((b) => (
              <li key={b.id}>
                <strong>{BADGE_META[b.id].title}</strong>
                <span>{BADGE_META[b.id].detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-card">
        <dl>
          <div>
            <dt>Daily calorie goal</dt>
            <dd>{profile.calorieGoal} kcal</dd>
          </div>
          <div>
            <dt>Macros</dt>
            <dd>
              <ul className="macro-goal-cols">
                <li>
                  <em>Protein</em>
                  <strong>{profile.macroGoals.protein}g</strong>
                </li>
                <li>
                  <em>Carbs</em>
                  <strong>{profile.macroGoals.carbs}g</strong>
                </li>
                <li>
                  <em>Fat</em>
                  <strong>{profile.macroGoals.fat}g</strong>
                </li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>Body</dt>
            <dd>
              {profile.sex === 'male' ? 'Male' : 'Female'}, {profile.age} yrs ·{' '}
              {profile.heightCm} cm · {profile.weightKg} kg
            </dd>
          </div>
          <div>
            <dt>Activity</dt>
            <dd>{ACTIVITY_LABELS[profile.activity]}</dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd style={{ textTransform: 'capitalize' }}>{profile.goal}</dd>
          </div>
        </dl>
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Edit profile
        </button>
      </section>

      <section className="profile-card">
        <h2>Your data</h2>
        <p className="lede tight">
          Diary data stays in this browser. Export before clearing site data. Connect
          Supabase env vars on Vercel to sync usernames, avatars, and shared foods.
        </p>
        <div className="btn-row">
          <button type="button" className="btn-primary" onClick={downloadExport}>
            Export JSON
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
        <button
          type="button"
          className="btn-ghost danger"
          onClick={() => {
            if (
              window.confirm(
                'Reset all profile data and diary entries on this device?',
              )
            ) {
              resetAll()
              setMessage('All local data reset.')
            }
          }}
        >
          Reset everything
        </button>
        {message ? <p className="toast inline success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </div>
  )
}
