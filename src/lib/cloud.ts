import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { FoodItem } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

export function isCloudEnabled(): boolean {
  return Boolean(url && anon)
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
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud sync is not configured on this deployment.' }

  const normalized = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    return { ok: false, error: 'Username must be 3–20 characters: letters, numbers, underscore.' }
  }

  const { data: existing } = await sb
    .from('profiles')
    .select('username')
    .eq('username', normalized)
    .maybeSingle()

  if (existing) return { ok: false, error: 'That username is taken.' }

  const { data, error } = await sb
    .from('profiles')
    .insert({
      username: normalized,
      display_name: displayName,
      avatar_url: avatarUrl || null,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, userId: data.id as string }
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

  const { error } = await sb
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('username', username)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
