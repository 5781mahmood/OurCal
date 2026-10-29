import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ChatMessage, ChatRoom, DiaryEntry, FoodItem, FriendLink } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

function looksConfigured(value: string | undefined, kind: 'url' | 'key'): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === '0' || trimmed === '1') return false
  if (kind === 'url') return trimmed.startsWith('https://') && trimmed.includes('supabase')
  return trimmed.length > 40
}

export function isCloudEnabled(): boolean {
  return looksConfigured(url, 'url') && looksConfigured(anon, 'key')
}

export function getSupabase(): SupabaseClient | null {
  if (!isCloudEnabled()) return null
  if (!client) client = createClient(url!, anon!)
  return client
}

export async function registerUsername(
  username: string,
  displayName: string,
  avatarUrl: string,
): Promise<{ ok: boolean; error?: string; userId?: string; soft?: boolean }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud sync is not configured on this deployment.', soft: true }

  const normalized = username.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!/^[a-z0-9_ ]{3,20}$/.test(normalized)) {
    return {
      ok: false,
      error: 'Username must be 3–20 characters. Letters, numbers, spaces, and underscores only.',
    }
  }

  // Never send oversized data URLs to Postgres text columns.
  const avatar =
    avatarUrl && !(avatarUrl.startsWith('data:') && avatarUrl.length > 180_000)
      ? avatarUrl
      : null

  try {
    const { data: existing, error: lookupError } = await sb
      .from('profiles')
      .select('id')
      .eq('username', normalized)
      .maybeSingle()

    if (lookupError) {
      return { ok: false, error: lookupError.message, soft: true }
    }

    if (existing) {
      await sb
        .from('profiles')
        .update({
          display_name: displayName,
          ...(avatar ? { avatar_url: avatar } : {}),
        })
        .eq('username', normalized)
      return { ok: true, userId: existing.id as string }
    }

    const { data, error } = await sb
      .from('profiles')
      .insert({
        username: normalized,
        display_name: displayName,
        avatar_url: avatar,
      })
      .select('id')
      .single()

    if (error) return { ok: false, error: error.message, soft: true }
    return { ok: true, userId: data.id as string }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return {
      ok: false,
      error: `Cloud unreachable (${message}). Saving on this device only.`,
      soft: true,
    }
  }
}

export async function fetchCommunityFoods(): Promise<FoodItem[]> {
  const sb = getSupabase()
  if (!sb) return []

  const { data, error } = await sb
    .from('shared_foods')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error || !data) return []

  return data.map((row) => ({
    id: `shared-${row.id}`,
    name: row.name as string,
    brand: (row.brand as string) || undefined,
    servingLabel: row.serving_label as string,
    calories: row.calories as number,
    protein: row.protein as number,
    carbs: row.carbs as number,
    fat: row.fat as number,
    contributedBy: row.contributed_by as string,
  }))
}

export async function publishSharedFood(
  food: Omit<FoodItem, 'id'>,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud sync is not configured.' }

  const { error } = await sb.from('shared_foods').insert({
    name: food.name,
    brand: food.brand ?? null,
    serving_label: food.servingLabel,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    contributed_by: username,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function lookupProfileByUsername(
  username: string,
): Promise<{ username: string; displayName: string; avatarUrl: string } | null> {
  const sb = getSupabase()
  if (!sb) return null

  const { data } = await sb
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle()

  if (!data) return null
  return {
    username: data.username as string,
    displayName: data.display_name as string,
    avatarUrl: (data.avatar_url as string) || '',
  }
}

export async function updateCloudAvatar(
  username: string,
  avatarUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud sync is not configured.' }

  if (avatarUrl.startsWith('data:') && avatarUrl.length > 120_000) {
    return {
      ok: false,
      error: 'Photo is too large for the shared database. Use a smaller image.',
    }
  }

  const { error } = await sb
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('username', username)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function fetchFriends(ownerUsername: string): Promise<FriendLink[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('friendships')
    .select('*')
    .eq('owner_username', ownerUsername)
    .order('created_at', { ascending: false })
  return (data ?? []).map((row) => ({
    username: row.friend_username as string,
    displayName: row.display_name as string,
    avatarUrl: (row.avatar_url as string) || '',
    addedAt: row.created_at as string,
  }))
}

export async function saveFriendship(ownerUsername: string, friend: FriendLink): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('friendships').upsert(
    {
      owner_username: ownerUsername,
      friend_username: friend.username,
      display_name: friend.displayName,
      avatar_url: friend.avatarUrl || null,
    },
    { onConflict: 'owner_username,friend_username' },
  )
}

export async function deleteFriendship(
  ownerUsername: string,
  friendUsername: string,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb
    .from('friendships')
    .delete()
    .eq('owner_username', ownerUsername)
    .eq('friend_username', friendUsername)
}

export async function fetchRooms(username: string): Promise<ChatRoom[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('chat_rooms')
    .select('*')
    .contains('member_usernames', [username])
    .order('created_at', { ascending: false })
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    memberUsernames: (row.member_usernames as string[]) ?? [],
    createdAt: row.created_at as string,
  }))
}

export async function createCloudRoom(
  title: string,
  members: string[],
): Promise<ChatRoom | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('chat_rooms')
    .insert({ title, member_usernames: members })
    .select('*')
    .single()
  if (error || !data) return null
  return {
    id: data.id as string,
    title: data.title as string,
    memberUsernames: data.member_usernames as string[],
    createdAt: data.created_at as string,
  }
}

export async function fetchMessages(roomId: string): Promise<ChatMessage[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(200)
  return (data ?? []).map((row) => ({
    id: row.id as string,
    roomId: row.room_id as string,
    authorUsername: row.author_username as string,
    authorName: row.author_name as string,
    body: row.body as string,
    createdAt: row.created_at as string,
  }))
}

export async function sendCloudMessage(
  message: Omit<ChatMessage, 'id' | 'createdAt'>,
): Promise<ChatMessage | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('chat_messages')
    .insert({
      room_id: message.roomId,
      author_username: message.authorUsername,
      author_name: message.authorName,
      body: message.body,
    })
    .select('*')
    .single()
  if (error || !data) return null
  return {
    id: data.id as string,
    roomId: data.room_id as string,
    authorUsername: data.author_username as string,
    authorName: data.author_name as string,
    body: data.body as string,
    createdAt: data.created_at as string,
  }
}

export function subscribeMessages(
  roomId: string,
  onInsert: (message: ChatMessage) => void,
): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const channel = sb
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, string>
        onInsert({
          id: row.id,
          roomId: row.room_id,
          authorUsername: row.author_username,
          authorName: row.author_name,
          body: row.body,
          createdAt: row.created_at,
        })
      },
    )
    .subscribe()
  return () => {
    void sb.removeChannel(channel)
  }
}

export async function pushDiaryEntry(username: string, entry: DiaryEntry): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('diary_entries').upsert({
    id: entry.id,
    username,
    entry_date: entry.date,
    meal: entry.meal,
    name: entry.name,
    servings: entry.servings,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
  })
}

export async function removeDiaryEntry(id: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('diary_entries').delete().eq('id', id)
}

export async function clearDiaryDay(username: string, date: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('diary_entries').delete().eq('username', username).eq('entry_date', date)
}

export async function fetchDiary(username: string): Promise<DiaryEntry[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data } = await sb
    .from('diary_entries')
    .select('*')
    .eq('username', username)
    .order('created_at', { ascending: true })
  return (data ?? []).map((row) => ({
    id: row.id as string,
    date: row.entry_date as string,
    meal: row.meal as DiaryEntry['meal'],
    name: row.name as string,
    servings: Number(row.servings),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    createdAt: row.created_at as string,
  }))
}
