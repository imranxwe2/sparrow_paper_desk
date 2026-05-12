export type SymbolInfo = {
  symbol: string
  name: string
  basePrice: number
}

export const SYMBOLS: SymbolInfo[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 189.5 },
  { symbol: 'MSFT', name: 'Microsoft', basePrice: 378.2 },
  { symbol: 'GOOGL', name: 'Alphabet', basePrice: 141.8 },
  { symbol: 'AMZN', name: 'Amazon', basePrice: 178.4 },
  { symbol: 'NVDA', name: 'NVIDIA', basePrice: 892.1 },
  { symbol: 'META', name: 'Meta', basePrice: 485.6 },
  { symbol: 'TSLA', name: 'Tesla', basePrice: 202.4 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', basePrice: 175.2 },
  { symbol: 'NFLX', name: 'Netflix', basePrice: 582.1 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', basePrice: 412.3 },
  { symbol: 'JPM', name: 'JPMorgan Chase', basePrice: 195.8 },
  { symbol: 'V', name: 'Visa', basePrice: 285.4 },
  { symbol: 'WMT', name: 'Walmart', basePrice: 60.2 },
  { symbol: 'DIS', name: 'Walt Disney', basePrice: 112.5 },
  { symbol: 'COIN', name: 'Coinbase', basePrice: 245.9 },
  { symbol: 'PLTR', name: 'Palantir', basePrice: 24.5 },
  { symbol: 'INTC', name: 'Intel', basePrice: 43.2 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', basePrice: 512.3 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', basePrice: 438.2 },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', basePrice: 205.1 },
]

const HEADLINES_POS = [
  "crushes earnings expectations",
  "announces breakthrough product",
  "secures massive government contract",
  "upgraded by major analysts",
  "acquires promising startup"
]

const HEADLINES_NEG = [
  "misses revenue estimates",
  "faces regulatory probe",
  "CEO unexpectedly steps down",
  "downgraded on growth concerns",
  "supply chain issues persist"
]

export type NewsEvent = {
  id: string
  symbol: string
  headline: string
  impact: number
  startTick: number
}

export function getLatestNews(tick: number): NewsEvent {
  const cycleLength = 90 // new news every 6 minutes
  const cycle = Math.floor(tick / cycleLength)
  
  const rand = (n: number) => {
    const x = Math.sin(cycle * 13.54 + n) * 10000
    return x - Math.floor(x)
  }
  
  const symIdx = Math.floor(rand(1) * SYMBOLS.length)
  const symbol = SYMBOLS[symIdx].symbol
  
  const isPos = rand(2) > 0.5
  const headlines = isPos ? HEADLINES_POS : HEADLINES_NEG
  const headlineIdx = Math.floor(rand(3) * headlines.length)
  
  const impactMag = 0.02 + rand(4) * 0.06
  const impact = isPos ? (1 + impactMag) : (1 - impactMag)
  
  return {
    id: `news-${cycle}`,
    symbol,
    headline: `${symbol} ${headlines[headlineIdx]}`,
    impact,
    startTick: cycle * cycleLength
  }
}

function newsMultiplier(symbol: string, tick: number): number {
  let mult = 1
  const cycleLength = 90
  const currentCycle = Math.floor(tick / cycleLength)
  
  for (let i = 0; i < 3; i++) {
    const cycle = currentCycle - i
    if (cycle < 0) continue
    
    const startTick = cycle * cycleLength
    const rand = (n: number) => {
      const x = Math.sin(cycle * 13.54 + n) * 10000
      return x - Math.floor(x)
    }
    
    const symIdx = Math.floor(rand(1) * SYMBOLS.length)
    const sym = SYMBOLS[symIdx].symbol
    if (sym !== symbol) continue
    
    const isPos = rand(2) > 0.5
    const impactMag = 0.02 + rand(4) * 0.06
    const impact = isPos ? (1 + impactMag) : (1 - impactMag)
    
    const ticksSince = tick - startTick
    let fade = 1
    if (ticksSince < 10) fade = ticksSince / 10
    if (ticksSince > 60) fade = Math.max(0, 1 - (ticksSince - 60) / 30)
    
    mult *= (1 + (impact - 1) * fade)
  }
  return mult
}

const drift = (symbol: string, tick: number): number => {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const w1 = Math.sin(tick * 0.05 + seed) * 0.015
  const w2 = Math.sin(tick * 0.017 + seed * 1.3) * 0.03
  const w3 = Math.sin(tick * 0.0031 + seed * 2.7) * 0.08
  const w4 = Math.sin(tick * 0.0007 + seed * 4.1) * 0.15
  const noise = (Math.sin(tick * 0.89 + seed * 5) * Math.cos(tick * 1.2 + seed)) * 0.004
  const baseDrift = Math.max(0.01, 1 + w1 + w2 + w3 + w4 + noise)
  return baseDrift * newsMultiplier(symbol, tick)
}

/** Half-spread in dollars (bid = mid − half, ask = mid + half). */
function halfSpreadDollars(symbol: string): number {
  if (['SPY', 'QQQ', 'AAPL'].includes(symbol)) return 0.01
  if (['NVDA', 'META', 'NFLX', 'MSFT'].includes(symbol)) return 0.03
  return 0.01
}

export type Quote = { last: number; bid: number; ask: number }

/** Mid (last), bid, and ask for every symbol at this tick. Pure. */
export function quoteBookAtTick(tick: number): Record<string, Quote> {
  const out: Record<string, Quote> = {}
  for (const s of SYMBOLS) {
    const mid = Math.round(s.basePrice * drift(s.symbol, tick) * 100) / 100
    const half = halfSpreadDollars(s.symbol)
    const bid = Math.max(0.01, Math.round((mid - half) * 100) / 100)
    const ask = Math.round((mid + half) * 100) / 100
    out[s.symbol] = { last: mid, bid, ask }
  }
  return out
}

/** Mid / “last” price per symbol (mark-to-market baseline). */
export function pricesAtTick(tick: number): Record<string, number> {
  const book = quoteBookAtTick(tick)
  const out: Record<string, number> = {}
  for (const s of SYMBOLS) {
    out[s.symbol] = book[s.symbol].last
  }
  return out
}

/**
 * Generate historical OHLC (Open, High, Low, Close) candlestick data 
 * dynamically without needing a database, because the market math is deterministic.
 */
export type OHLC = {
  time: number // Unix timestamp in seconds
  open: number
  high: number
  low: number
  close: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function generateCandles(
  symbol: string, 
  currentTick: number, 
  ticksPerCandle: number = 15, // 15 ticks * 4s = 1 minute candles
  numCandles: number = 100
): OHLC[] {
  const candles: OHLC[] = []
  
  // Find the current candle index
  const currentCandleIndex = Math.floor(currentTick / ticksPerCandle)
  const startCandleIndex = Math.max(0, currentCandleIndex - numCandles + 1)

  for (let i = startCandleIndex; i <= currentCandleIndex; i++) {
    const tickStart = i * ticksPerCandle
    // If it's the current active candle, only go up to the current tick
    const tickEnd = i === currentCandleIndex ? currentTick : tickStart + ticksPerCandle - 1
    
    let open = 0
    let high = -Infinity
    let low = Infinity
    let close = 0

    // Sample the deterministic price at every tick in this candle's range
    for (let t = tickStart; t <= tickEnd; t++) {
      const book = quoteBookAtTick(t)
      const px = book[symbol]?.last ?? 0
      if (t === tickStart) open = px
      if (t === tickEnd) close = px
      if (px > high) high = px
      if (px < low) low = px
    }

    // Convert candle index to a real-world unix timestamp (in seconds)
    // We know currentTick = Math.floor(Date.now() / 4000). 
    // Therefore, tickStart * 4000 is the exact Unix timestamp in milliseconds.
    // So tickStart * 4 is the exact Unix timestamp in seconds.
    const candleTimeSeconds = tickStart * 4

    candles.push({
      time: candleTimeSeconds,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close)
    })
  }

  return candles
}
