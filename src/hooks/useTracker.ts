import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AppState,
  ChatMessage,
  ChatRoom,
  DiaryEntry,
  FoodItem,
  FriendLink,
  MealType,
  UserProfile,
} from '../types'
import {
  emptyState,
  exportStateJson,
  loadState,
  parseImportJson,
  saveState,
} from '../lib/storage'
import { sumMacros } from '../lib/nutrition'
import { lastNDateKeys, todayKey } from '../lib/dates'
import { evaluateBadges } from '../lib/badges'
import { computeStreak } from '../lib/streak'
import {
  clearDiaryDay,
  createCloudRoom,
  deleteFriendship,
  fetchCommunityFoods,
  fetchDiary,
  fetchFriends,
  fetchMessages,
  fetchRooms,
  isCloudEnabled,
  publishSharedFood,
  pushCloudRoom,
  pushDiaryEntry,
  registerUsername,
  removeDiaryEntry,
  saveFriendship,
  sendCloudMessage,
  subscribeMessages,
} from '../lib/cloud'

function uid(): string {
  return crypto.randomUUID()
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const seen = new Set(local.map((item) => item.id))
  return [...local, ...remote.filter((item) => !seen.has(item.id))]
}

function mergeByUsername(local: FriendLink[], remote: FriendLink[]): FriendLink[] {
  const seen = new Set(local.map((item) => item.username))
  return [...local, ...remote.filter((item) => !seen.has(item.username))]
}

function rememberIds(existing: string[], next: string[], cap = 500): string[] {
  const set = new Set([...existing, ...next])
  return Array.from(set).slice(-cap)
}

export function useTracker() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [selectedDate, setSelectedDate] = useState(() => todayKey())
  const [communityFoods, setCommunityFoods] = useState<FoodItem[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    void fetchCommunityFoods().then(setCommunityFoods)
    const interval = window.setInterval(() => {
      void fetchCommunityFoods().then(setCommunityFoods)
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const cloudUsername = state.profile?.username

  useEffect(() => {
    if (!cloudUsername || !isCloudEnabled()) return
    let cancel = false

    async function syncOnce() {
      const [remoteEntries, remoteFriends, remoteRooms] = await Promise.all([
        fetchDiary(cloudUsername!),
        fetchFriends(cloudUsername!),
        fetchRooms(cloudUsername!),
      ])
      const remoteMessages = (
        await Promise.all(remoteRooms.map((room) => fetchMessages(room.id)))
      ).flat()
      if (cancel) return

      const localSnapshot = loadState()
      const deletedEntries = new Set(localSnapshot.deletedEntryIds ?? [])
      const deletedFriends = new Set(localSnapshot.deletedFriendUsernames ?? [])

      const remoteEntryIds = new Set(remoteEntries.map((e) => e.id))
      const remoteFriendNames = new Set(remoteFriends.map((f) => f.username))
      const remoteRoomIds = new Set(remoteRooms.map((r) => r.id))

      const localOnlyEntries = localSnapshot.entries.filter(
        (e) => !remoteEntryIds.has(e.id) && !deletedEntries.has(e.id),
      )
      const localOnlyFriends = localSnapshot.friends.filter(
        (f) =>
          !remoteFriendNames.has(f.username) && !deletedFriends.has(f.username),
      )
      const localOnlyRooms = localSnapshot.chatRooms.filter(
        (r) => !remoteRoomIds.has(r.id),
      )

      const reassertDeletes = await Promise.all([
        ...[...deletedEntries]
          .filter((id) => remoteEntryIds.has(id))
          .map((id) => removeDiaryEntry(id)),
        ...[...deletedFriends]
          .filter((name) => remoteFriendNames.has(name))
          .map((name) => deleteFriendship(cloudUsername!, name)),
      ])
      for (const result of reassertDeletes) {
        if (!result.ok && result.error) {
          if (!cancel) setErrorMessage(result.error)
          break
        }
      }

      await Promise.all([
        ...localOnlyEntries.map((entry) => pushDiaryEntry(cloudUsername!, entry)),
        ...localOnlyFriends.map((friend) => saveFriendship(cloudUsername!, friend)),
        ...localOnlyRooms.map((room) => pushCloudRoom(room)),
      ])

      if (cancel) return
      setState((s) => {
        if (s.profile?.username !== cloudUsername) return s
        const tombstoneEntries = new Set(s.deletedEntryIds ?? [])
        const tombstoneFriends = new Set(s.deletedFriendUsernames ?? [])
        const entries = mergeById(
          s.entries,
          remoteEntries.filter((e) => !tombstoneEntries.has(e.id)),
        )
        const friends = mergeByUsername(
          s.friends,
          remoteFriends.filter((f) => !tombstoneFriends.has(f.username)),
        )
        const chatRooms = mergeById(s.chatRooms, remoteRooms)
        const chatMessages = mergeById(s.chatMessages, remoteMessages)
        return { ...s, entries, friends, chatRooms, chatMessages }
      })
    }

    void syncOnce()
    const interval = window.setInterval(() => {
      void syncOnce()
    }, 45_000)

    return () => {
      cancel = true
      window.clearInterval(interval)
    }
  }, [cloudUsername])

  const roomKey = state.chatRooms.map((room) => room.id).join('|')

  useEffect(() => {
    if (!isCloudEnabled() || !roomKey) return
    const stops = state.chatRooms.map((room) =>
      subscribeMessages(room.id, (message) => {
        setState((s) => {
          if (s.chatMessages.some((item) => item.id === message.id)) return s
          return { ...s, chatMessages: [...s.chatMessages, message] }
        })
      }),
    )
    return () => {
      for (const stop of stops) stop()
    }
  }, [roomKey])

  const streak = useMemo(
    () => computeStreak(state.entries.map((e) => e.date)),
    [state.entries],
  )

  useEffect(() => {
    setState((s) => {
      const nextBadges = evaluateBadges(s, streak)
      const prevKey = s.earnedBadges
        .map((b) => b.id)
        .sort()
        .join(',')
      const nextKey = nextBadges
        .map((b) => b.id)
        .sort()
        .join(',')
      if (prevKey === nextKey) return s
      return { ...s, earnedBadges: nextBadges }
    })
  }, [streak, state.entries, state.friends, state.customFoods, state.profile])

  const setProfile = useCallback(async (profile: UserProfile) => {
    setState((s) => ({ ...s, profile }))

    if (!isCloudEnabled() || !profile.username) {
      setStatusMessage('Profile saved on this device.')
      return true
    }

    try {
      const reg = await registerUsername(
        profile.username,
        profile.name,
        profile.avatarUrl,
      )
      if (reg.ok) {
        setState((s) => ({
          ...s,
          profile,
          cloudUserId: reg.userId ?? s.cloudUserId,
        }))
        setStatusMessage('Profile saved and synced.')
        return true
      }
      if (reg.soft || reg.error?.includes('not configured')) {
        setErrorMessage(reg.error ?? 'Cloud sync unavailable. Using this device only.')
        setStatusMessage('Profile saved on this device.')
        return true
      }
      setErrorMessage(reg.error ?? 'Could not sync username.')
      setStatusMessage('Profile saved on this device.')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error'
      setErrorMessage(`Cloud sync skipped (${message}). You can still track locally.`)
      setStatusMessage('Profile saved on this device.')
      return true
    }
  }, [])

  const dayEntries = useMemo(
    () => state.entries.filter((e) => e.date === selectedDate),
    [state.entries, selectedDate],
  )

  const dayTotals = useMemo(() => sumMacros(dayEntries), [dayEntries])

  const addEntry = useCallback(
    (input: {
      meal: MealType
      name: string
      servings: number
      calories: number
      protein: number
      carbs: number
      fat: number
      date?: string
    }) => {
      const servings = Math.max(0.25, input.servings)
      const entry: DiaryEntry = {
        id: uid(),
        date: input.date ?? selectedDate,
        meal: input.meal,
        name: input.name,
        servings,
        calories: Math.round(input.calories * servings),
        protein: Math.round(input.protein * servings * 10) / 10,
        carbs: Math.round(input.carbs * servings * 10) / 10,
        fat: Math.round(input.fat * servings * 10) / 10,
        createdAt: new Date().toISOString(),
      }
      setState((s) => ({
        ...s,
        entries: [...s.entries, entry],
        deletedEntryIds: (s.deletedEntryIds ?? []).filter((id) => id !== entry.id),
      }))
      if (state.profile) {
        void pushDiaryEntry(state.profile.username, entry).then((result) => {
          if (!result.ok && result.error) setErrorMessage(result.error)
        })
      }
      setStatusMessage(`${input.name} logged.`)
    },
    [selectedDate, state.profile],
  )

  const updateEntry = useCallback(
    (id: string, servings: number) => {
      const nextServings = Math.max(0.25, servings)
      const username = state.profile?.username
      setState((s) => {
        let updated: DiaryEntry | null = null
        const entries = s.entries.map((entry) => {
          if (entry.id !== id) return entry
          const perServing = entry.servings > 0 ? 1 / entry.servings : 1
          const baseCal = entry.calories * perServing
          const baseP = entry.protein * perServing
          const baseC = entry.carbs * perServing
          const baseF = entry.fat * perServing
          updated = {
            ...entry,
            servings: nextServings,
            calories: Math.round(baseCal * nextServings),
            protein: Math.round(baseP * nextServings * 10) / 10,
            carbs: Math.round(baseC * nextServings * 10) / 10,
            fat: Math.round(baseF * nextServings * 10) / 10,
          }
          return updated
        })
        if (updated && username) {
          void pushDiaryEntry(username, updated).then((result) => {
            if (!result.ok && result.error) setErrorMessage(result.error)
          })
        }
        return { ...s, entries }
      })
      setStatusMessage('Servings updated.')
    },
    [state.profile?.username],
  )

  const deleteEntry = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        entries: s.entries.filter((e) => e.id !== id),
        deletedEntryIds: rememberIds(s.deletedEntryIds ?? [], [id]),
      }))
      void removeDiaryEntry(id).then((result) => {
        if (!result.ok && isCloudEnabled() && result.error) {
          setErrorMessage(result.error)
        }
      })
      setStatusMessage('Entry removed.')
    },
    [],
  )

  const addCustomFood = useCallback(
    async (
      food: Omit<FoodItem, 'id'>,
      options?: { shareGlobally?: boolean },
    ) => {
      const username = state.profile?.username ?? 'anonymous'
      const item: FoodItem = {
        ...food,
        id: `custom-${uid()}`,
        contributedBy: options?.shareGlobally ? username : undefined,
      }
      setState((s) => ({ ...s, customFoods: [item, ...s.customFoods] }))

      if (options?.shareGlobally) {
        const pub = await publishSharedFood(food, username)
        if (pub.ok) {
          setCommunityFoods(await fetchCommunityFoods())
          setStatusMessage('Food saved and shared with the community catalog.')
        } else {
          setErrorMessage(pub.error ?? 'Could not share food globally.')
        }
      }
      return item
    },
    [state.profile?.username],
  )

  const clearDay = useCallback(() => {
    const dayIds = state.entries
      .filter((e) => e.date === selectedDate)
      .map((e) => e.id)
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.date !== selectedDate),
      deletedEntryIds: rememberIds(s.deletedEntryIds ?? [], dayIds),
    }))
    if (state.profile) {
      void clearDiaryDay(state.profile.username, selectedDate).then((result) => {
        if (!result.ok && isCloudEnabled() && result.error) {
          setErrorMessage(result.error)
        }
      })
    }
    setStatusMessage('All food cleared for this day.')
  }, [selectedDate, state.profile, state.entries])

  const resetAll = useCallback(() => {
    setState(emptyState())
    setSelectedDate(todayKey())
    setStatusMessage('All local data reset.')
  }, [])

  const exportData = useCallback(() => exportStateJson(state), [state])

  const importData = useCallback((text: string) => {
    const next = parseImportJson(text)
    setState(next)
    setStatusMessage('Import complete.')
  }, [])

  const dailySeries = useMemo(() => {
    const keys = lastNDateKeys(todayKey(), 14)
    return keys.map((date) => {
      const entries = state.entries.filter((e) => e.date === date)
      const totals = sumMacros(entries)
      return { date, ...totals, logged: entries.length > 0 }
    })
  }, [state.entries])

  const streakWeek = useMemo(() => {
    return lastNDateKeys(todayKey(), 7).map((date) => ({
      date,
      logged: state.entries.some((e) => e.date === date),
    }))
  }, [state.entries])

  const addFriend = useCallback(
    (friend: FriendLink): 'added' | 'exists' => {
      const already = state.friends.some((f) => f.username === friend.username)
      if (already) {
        setStatusMessage(`Already friends with @${friend.username}.`)
        return 'exists'
      }
      setState((s) => {
        if (s.friends.some((f) => f.username === friend.username)) return s
        return {
          ...s,
          friends: [friend, ...s.friends],
          deletedFriendUsernames: (s.deletedFriendUsernames ?? []).filter(
            (u) => u !== friend.username,
          ),
        }
      })
      if (state.profile) {
        void saveFriendship(state.profile.username, friend).then((res) => {
          if (!res.ok && isCloudEnabled() && res.error) setErrorMessage(res.error)
        })
      }
      setStatusMessage(`Added @${friend.username}.`)
      return 'added'
    },
    [state.profile, state.friends],
  )

  const removeFriend = useCallback(
    (username: string) => {
      setState((s) => ({
        ...s,
        friends: s.friends.filter((f) => f.username !== username),
        deletedFriendUsernames: rememberIds(s.deletedFriendUsernames ?? [], [
          username,
        ]),
      }))
      if (state.profile) {
        void deleteFriendship(state.profile.username, username).then((res) => {
          if (!res.ok && isCloudEnabled() && res.error) setErrorMessage(res.error)
        })
      }
      setStatusMessage(`Removed @${username}.`)
    },
    [state.profile],
  )

  const createChatRoom = useCallback(async (title: string, members: string[]) => {
    const remote = isCloudEnabled() ? await createCloudRoom(title, members) : null
    const room: ChatRoom = remote ?? {
      id: uid(),
      title,
      memberUsernames: members,
      createdAt: new Date().toISOString(),
    }
    setState((s) => ({
      ...s,
      chatRooms: s.chatRooms.some((item) => item.id === room.id)
        ? s.chatRooms
        : [room, ...s.chatRooms],
    }))
    if (!remote && isCloudEnabled()) {
      void pushCloudRoom(room)
    }
    return room
  }, [])

  const sendChatMessage = useCallback(
    async (roomId: string, body: string): Promise<{ ok: boolean; error?: string }> => {
      if (!state.profile) return { ok: false, error: 'No profile.' }
      if (!body.trim()) return { ok: false, error: 'Type a message first.' }
      const draft = {
        roomId,
        authorUsername: state.profile.username,
        authorName: state.profile.name,
        body: body.trim(),
      }
      const remote = isCloudEnabled() ? await sendCloudMessage(draft) : null
      if (isCloudEnabled() && !remote) {
        const err = 'Could not send message. Try again.'
        setErrorMessage(err)
        return { ok: false, error: err }
      }
      const msg: ChatMessage = remote ?? {
        ...draft,
        id: uid(),
        createdAt: new Date().toISOString(),
      }
      setState((s) => {
        if (s.chatMessages.some((item) => item.id === msg.id)) return s
        return { ...s, chatMessages: [...s.chatMessages, msg] }
      })
      return { ok: true }
    },
    [state.profile],
  )

  const updateAvatar = useCallback((avatarUrl: string) => {
    setState((s) => {
      if (!s.profile) return s
      return { ...s, profile: { ...s.profile, avatarUrl } }
    })
    setStatusMessage(avatarUrl ? 'Profile photo updated.' : 'Photo removed.')
  }, [])

  const dismissMessages = useCallback(() => {
    setStatusMessage(null)
    setErrorMessage(null)
  }, [])

  const flashError = useCallback((message: string) => {
    setErrorMessage(message)
  }, [])

  const flashStatus = useCallback((message: string) => {
    setStatusMessage(message)
  }, [])

  return {
    state,
    profile: state.profile,
    selectedDate,
    setSelectedDate,
    dayEntries,
    dayTotals,
    setProfile,
    addEntry,
    updateEntry,
    deleteEntry,
    addCustomFood,
    clearDay,
    resetAll,
    exportData,
    importData,
    dailySeries,
    streak,
    streakWeek,
    communityFoods,
    cloudEnabled: isCloudEnabled(),
    addFriend,
    removeFriend,
    createChatRoom,
    sendChatMessage,
    updateAvatar,
    statusMessage,
    errorMessage,
    dismissMessages,
    flashError,
    flashStatus,
  }
}

export type TrackerApi = ReturnType<typeof useTracker>
