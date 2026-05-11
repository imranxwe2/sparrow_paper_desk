import { SYMBOLS } from './mockMarket'

const ONBOARD_KEY = 'sparrow_onboarding_v1'
const PAPER_KEY = 'sparrow_paper_v1'
const WATCHLIST_KEY = 'sparrow_watchlist_v1'

const VALID_SYMBOLS = new Set(SYMBOLS.map((s) => s.symbol))

export function getOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === '1'
  } catch {
    return false
  }
}

export function setOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARD_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function loadPaperRaw(): string | null {
  try {
    return localStorage.getItem(PAPER_KEY)
  } catch {
    return null
  }
}

export function savePaperRaw(json: string): void {
  try {
    localStorage.setItem(PAPER_KEY, json)
  } catch {
    /* ignore */
  }
}

export function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    if (!raw) return []
    const o = JSON.parse(raw) as unknown
    if (!Array.isArray(o)) return []
    return o.filter((x): x is string => typeof x === 'string' && VALID_SYMBOLS.has(x))
  } catch {
    return []
  }
}

export function saveWatchlist(symbols: string[]): void {
  try {
    const cleaned = [...new Set(symbols.filter((s) => VALID_SYMBOLS.has(s)))]
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(cleaned))
  } catch {
    /* ignore */
  }
}
