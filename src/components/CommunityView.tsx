import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'
import type { TrackerApi } from '../hooks/useTracker'
import { lookupProfileByUsername } from '../lib/cloud'
import type { UserProfile } from '../types'

interface CommunityViewProps {
  tracker: TrackerApi
  profile: UserProfile
}

function parseInvite(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    const u = url.searchParams.get('u') ?? url.pathname.split('/').pop()
    if (u) return u.replace('@', '').toLowerCase()
  } catch {
    /* not a url */
  }
  if (trimmed.startsWith('@')) return trimmed.slice(1).toLowerCase()
  if (/^[a-z0-9_]{3,20}$/i.test(trimmed)) return trimmed.toLowerCase()
  return null
}

export function CommunityView({ tracker, profile }: CommunityViewProps) {
  const {
    state,
    addFriend,
    removeFriend,
    createChatRoom,
    sendChatMessage,
    cloudEnabled,
  } = tracker

  const [friendInput, setFriendInput] = useState('')
  const [friendError, setFriendError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [activeRoom, setActiveRoom] = useState(state.chatRooms[0]?.id ?? '')
  const [draft, setDraft] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/app/community?u=${profile.username}`
      : `https://ourcal.app/app/community?u=${profile.username}`

  const roomMessages = useMemo(
    () =>
      state.chatMessages
        .filter((m) => m.roomId === activeRoom)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.chatMessages, activeRoom],
  )

  useEffect(() => {
    if (!activeRoom && state.chatRooms[0]) {
      setActiveRoom(state.chatRooms[0].id)
    }
  }, [activeRoom, state.chatRooms])

  async function addFriendFromInput(raw: string) {
    setFriendError('')
    const username = parseInvite(raw)
    if (!username) {
      setFriendError('Enter a valid @username or invite link.')
      return
    }
    if (username === profile.username) {
      setFriendError('You cannot add yourself.')
      return
    }

    let displayName = username
    let avatarUrl = ''
    if (cloudEnabled) {
      const remote = await lookupProfileByUsername(username)
      if (remote) {
        displayName = remote.displayName
        avatarUrl = remote.avatarUrl
      }
    }

    addFriend({
      username,
      displayName,
      avatarUrl,
      addedAt: new Date().toISOString(),
    })
    setFriendInput('')
  }

  async function toggleScanner() {
    if (scanning) {
      await scannerRef.current?.stop()
      scannerRef.current = null
      setScanning(false)
      return
    }
    setScanning(true)
    const id = 'ourcal-qr-reader'
    const scanner = new Html5Qrcode(id)
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          void addFriendFromInput(decoded).then(() => {
            void scanner.stop()
            scannerRef.current = null
            setScanning(false)
          })
        },
        () => {},
      )
    } catch {
      setFriendError('Camera access failed. Use username or invite link instead.')
      setScanning(false)
    }
  }

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop()
    }
  }, [])

  async function startDm(friendUsername: string) {
    const existing = state.chatRooms.find(
      (r) =>
        r.title === `@${friendUsername}` &&
        r.memberUsernames.includes(friendUsername),
    )
    if (existing) {
      setActiveRoom(existing.id)
      return
    }
    const room = await createChatRoom(`@${friendUsername}`, [
      profile.username,
      friendUsername,
    ])
    setActiveRoom(room.id)
  }

  async function startGroupChat() {
    const members = [
      profile.username,
      ...state.friends.slice(0, 4).map((f) => f.username),
    ]
    const room = await createChatRoom('Group check-in', members)
    setActiveRoom(room.id)
  }

  return (
    <div className="community view-enter">
      <header className="section-head">
        <p className="eyebrow">People</p>
        <h1>Friends and chat</h1>
        <p className="lede">
          OurCal uses direct messages and small group threads instead of public
          leaderboards. Share your invite QR or username to stay accountable.
        </p>
      </header>

      {!cloudEnabled ? (
        <p className="banner-note">
          Cloud sync is offline on this deployment. Friends and chat still work on
          this device. Add Supabase keys to enable global usernames and shared foods.
        </p>
      ) : null}

      <section className="panel split-panel">
        <div>
          <h2>Add friends</h2>
          <p className="meta">Global handle: @{profile.username}</p>
          <div className="qr-block">
            <QRCodeSVG value={inviteUrl} size={132} bgColor="#f5f5f7" fgColor="#1d1d1f" />
            <p className="meta">Scan or share this code to connect.</p>
          </div>
          <label className="field">
            Username or invite link
            <input
              value={friendInput}
              onChange={(e) => setFriendInput(e.target.value)}
            />
          </label>
          {friendError ? <p className="form-error">{friendError}</p> : null}
          <div className="btn-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void addFriendFromInput(friendInput)}
            >
              Add friend
            </button>
            <button type="button" className="btn-secondary" onClick={() => void toggleScanner()}>
              {scanning ? 'Stop camera' : 'Scan QR'}
            </button>
          </div>
          {scanning ? <div id="ourcal-qr-reader" className="qr-reader" /> : null}
        </div>

        <div>
          <h2>Friend list</h2>
          {state.friends.length === 0 ? (
            <p className="meta">No friends yet.</p>
          ) : (
            <ul className="friend-list">
              {state.friends.map((f) => (
                <li key={f.username}>
                  <div className="avatar sm">
                    {f.avatarUrl ? (
                      <img src={f.avatarUrl} alt="" />
                    ) : (
                      <span>{f.displayName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong>{f.displayName}</strong>
                    <p className="meta">@{f.username}</p>
                  </div>
                  <div className="friend-actions">
                    <button type="button" className="btn-secondary" onClick={() => void startDm(f.username)}>
                      Message
                    </button>
                    <button
                      type="button"
                      className="btn-ghost danger"
                      onClick={() => removeFriend(f.username)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="panel chat-panel">
        <header className="chat-head">
          <h2>Chat</h2>
          <button type="button" className="btn-secondary" onClick={() => void startGroupChat()}>
            New group thread
          </button>
        </header>
        <div className="chat-layout">
          <ul className="room-list">
            {state.chatRooms.length === 0 ? (
              <li className="meta">Start a DM from a friend.</li>
            ) : (
              state.chatRooms.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    className={room.id === activeRoom ? 'room active' : 'room'}
                    onClick={() => setActiveRoom(room.id)}
                  >
                    {room.title}
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="chat-thread">
            {activeRoom ? (
              <>
                <ul className="message-list">
                  {roomMessages.map((m) => (
                    <li key={m.id} className={m.authorUsername === profile.username ? 'mine' : ''}>
                      <strong>{m.authorName}</strong>
                      <p>{m.body}</p>
                    </li>
                  ))}
                </ul>
                <form
                  className="chat-compose"
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendChatMessage(activeRoom, draft)
                    setDraft('')
                  }}
                >
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <button type="submit" className="btn-primary">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <p className="meta">Select a thread.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
