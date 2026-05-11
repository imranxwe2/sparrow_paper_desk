/* eslint-disable react-refresh/only-export-components -- provider + hook */
import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ACHIEVEMENT_BY_ID, type AchievementId } from '../lib/achievementCatalog'
import { loadAchievementState, saveAchievementState, type PersistedAchievementState } from '../lib/achievementStorage'
import { SYMBOLS } from '../lib/mockMarket'
import type { PaperSnapshot } from './PaperTradingContext'
import { usePaper } from './PaperTradingContext'

const DIAMOND_TICKS = 48
const RISK_STREAK_NEED = 15
const CASH_RATIO = 0.3
const MIN_EQUITY_FOR_RISK = 5_000
const GREEN_DAYS_NEED = 10
const DIVERSIFIED_NEED = 4

function localDateKey(d = new Date()): string {
  return d.toLocaleDateString('en-CA')
}

function equityOf(s: PaperSnapshot): number {
  let m = s.cash
  for (const [sym, p] of Object.entries(s.positions)) {
    if (p.qty <= 0) continue
    const px = s.lastPrices[sym] ?? p.avgCost
    m += px * p.qty
  }
  return Math.round(m * 100) / 100
}

function qtyMap(snapshot: PaperSnapshot): Record<string, number> {
  const m: Record<string, number> = {}
  for (const s of SYMBOLS) {
    m[s.symbol] = snapshot.positions[s.symbol]?.qty ?? 0
  }
  return m
}

function stepAchievements(
  prev: PersistedAchievementState,
  snapshot: PaperSnapshot,
  tick: number,
): PersistedAchievementState {
  const tickChanged = prev.lastSeenQuoteTick !== tick
  const equity = equityOf(snapshot)
  const todayKey = localDateKey()

  let activeDayKey = prev.activeDayKey
  const dayBook = { ...prev.dayBook }
  let greenDayKeys = [...prev.greenDayKeys]

  if (activeDayKey == null) {
    activeDayKey = todayKey
    dayBook[todayKey] = { open: equity, last: equity }
  } else if (activeDayKey !== todayKey) {
    const book = dayBook[activeDayKey]
    if (book && book.last > book.open && !greenDayKeys.includes(activeDayKey)) {
      greenDayKeys = [...greenDayKeys, activeDayKey]
    }
    activeDayKey = todayKey
    dayBook[todayKey] = { open: equity, last: equity }
  } else {
    const b = dayBook[todayKey] ?? { open: equity, last: equity }
    dayBook[todayKey] = { open: b.open, last: equity }
  }

  const holdStreakBySymbol: Record<string, number> = { ...prev.holdStreakBySymbol }
  const prevQtyBySymbol: Record<string, number> = { ...prev.prevQtyBySymbol }
  let qtyAtLastTick: Record<string, number> = { ...prev.qtyAtLastTick }

  const currentQty = qtyMap(snapshot)

  if (tickChanged) {
    for (const s of SYMBOLS) {
      const sym = s.symbol
      const q = currentQty[sym] ?? 0
      const qLast = qtyAtLastTick[sym]
      if (q > 0) {
        if (qLast === undefined) holdStreakBySymbol[sym] = 1
        else if (q === qLast) holdStreakBySymbol[sym] = (holdStreakBySymbol[sym] ?? 0) + 1
        else holdStreakBySymbol[sym] = 1
      } else {
        holdStreakBySymbol[sym] = 0
      }
    }
    qtyAtLastTick = { ...currentQty }
  } else {
    for (const s of SYMBOLS) {
      const sym = s.symbol
      const q = currentQty[sym] ?? 0
      const pq = prev.prevQtyBySymbol[sym]
      if (pq !== undefined && q !== pq) {
        holdStreakBySymbol[sym] = q > 0 ? 1 : 0
      }
    }
  }

  for (const s of SYMBOLS) {
    prevQtyBySymbol[s.symbol] = currentQty[s.symbol] ?? 0
  }

  let riskReserveStreak = prev.riskReserveStreak
  if (tickChanged) {
    if (equity >= MIN_EQUITY_FOR_RISK && equity > 0 && snapshot.cash / equity >= CASH_RATIO - 1e-9) {
      riskReserveStreak += 1
    } else {
      riskReserveStreak = 0
    }
  }

  const diamondMax = Math.max(0, ...SYMBOLS.map((s) => holdStreakBySymbol[s.symbol] ?? 0))
  const symCount = SYMBOLS.filter((s) => (snapshot.positions[s.symbol]?.qty ?? 0) >= 1).length
  const profitableSell = snapshot.ledger.some(
    (r) =>
      r.side === 'SELL' &&
      r.avgCostAtSell != null &&
      (r.price - r.avgCostAtSell) * r.qty > 1e-4,
  )

  const unlocked = new Set(prev.unlocked)
  if (profitableSell) unlocked.add('first_profitable_trade')
  if (diamondMax >= DIAMOND_TICKS) unlocked.add('diamond_hands')
  if (riskReserveStreak >= RISK_STREAK_NEED) unlocked.add('risk_manager')
  if (symCount >= DIVERSIFIED_NEED) unlocked.add('diversified_portfolio')
  if (greenDayKeys.length >= GREEN_DAYS_NEED) unlocked.add('ten_green_days')

  return {
    unlocked: Array.from(unlocked),
    holdStreakBySymbol,
    riskReserveStreak,
    dayBook,
    activeDayKey,
    greenDayKeys,
    prevQtyBySymbol,
    qtyAtLastTick,
    lastSeenQuoteTick: tick,
  }
}

type UnlockToast = { id: AchievementId; title: string } | null

type AchievementsCtx = {
  unlocked: AchievementId[]
  progress: {
    diamondHands: { current: number; target: number }
    riskManager: { current: number; target: number }
    greenDays: { current: number; target: number }
  }
  lastUnlock: UnlockToast
  clearLastUnlock: () => void
}

const AchCtx = createContext<AchievementsCtx | null>(null)

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { snapshot, tick } = usePaper()
  const [internal, setInternal] = useState<PersistedAchievementState>(() => loadAchievementState())
  const [lastUnlock, setLastUnlock] = useState<UnlockToast>(null)
  useEffect(() => {
    const id = window.setTimeout(() => {
      setInternal((prev) => {
        const next = stepAchievements(prev, snapshot, tick)
        saveAchievementState(next)
        const newly = next.unlocked.filter((x) => !prev.unlocked.includes(x))
        if (newly.length) {
          const u = newly[0]
          queueMicrotask(() => setLastUnlock({ id: u, title: ACHIEVEMENT_BY_ID[u].title }))
        }
        return next
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [tick, snapshot])

  const clearLastUnlock = useCallback(() => setLastUnlock(null), [])

  const progress = useMemo(() => {
    const diamondMax = Math.max(0, ...SYMBOLS.map((s) => internal.holdStreakBySymbol[s.symbol] ?? 0))
    return {
      diamondHands: { current: diamondMax, target: DIAMOND_TICKS },
      riskManager: { current: internal.riskReserveStreak, target: RISK_STREAK_NEED },
      greenDays: { current: internal.greenDayKeys.length, target: GREEN_DAYS_NEED },
    }
  }, [internal])

  const value = useMemo(
    () => ({
      unlocked: internal.unlocked,
      progress,
      lastUnlock,
      clearLastUnlock,
    }),
    [internal, progress, lastUnlock, clearLastUnlock],
  )

  return <AchCtx.Provider value={value}>{children}</AchCtx.Provider>
}

export function useAchievements(): AchievementsCtx {
  const v = useContext(AchCtx)
  if (!v) throw new Error('useAchievements must be used within AchievementsProvider')
  return v
}
