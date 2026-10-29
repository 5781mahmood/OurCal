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
    void (async () => {
      const [remoteEntries, remoteFriends, remoteRooms] = await Promise.all([
        fetchDiary(cloudUsername),
        fetchFriends(cloudUsername),
        fetchRooms(cloudUsername),
      ])
      const remoteMessages = (
        await Promise.all(remoteRooms.map((room) => fetchMessages(room.id)))
      ).flat()
      if (cancel) return
      setState((s) => {
        if (s.profile?.username !== cloudUsername) return s
        const entries = mergeById(s.entries, remoteEntries)
        const friends = mergeByUsername(s.friends, remoteFriends)
        const chatRooms = mergeById(s.chatRooms, remoteRooms)
        const chatMessages = mergeById(s.chatMessages, remoteMessages)
        return { ...s, entries, friends, chatRooms, chatMessages }
      })
    })()
    return () => {
      cancel = true
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

  const streak = useMemo(() => {
    let count = 0
    const keys = lastNDateKeys(todayKey(), 60).reverse()
    let started = false
    for (const key of keys) {
      const has = state.entries.some((e) => e.date === key)
      if (!started) {
        if (key === todayKey() && !has) continue
        started = true
      }
      if (!has) break
      count += 1
    }
    return count
  }, [state.entries])

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
    if (isCloudEnabled() && profile.username) {
      const reg = await registerUsername(
        profile.username,
        profile.name,
        profile.avatarUrl,
      )
      if (!reg.ok && reg.error && !reg.error.includes('not configured')) {
        setErrorMessage(reg.error)
        return false
      }
      setState((s) => ({
        ...s,
        profile,
        cloudUserId: reg.userId ?? s.cloudUserId,
      }))
      setStatusMessage('Profile saved.')
      return true
    }
    setState((s) => ({ ...s, profile }))
    setStatusMessage('Profile saved.')
    return true
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
      setState((s) => ({ ...s, entries: [...s.entries, entry] }))
      if (state.profile) void pushDiaryEntry(state.profile.username, entry)
      setStatusMessage(`${input.name} logged.`)
    },
    [selectedDate, state.profile],
  )

  const deleteEntry = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== id),
    }))
    void removeDiaryEntry(id)
    setStatusMessage('Entry removed.')
  }, [])

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
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.date !== selectedDate),
    }))
    if (state.profile) void clearDiaryDay(state.profile.username, selectedDate)
    setStatusMessage('All food cleared for this day.')
  }, [selectedDate, state.profile])

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
    (friend: FriendLink) => {
      setState((s) => {
        if (s.friends.some((f) => f.username === friend.username)) return s
        return { ...s, friends: [friend, ...s.friends] }
      })
      if (state.profile) void saveFriendship(state.profile.username, friend)
      setStatusMessage(`Added @${friend.username}.`)
    },
    [state.profile],
  )

  const removeFriend = useCallback(
    (username: string) => {
      setState((s) => ({
        ...s,
        friends: s.friends.filter((f) => f.username !== username),
      }))
      if (state.profile) void deleteFriendship(state.profile.username, username)
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
    return room
  }, [])

  const sendChatMessage = useCallback(
    async (roomId: string, body: string) => {
      if (!state.profile || !body.trim()) return
      const draft = {
        roomId,
        authorUsername: state.profile.username,
        authorName: state.profile.name,
        body: body.trim(),
      }
      const remote = isCloudEnabled() ? await sendCloudMessage(draft) : null
      const msg: ChatMessage = remote ?? {
        ...draft,
        id: uid(),
        createdAt: new Date().toISOString(),
      }
      setState((s) => {
        if (s.chatMessages.some((item) => item.id === msg.id)) return s
        return { ...s, chatMessages: [...s.chatMessages, msg] }
      })
    },
    [state.profile],
  )

  const updateAvatar = useCallback((avatarUrl: string) => {
    setState((s) => {
      if (!s.profile) return s
      return { ...s, profile: { ...s.profile, avatarUrl } }
    })
    setStatusMessage('Profile photo updated.')
  }, [])

  const dismissMessages = useCallback(() => {
    setStatusMessage(null)
    setErrorMessage(null)
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
  }
}

export type TrackerApi = ReturnType<typeof useTracker>
