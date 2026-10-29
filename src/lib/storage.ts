import type { AppState, UserProfile } from '../types'

const STORAGE_KEY = 'ourcal.v2'

function migrateProfile(raw: Record<string, unknown> | null): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<UserProfile>
  if (!p.name || !p.calorieGoal) return null
  return {
    name: p.name,
    username:
      typeof p.username === 'string' && p.username.length > 0
        ? p.username
        : p.name.toLowerCase().replace(/\s+/g, '').slice(0, 16) || 'ourcal_user',
    avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl : '',
    sex: p.sex ?? 'male',
    age: p.age ?? 22,
    heightCm: p.heightCm ?? 170,
    weightKg: p.weightKg ?? 70,
    activity: p.activity ?? 'moderate',
    goal: p.goal ?? 'maintain',
    calorieGoal: p.calorieGoal,
    macroGoals: p.macroGoals ?? { protein: 120, carbs: 200, fat: 65 },
  }
}

export const emptyState = (): AppState => ({
  profile: null,
  entries: [],
  customFoods: [],
  friends: [],
  chatRooms: [],
  chatMessages: [],
  earnedBadges: [],
  cloudUserId: null,
  deletedEntryIds: [],
  deletedFriendUsernames: [],
})

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacy = localStorage.getItem('ourcal.v1')
      if (legacy) {
        const parsed = JSON.parse(legacy) as AppState
        const migrated: AppState = {
          ...emptyState(),
          profile: migrateProfile(parsed.profile as unknown as Record<string, unknown>),
          entries: Array.isArray(parsed.entries) ? parsed.entries : [],
          customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
          friends: Array.isArray(parsed.friends) ? parsed.friends : [],
          chatRooms: Array.isArray(parsed.chatRooms) ? parsed.chatRooms : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
        }
        saveState(migrated)
        return migrated
      }
      return emptyState()
    }
    const parsed = JSON.parse(raw) as AppState
    return {
      profile: migrateProfile(parsed.profile as unknown as Record<string, unknown>),
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
      friends: Array.isArray(parsed.friends) ? parsed.friends : [],
      chatRooms: Array.isArray(parsed.chatRooms) ? parsed.chatRooms : [],
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
      earnedBadges: Array.isArray(parsed.earnedBadges) ? parsed.earnedBadges : [],
      cloudUserId: parsed.cloudUserId ?? null,
      deletedEntryIds: Array.isArray(parsed.deletedEntryIds) ? parsed.deletedEntryIds : [],
      deletedFriendUsernames: Array.isArray(parsed.deletedFriendUsernames)
        ? parsed.deletedFriendUsernames
        : [],
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: 'OurCal',
      version: 2,
      ...state,
    },
    null,
    2,
  )
}

export function parseImportJson(text: string): AppState {
  const data = JSON.parse(text) as Partial<AppState> & { version?: number }
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file')
  }
  return {
    profile: migrateProfile(data.profile as unknown as Record<string, unknown>),
    entries: Array.isArray(data.entries) ? data.entries : [],
    customFoods: Array.isArray(data.customFoods) ? data.customFoods : [],
    friends: Array.isArray(data.friends) ? data.friends : [],
    chatRooms: Array.isArray(data.chatRooms) ? data.chatRooms : [],
    chatMessages: Array.isArray(data.chatMessages) ? data.chatMessages : [],
    earnedBadges: Array.isArray(data.earnedBadges) ? data.earnedBadges : [],
    cloudUserId: data.cloudUserId ?? null,
    deletedEntryIds: Array.isArray(data.deletedEntryIds) ? data.deletedEntryIds : [],
    deletedFriendUsernames: Array.isArray(data.deletedFriendUsernames)
      ? data.deletedFriendUsernames
      : [],
  }
}
