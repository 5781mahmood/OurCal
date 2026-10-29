import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'
import { format, parseISO } from 'date-fns'
import type { TrackerApi } from '../hooks/useTracker'
import { lookupProfileByUsername } from '../lib/cloud'
import { buildInviteUrl, parseInvite } from '../lib/invite'
import type { UserProfile } from '../types'

interface CommunityViewProps {
  tracker: TrackerApi
  profile: UserProfile
}

function shortTime(iso: string): string {
  try {
    return format(parseISO(iso), 'h:mm a')
  } catch {
    return ''
  }
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
  const [composeError, setComposeError] = useState('')
  const [copyNote, setCopyNote] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const inviteUrl = buildInviteUrl(profile.username)

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
      if (!remote) {
        setFriendError('No OurCal user with that username.')
        return
      }
      displayName = remote.displayName
      avatarUrl = remote.avatarUrl
    }

    addFriend({
      username,
      displayName,
      avatarUrl,
      addedAt: new Date().toISOString(),
    })
    setFriendInput('')
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopyNote('Invite link copied.')
      window.setTimeout(() => setCopyNote(''), 2500)
    } catch {
      setFriendError('Could not copy. Select and copy the link manually.')
    }
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
    if (state.friends.length === 0) {
      setFriendError('Add a friend before starting a group thread.')
      return
    }
    const members = [
      profile.username,
      ...state.friends.slice(0, 4).map((f) => f.username),
    ]
    const room = await createChatRoom('Group check-in', members)
    setActiveRoom(room.id)
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    setComposeError('')
    if (!draft.trim()) {
      setComposeError('Type a message first.')
      return
    }
    if (!activeRoom) return
    const result = await sendChatMessage(activeRoom, draft)
    if (!result.ok) {
      setComposeError(result.error ?? 'Could not send.')
      return
    }
    setDraft('')
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
            <button type="button" className="btn-secondary" onClick={() => void copyInvite()}>
              Copy invite link
            </button>
            {copyNote ? <p className="toast inline success">{copyNote}</p> : null}
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
                    <button
                      type="button"
                      className="btn-primary sm"
                      onClick={() => void startDm(f.username)}
                    >
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
          <button
            type="button"
            className="btn-secondary"
            disabled={state.friends.length === 0}
            title={
              state.friends.length === 0
                ? 'Add a friend before starting a group thread'
                : undefined
            }
            onClick={() => void startGroupChat()}
          >
            New group thread
          </button>
        </header>
        {state.friends.length === 0 ? (
          <p className="meta chat-hint">Add a friend before you can start a group thread.</p>
        ) : null}
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
                      <div className="msg-meta">
                        <strong>{m.authorName}</strong>
                        <time dateTime={m.createdAt}>{shortTime(m.createdAt)}</time>
                      </div>
                      <p>{m.body}</p>
                    </li>
                  ))}
                </ul>
                <form className="chat-compose" onSubmit={(e) => void onSend(e)}>
                  <label className="field compose-field">
                    Message
                    <input
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value)
                        if (composeError) setComposeError('')
                      }}
                      placeholder="Write a check-in…"
                      aria-invalid={composeError ? true : undefined}
                    />
                  </label>
                  <button type="submit" className="btn-primary" disabled={!draft.trim()}>
                    Send
                  </button>
                </form>
                {composeError ? <p className="form-error compose-error">{composeError}</p> : null}
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
