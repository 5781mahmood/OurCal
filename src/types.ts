export type Sex = 'male' | 'female'
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'
export type GoalType = 'lose' | 'maintain' | 'gain'
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'

export interface Macros {
  protein: number
  carbs: number
  fat: number
}

export interface UserProfile {
  name: string
  username: string
  avatarUrl: string
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: GoalType
  calorieGoal: number
  macroGoals: Macros
}

export interface FoodItem {
  id: string
  name: string
  brand?: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  /** Set when synced from community catalog */
  contributedBy?: string
}

export interface DiaryEntry {
  id: string
  date: string
  meal: MealType
  name: string
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  createdAt: string
}

export interface FriendLink {
  username: string
  displayName: string
  avatarUrl: string
  addedAt: string
}

export interface ChatMessage {
  id: string
  roomId: string
  authorUsername: string
  authorName: string
  body: string
  createdAt: string
}

export interface ChatRoom {
  id: string
  title: string
  memberUsernames: string[]
  createdAt: string
}

export type BadgeId =
  | 'first_log'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'balance_80'
  | 'friend_1'
  | 'community_food'

export interface EarnedBadge {
  id: BadgeId
  earnedAt: string
}

export interface AppState {
  profile: UserProfile | null
  entries: DiaryEntry[]
  customFoods: FoodItem[]
  friends: FriendLink[]
  chatRooms: ChatRoom[]
  chatMessages: ChatMessage[]
  earnedBadges: EarnedBadge[]
  cloudUserId: string | null
  /** Entry IDs deleted locally so sync does not resurrect them. */
  deletedEntryIds: string[]
  /** Friend usernames removed locally so sync does not resurrect them. */
  deletedFriendUsernames: string[]
}

export type ViewId = 'today' | 'stats' | 'community' | 'profile'
