import type { AchievementId } from './achievementCatalog'

const KEY = 'sparrow_achievements_v1'

export type PersistedAchievementState = {
  unlocked: AchievementId[]
  holdStreakBySymbol: Record<string, number>
  riskReserveStreak: number
  /** Calendar day (YYYY-MM-DD) → open & last equity for that local day */
  dayBook: Record<string, { open: number; last: number }>
  activeDayKey: string | null
  /** Days that closed green (last > open), unique keys */
  greenDayKeys: string[]
  /** Last observed qty per symbol (intra-tick change detection) */
  prevQtyBySymbol: Record<string, number>
  /** Qty snapshot at last quote tick boundary (diamond hands) */
  qtyAtLastTick: Record<string, number>
  /** Last quote tick index processed (avoids double-counting in dev StrictMode) */
  lastSeenQuoteTick: number
}

export const defaultAchievementState = (): PersistedAchievementState => ({
  unlocked: [],
  holdStreakBySymbol: {},
  riskReserveStreak: 0,
  dayBook: {},
  activeDayKey: null,
  greenDayKeys: [],
  prevQtyBySymbol: {},
  qtyAtLastTick: {},
  lastSeenQuoteTick: -1,
})

export function loadAchievementState(): PersistedAchievementState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultAchievementState()
    const o = JSON.parse(raw) as Partial<PersistedAchievementState>
    return {
      unlocked: Array.isArray(o.unlocked) ? (o.unlocked as AchievementId[]) : [],
      holdStreakBySymbol:
        o.holdStreakBySymbol && typeof o.holdStreakBySymbol === 'object' ? o.holdStreakBySymbol : {},
      riskReserveStreak: typeof o.riskReserveStreak === 'number' ? o.riskReserveStreak : 0,
      dayBook: o.dayBook && typeof o.dayBook === 'object' ? o.dayBook : {},
      activeDayKey: typeof o.activeDayKey === 'string' || o.activeDayKey === null ? o.activeDayKey : null,
      greenDayKeys: Array.isArray(o.greenDayKeys) ? o.greenDayKeys : [],
      prevQtyBySymbol:
        o.prevQtyBySymbol && typeof o.prevQtyBySymbol === 'object' ? o.prevQtyBySymbol : {},
      qtyAtLastTick:
        o.qtyAtLastTick && typeof o.qtyAtLastTick === 'object' ? o.qtyAtLastTick : {},
      lastSeenQuoteTick: typeof o.lastSeenQuoteTick === 'number' ? o.lastSeenQuoteTick : -1,
    }
  } catch {
    return defaultAchievementState()
  }
}

export function saveAchievementState(s: PersistedAchievementState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

/** Persist default empty achievement progress (fresh unlock run). */
export function resetPersistedAchievementState(): void {
  saveAchievementState(defaultAchievementState())
}
