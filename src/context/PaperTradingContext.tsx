/* eslint-disable react-refresh/only-export-components -- provider + hook pattern */
import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { pricesAtTick } from '../lib/mockMarket'
import { loadPaperRaw, savePaperRaw } from '../lib/storage'

const START_CASH = 100_000

export type Position = { qty: number; avgCost: number }

export type LedgerRow = {
  id: string
  t: number
  side: 'BUY' | 'SELL'
  symbol: string
  qty: number
  price: number
  total: number
  /** Present on SELL rows: average cost of shares sold (for P&L / achievements) */
  avgCostAtSell?: number
}

export type PaperSnapshot = {
  cash: number
  positions: Record<string, Position>
  ledger: LedgerRow[]
  lastPrices: Record<string, number>
}

type Ctx = {
  tick: number
  snapshot: PaperSnapshot
  buy: (symbol: string, qty: number) => { ok: true } | { ok: false; reason: string }
  sell: (symbol: string, qty: number) => { ok: true } | { ok: false; reason: string }
  resetPaper: () => void
}

const PaperCtx = createContext<Ctx | null>(null)

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function defaultState(): Omit<PaperSnapshot, 'lastPrices'> {
  return {
    cash: START_CASH,
    positions: {},
    ledger: [],
  }
}

function parseStored(raw: string | null): Omit<PaperSnapshot, 'lastPrices'> | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Omit<PaperSnapshot, 'lastPrices'>
    if (typeof o.cash !== 'number' || typeof o.positions !== 'object') return null
    return {
      cash: o.cash,
      positions: o.positions,
      ledger: Array.isArray(o.ledger) ? o.ledger : [],
    }
  } catch {
    return null
  }
}

let initialPaperCache: Omit<PaperSnapshot, 'lastPrices'> | undefined
function initialPaper(): Omit<PaperSnapshot, 'lastPrices'> {
  if (!initialPaperCache) {
    initialPaperCache = parseStored(loadPaperRaw()) ?? defaultState()
  }
  return initialPaperCache
}

export function PaperTradingProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0)
  const [cash, setCash] = useState(() => initialPaper().cash)
  const [positions, setPositions] = useState(() => initialPaper().positions)
  const [ledger, setLedger] = useState(() => initialPaper().ledger)

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 4000)
    return () => window.clearInterval(id)
  }, [])

  const lastPrices = useMemo(() => pricesAtTick(tick), [tick])

  useEffect(() => {
    const snap: PaperSnapshot = { cash, positions, ledger, lastPrices }
    savePaperRaw(
      JSON.stringify({
        cash: snap.cash,
        positions: snap.positions,
        ledger: snap.ledger,
      }),
    )
  }, [cash, positions, ledger, lastPrices])

  const buy = useCallback(
    (symbol: string, qty: number): { ok: true } | { ok: false; reason: string } => {
      const q = Math.floor(qty)
      if (q <= 0) return { ok: false, reason: 'Quantity must be a positive whole number.' }
      const price = lastPrices[symbol]
      if (price == null) return { ok: false, reason: 'Unknown symbol.' }
      const total = Math.round(price * q * 100) / 100
      if (total > cash + 1e-6) return { ok: false, reason: 'Not enough paper cash for this order.' }

      setCash((c) => Math.round((c - total) * 100) / 100)
      setPositions((prev) => {
        const cur = prev[symbol] ?? { qty: 0, avgCost: 0 }
        const newQty = cur.qty + q
        const newAvg =
          newQty === 0
            ? 0
            : Math.round(((cur.avgCost * cur.qty + price * q) / newQty) * 10000) / 10000
        return { ...prev, [symbol]: { qty: newQty, avgCost: newAvg } }
      })
      setLedger((L) => [
        {
          id: uid(),
          t: Date.now(),
          side: 'BUY',
          symbol,
          qty: q,
          price,
          total,
        },
        ...L,
      ])
      return { ok: true }
    },
    [cash, lastPrices],
  )

  const sell = useCallback(
    (symbol: string, qty: number): { ok: true } | { ok: false; reason: string } => {
      const q = Math.floor(qty)
      if (q <= 0) return { ok: false, reason: 'Quantity must be a positive whole number.' }
      const price = lastPrices[symbol]
      if (price == null) return { ok: false, reason: 'Unknown symbol.' }
      const cur = positions[symbol]
      if (!cur || cur.qty < q) return { ok: false, reason: 'You do not hold enough shares to sell.' }

      const total = Math.round(price * q * 100) / 100
      setCash((c) => Math.round((c + total) * 100) / 100)
      setPositions((prev) => {
        const holding = prev[symbol]
        if (!holding) return prev
        const nextQty = holding.qty - q
        if (nextQty <= 0) {
          const rest = { ...prev }
          delete rest[symbol]
          return rest
        }
        return { ...prev, [symbol]: { qty: nextQty, avgCost: holding.avgCost } }
      })
      setLedger((L) => [
        {
          id: uid(),
          t: Date.now(),
          side: 'SELL',
          symbol,
          qty: q,
          price,
          total,
          avgCostAtSell: cur.avgCost,
        },
        ...L,
      ])
      return { ok: true }
    },
    [lastPrices, positions],
  )

  const resetPaper = useCallback(() => {
    const d = defaultState()
    setCash(d.cash)
    setPositions(d.positions)
    setLedger(d.ledger)
  }, [])

  const snapshot: PaperSnapshot = useMemo(
    () => ({ cash, positions, ledger, lastPrices }),
    [cash, positions, ledger, lastPrices],
  )

  const value = useMemo(
    () => ({ tick, snapshot, buy, sell, resetPaper }),
    [tick, snapshot, buy, sell, resetPaper],
  )

  return <PaperCtx.Provider value={value}>{children}</PaperCtx.Provider>
}

export function usePaper(): Ctx {
  const v = useContext(PaperCtx)
  if (!v) throw new Error('usePaper must be used within PaperTradingProvider')
  return v
}
