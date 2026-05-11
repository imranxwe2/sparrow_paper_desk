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
]

const drift = (symbol: string, tick: number): number => {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const wave = Math.sin((tick + seed) * 0.08) * 0.012
  const noise = (Math.sin(seed * 0.7 + tick * 0.11) * 0.5 + 0.5) * 0.006
  return 1 + wave + noise - 0.003
}

export function pricesAtTick(tick: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of SYMBOLS) {
    out[s.symbol] = Math.round(s.basePrice * drift(s.symbol, tick) * 100) / 100
  }
  return out
}
