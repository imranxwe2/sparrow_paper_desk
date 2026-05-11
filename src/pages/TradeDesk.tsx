import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AchievementsPanel } from '../components/AchievementsPanel'
import { AIAssistantPanel } from '../components/AIAssistantPanel'
import { GlossaryTip } from '../components/GlossaryTip'
import { SparrowMark } from '../components/SparrowMark'
import { useAchievements } from '../context/AchievementsContext'
import { usePaper } from '../context/PaperTradingContext'
import { formatRelativeTime } from '../lib/formatTime'
import { GLOSSARY } from '../lib/glossary'
import { buyFeeForOrder, sellFeeForOrder } from '../lib/paperFees'
import { quoteBookAtTick, SYMBOLS } from '../lib/mockMarket'
import { loadWatchlist, saveWatchlist } from '../lib/storage'

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n >= 100 ? 0 : 2,
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function openSellQtyForSymbol(
  openOrders: { side: string; symbol: string; qty: number }[],
  symbol: string,
): number {
  return openOrders
    .filter((o) => o.side === 'SELL' && o.symbol === symbol)
    .reduce((a, o) => a + o.qty, 0)
}

type ToastTone = 'ok' | 'err' | 'info'
type ToastState = { text: string; tone: ToastTone } | null

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export default function TradeDesk() {
  const navigate = useNavigate()
  const {
    snapshot,
    buy,
    sell,
    resetPaper,
    tick,
    placeLimitBuy,
    placeLimitSell,
    cancelOpenOrder,
  } = usePaper()
  const { lastUnlock, clearLastUnlock, resetAchievementProgress } = useAchievements()
  const [symbol, setSymbol] = useState(SYMBOLS[0].symbol)
  const [qty, setQty] = useState('10')
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  const [mobileTab, setMobileTab] = useState<'desk' | 'coach'>('desk')
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist())

  useEffect(() => {
    saveWatchlist(watchlist)
  }, [watchlist])

  const bid = snapshot.bidPrices[symbol]
  const ask = snapshot.askPrices[symbol]
  const mid = snapshot.lastPrices[symbol]
  const qtyNum = Math.max(0, Math.floor(Number(qty) || 0))
  const position = snapshot.positions[symbol]
  const limitNum = Number(limitPrice)
  const limitPx = Number.isFinite(limitNum) && limitNum > 0 ? round2(limitNum) : null

  const equity = useMemo(() => {
    let m = snapshot.cash
    for (const [sym, p] of Object.entries(snapshot.positions)) {
      if (p.qty <= 0) continue
      const px = snapshot.lastPrices[sym] ?? p.avgCost
      m += px * p.qty
    }
    return m
  }, [snapshot])

  const unrealizedPnl = useMemo(() => {
    let t = 0
    for (const [sym, p] of Object.entries(snapshot.positions)) {
      if (p.qty <= 0) continue
      const px = snapshot.lastPrices[sym] ?? p.avgCost
      t += (px - p.avgCost) * p.qty
    }
    return round2(t)
  }, [snapshot])

  const maxBuyQty = useMemo(() => {
    if (ask == null || ask <= 0) return 0
    return Math.floor(snapshot.cash / ask)
  }, [snapshot.cash, ask])

  const maxSellAvail = useMemo(() => {
    const locked = openSellQtyForSymbol(snapshot.openOrders, symbol)
    return Math.max(0, (position?.qty ?? 0) - locked)
  }, [snapshot.openOrders, position, symbol])

  const buyFee = qtyNum > 0 ? buyFeeForOrder(qtyNum) : 0
  const sellFee = qtyNum > 0 ? sellFeeForOrder(qtyNum) : 0

  const marketBuyGross = ask != null && qtyNum > 0 ? round2(ask * qtyNum) : null
  const marketBuyTotal =
    marketBuyGross != null ? round2(marketBuyGross + buyFee) : null
  const marketSellGross = bid != null && qtyNum > 0 ? round2(bid * qtyNum) : null
  const marketSellNet =
    marketSellGross != null ? round2(marketSellGross - sellFee) : null

  const estCashAfterMarketBuy =
    marketBuyTotal != null ? round2(snapshot.cash - marketBuyTotal) : null
  const estCashAfterMarketSell =
    marketSellNet != null ? round2(snapshot.cash + marketSellNet) : null

  const limitBuyEscrow =
    limitPx != null && qtyNum > 0 ? round2(limitPx * qtyNum) : null
  const estCashAfterLimitBuyPlace =
    limitBuyEscrow != null ? round2(snapshot.cash - limitBuyEscrow) : null

  const concentration = useMemo(() => {
    const rows: { sym: string; pct: number; value: number }[] = []
    if (equity <= 1e-6) return rows
    for (const [sym, p] of Object.entries(snapshot.positions)) {
      if (p.qty <= 0) continue
      const px = snapshot.lastPrices[sym] ?? p.avgCost
      const value = px * p.qty
      rows.push({ sym, value, pct: (value / equity) * 100 })
    }
    rows.sort((a, b) => b.pct - a.pct)
    return rows
  }, [snapshot, equity])

  const quoteMoves = useMemo(() => {
    if (tick <= 0) return {} as Record<string, 'up' | 'down' | null>
    const prev = quoteBookAtTick(tick - 1)
    const curr = quoteBookAtTick(tick)
    const out: Record<string, 'up' | 'down' | null> = {}
    for (const s of SYMBOLS) {
      const a = prev[s.symbol]?.last
      const b = curr[s.symbol]?.last
      if (a != null && b != null && a !== b) out[s.symbol] = b > a ? 'up' : 'down'
      else out[s.symbol] = null
    }
    return out
  }, [tick])

  const flash = useCallback((text: string, tone: ToastTone = 'info') => {
    setToast({ text, tone })
    window.setTimeout(() => setToast(null), 3400)
  }, [])

  const onMarketBuy = useCallback(() => {
    const r = buy(symbol, qtyNum)
    if (r.ok) flash(`Paper buy filled at ask: ${symbol} × ${qtyNum}`, 'ok')
    else flash(r.reason, 'err')
  }, [buy, flash, symbol, qtyNum])

  const onMarketSell = useCallback(() => {
    const r = sell(symbol, qtyNum)
    if (r.ok) flash(`Paper sell filled at bid: ${symbol} × ${qtyNum}`, 'ok')
    else flash(r.reason, 'err')
  }, [sell, flash, symbol, qtyNum])

  const onLimitBuy = useCallback(() => {
    if (limitPx == null) {
      flash('Enter a positive limit price.', 'err')
      return
    }
    const r = placeLimitBuy(symbol, qtyNum, limitPx)
    if (r.ok) flash(`Limit buy placed: ${symbol} × ${qtyNum} @ ${formatMoney(limitPx)}`, 'ok')
    else flash(r.reason, 'err')
  }, [placeLimitBuy, flash, symbol, qtyNum, limitPx])

  const onLimitSell = useCallback(() => {
    if (limitPx == null) {
      flash('Enter a positive limit price.', 'err')
      return
    }
    const r = placeLimitSell(symbol, qtyNum, limitPx)
    if (r.ok) flash(`Limit sell placed: ${symbol} × ${qtyNum} @ ${formatMoney(limitPx)}`, 'ok')
    else flash(r.reason, 'err')
  }, [placeLimitSell, flash, symbol, qtyNum, limitPx])

  const onPlaceLimitBuy = onLimitBuy
  const onPlaceLimitSell = onLimitSell

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return
      if (orderMode !== 'market') return
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        onMarketBuy()
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        onMarketSell()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onMarketBuy, onMarketSell, orderMode])

  useEffect(() => {
    if (!lastUnlock) return
    const t = window.setTimeout(() => {
      flash(`Achievement unlocked: ${lastUnlock.title}`, 'ok')
      clearLastUnlock()
    }, 0)
    return () => window.clearTimeout(t)
  }, [lastUnlock, clearLastUnlock, flash])

  function toggleWatch(sym: string) {
    setWatchlist((w) => (w.includes(sym) ? w.filter((x) => x !== sym) : [...w, sym]))
  }

  return (
    <div className="min-h-dvh text-sparrow-800">
      <header className="sticky top-0 z-10 border-b border-sparrow-200 bg-white/90 backdrop-blur-md">
        <div className="h-0.5 w-full bg-gradient-to-r from-flame-400/0 via-flame-500/60 to-flame-400/0" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <SparrowMark className="h-9 w-9 drop-shadow-sm" />
            <div>
              <p className="font-display text-lg leading-none text-sparrow-900 italic">Sparrow</p>
              <p className="text-xs text-sparrow-500">Paper desk</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/onboard')}
              className="rounded-full border border-sparrow-200 bg-white px-4 py-2 text-xs font-medium text-sparrow-700 shadow-sm transition hover:border-flame-300 hover:text-flame-800"
            >
              Review onboarding
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all paper positions and cash to starting values?')) {
                  resetPaper()
                  flash('Paper account reset.', 'info')
                }
              }}
              className="rounded-full border border-sparrow-200 bg-white px-4 py-2 text-xs font-medium text-sparrow-500 shadow-sm transition hover:border-sparrow-300"
            >
              Reset paper
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Reset all achievement progress (unlocks, streaks, and day counters)?\n\n' +
                      'Your paper account stays as-is. On the next quote tick, some achievements may unlock again if your portfolio or history already qualifies (for example diversified holdings or a profitable sell in the ledger). For a completely fresh run, use Reset paper as well.',
                  )
                ) {
                  resetAchievementProgress()
                  flash('Achievement progress reset.', 'info')
                }
              }}
              className="rounded-full border border-sparrow-200 bg-white px-4 py-2 text-xs font-medium text-sparrow-500 shadow-sm transition hover:border-flame-300 hover:text-flame-800"
            >
              Reset achievements
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-3 md:px-6">
        <div className="flex rounded-full border border-sparrow-200 bg-white/90 p-1 shadow-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('desk')}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
              mobileTab === 'desk'
                ? 'bg-gradient-to-r from-flame-600 to-flame-700 text-white shadow-sm'
                : 'text-sparrow-600'
            }`}
          >
            Desk
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('coach')}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
              mobileTab === 'coach'
                ? 'bg-gradient-to-r from-flame-600 to-flame-700 text-white shadow-sm'
                : 'text-sparrow-600'
            }`}
          >
            Coach
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 md:grid-cols-2 md:px-6 lg:gap-8">
        <section
          className={`space-y-6 ${mobileTab === 'desk' ? 'block' : 'hidden'} md:block`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
              <p className="text-xs font-medium uppercase tracking-wide text-sparrow-400">Cash</p>
              <p className="mt-1 font-display text-2xl text-sparrow-900">{formatMoney(snapshot.cash)}</p>
              <p className="mt-1 text-xs text-sparrow-400">
                <GlossaryTip term="escrow">Reserved for open limit buys is reflected here.</GlossaryTip>
              </p>
            </div>
            <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
              <p className="text-xs font-medium uppercase tracking-wide text-sparrow-400">
                <GlossaryTip term="equity">Est. equity</GlossaryTip>
              </p>
              <p className="mt-1 font-display text-2xl text-sparrow-900">{formatMoney(equity)}</p>
            </div>
            <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
              <p className="text-xs font-medium uppercase tracking-wide text-sparrow-400">Unrealized P&L</p>
              <p
                className={`mt-1 font-display text-2xl ${
                  unrealizedPnl > 0
                    ? 'text-emerald-700'
                    : unrealizedPnl < 0
                      ? 'text-red-600'
                      : 'text-sparrow-900'
                }`}
              >
                {unrealizedPnl === 0 ? '—' : `${unrealizedPnl > 0 ? '+' : ''}${formatMoney(unrealizedPnl)}`}
              </p>
            </div>
            <div className="rounded-2xl border border-flame-200/80 bg-gradient-to-br from-flame-50/90 to-white p-4 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-flame-800/80">Quotes</p>
              <p className="mt-1 text-sm leading-snug text-sparrow-600">
                Desk refreshes on a timer (tick {tick}). Buys fill at the{' '}
                <GlossaryTip term="ask">ask</GlossaryTip>; sells at the <GlossaryTip term="bid">bid</GlossaryTip> (
                <GlossaryTip term="last">last/mid</GlossaryTip> for portfolio value).
              </p>
            </div>
          </div>

          {concentration.length > 0 && (
            <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
              <h3 className="text-sm font-medium text-sparrow-900">Concentration (% of equity)</h3>
              <p className="mt-1 text-xs text-sparrow-500">Uses last/mid prices — same basis as the achievement day book.</p>
              <ul className="mt-3 space-y-2 text-sm">
                {concentration.map((r) => (
                  <li key={r.sym} className="flex justify-between gap-2 font-mono text-sparrow-700">
                    <span>{r.sym}</span>
                    <span>
                      {r.pct.toFixed(1)}% <span className="text-sparrow-400">({formatMoney(r.value)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AchievementsPanel />

          <div className="rounded-2xl border border-sparrow-200 bg-white p-6 shadow-sm ring-1 ring-flame-500/5">
            <h2 className="font-display text-2xl italic text-sparrow-900">Place a paper order</h2>
            <p className="mt-2 text-sm text-sparrow-500">
              Whole shares only. <GlossaryTip term="market">Market</GlossaryTip> fills now at bid/ask;{' '}
              <GlossaryTip term="limit">limit</GlossaryTip> orders rest until the next quote tick crosses your price.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOrderMode('market')}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  orderMode === 'market'
                    ? 'bg-flame-600 text-white shadow-sm'
                    : 'border border-sparrow-200 bg-white text-sparrow-600 hover:border-flame-300'
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderMode('limit')}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  orderMode === 'limit'
                    ? 'bg-flame-600 text-white shadow-sm'
                    : 'border border-sparrow-200 bg-white text-sparrow-600 hover:border-flame-300'
                }`}
              >
                Limit
              </button>
            </div>

            {ask != null && bid != null && qtyNum > 0 && (
              <div className="mt-4 space-y-3 rounded-xl border border-flame-100 bg-flame-50/60 px-4 py-3 text-sm text-sparrow-700">
                <p className="font-medium text-flame-900">Order preview</p>
                {orderMode === 'market' ? (
                  <ul className="list-inside list-disc space-y-1 text-xs sm:text-sm">
                    <li>
                      <GlossaryTip term="ask">Ask</GlossaryTip> {formatMoney(ask)} · <GlossaryTip term="bid">Bid</GlossaryTip>{' '}
                      {formatMoney(bid)} · <GlossaryTip term="spread">Spread</GlossaryTip> {formatMoney(round2(ask - bid))}
                    </li>
                    <li>
                      Market buy: ~{formatMoney(marketBuyGross!)} notional
                      {buyFee > 0 ? ` + ${formatMoney(buyFee)} fee` : ''} → est. cash{' '}
                      <span className={estCashAfterMarketBuy! < 0 ? 'text-red-600' : ''}>
                        {formatMoney(estCashAfterMarketBuy!)}
                      </span>
                    </li>
                    <li>
                      Market sell: ~{formatMoney(marketSellGross!)} notional
                      {sellFee > 0 ? ` − ${formatMoney(sellFee)} fee` : ''} → est. cash{' '}
                      {formatMoney(estCashAfterMarketSell!)}
                    </li>
                  </ul>
                ) : (
                  <ul className="list-inside list-disc space-y-1 text-xs sm:text-sm">
                    <li>
                      Limit reserves <GlossaryTip term="escrow">cash</GlossaryTip> up to limit × shares when you place a buy.
                    </li>
                    {limitBuyEscrow != null && (
                      <li>
                        If placed: escrow {formatMoney(limitBuyEscrow)} → est. cash{' '}
                        <span className={estCashAfterLimitBuyPlace! < -1e-6 ? 'text-red-600' : ''}>
                          {formatMoney(estCashAfterLimitBuyPlace!)}
                        </span>
                      </li>
                    )}
                  </ul>
                )}
                {orderMode === 'market' && qtyNum > maxBuyQty && (
                  <span className="block text-red-600">Buy exceeds available cash at this size.</span>
                )}
                {orderMode === 'market' && qtyNum > maxSellAvail && (
                  <span className="block text-red-600">Sell exceeds available shares (open limit sells count).</span>
                )}
                {orderMode === 'limit' && limitBuyEscrow != null && limitBuyEscrow > snapshot.cash + 1e-6 && (
                  <span className="block text-red-600">Limit buy escrow exceeds available cash.</span>
                )}
                {orderMode === 'limit' && qtyNum > maxSellAvail && (
                  <span className="block text-red-600">Limit sell exceeds available shares.</span>
                )}
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-left text-sm">
                <span className="text-sparrow-500">Symbol</span>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-sparrow-200 bg-sparrow-50 px-4 py-3 text-sm text-sparrow-900 outline-none focus:border-flame-300 focus:ring-2 focus:ring-flame-500/25"
                >
                  {SYMBOLS.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.symbol} — {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-left text-sm">
                <span className="text-sparrow-500">Shares (whole)</span>
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-sparrow-200 bg-sparrow-50 px-4 py-3 text-sm text-sparrow-900 outline-none focus:border-flame-300 focus:ring-2 focus:ring-flame-500/25"
                />
              </label>
              {orderMode === 'limit' && (
                <label className="block text-left text-sm sm:col-span-2">
                  <span className="text-sparrow-500">Limit price (USD)</span>
                  <input
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder={mid != null ? String(mid) : '0.00'}
                    className="mt-1 w-full rounded-xl border border-sparrow-200 bg-sparrow-50 px-4 py-3 text-sm text-sparrow-900 outline-none focus:border-flame-300 focus:ring-2 focus:ring-flame-500/25"
                  />
                </label>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQty(String(maxBuyQty))}
                disabled={maxBuyQty <= 0}
                className="rounded-full border border-sparrow-200 bg-white px-3 py-1.5 text-xs font-medium text-sparrow-600 transition hover:border-flame-300 hover:text-flame-800 disabled:opacity-40"
              >
                Max buy ({maxBuyQty})
              </button>
              <button
                type="button"
                onClick={() => setQty(String(maxSellAvail))}
                disabled={maxSellAvail <= 0}
                className="rounded-full border border-sparrow-200 bg-white px-3 py-1.5 text-xs font-medium text-sparrow-600 transition hover:border-flame-300 hover:text-flame-800 disabled:opacity-40"
              >
                Max sell ({maxSellAvail})
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {orderMode === 'market' ? (
                <>
                  <button
                    type="button"
                    onClick={onMarketBuy}
                    className="rounded-full bg-gradient-to-br from-flame-600 to-flame-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-flame-500 hover:to-flame-600"
                  >
                    Buy (market)
                  </button>
                  <button
                    type="button"
                    onClick={onMarketSell}
                    className="rounded-full border border-sparrow-300 bg-white px-6 py-3 text-sm font-semibold text-sparrow-900 shadow-sm transition hover:border-flame-400 hover:shadow"
                  >
                    Sell (market)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onPlaceLimitBuy}
                    className="rounded-full bg-gradient-to-br from-flame-600 to-flame-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-flame-500 hover:to-flame-600"
                  >
                    Place limit buy
                  </button>
                  <button
                    type="button"
                    onClick={onPlaceLimitSell}
                    className="rounded-full border border-sparrow-300 bg-white px-6 py-3 text-sm font-semibold text-sparrow-900 shadow-sm transition hover:border-flame-400 hover:shadow"
                  >
                    Place limit sell
                  </button>
                </>
              )}
            </div>
            <p className="mt-4 text-xs text-sparrow-400">
              Shortcuts when not typing in a field (market mode):{' '}
              <kbd className="rounded border border-sparrow-200 bg-sparrow-50 px-1.5 py-0.5 font-mono text-sparrow-600">B</kbd>{' '}
              buy ·{' '}
              <kbd className="rounded border border-sparrow-200 bg-sparrow-50 px-1.5 py-0.5 font-mono text-sparrow-600">S</kbd> sell
            </p>
          </div>

          {snapshot.openOrders.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
              <div className="border-b border-sparrow-100 px-5 py-3">
                <h3 className="font-medium text-sparrow-900">Working orders</h3>
                <p className="mt-1 text-xs text-sparrow-500">Limit orders rest until a quote tick can fill them.</p>
              </div>
              <ul className="divide-y divide-sparrow-100 text-sm">
                {snapshot.openOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-flame-50/30"
                  >
                    <span className="text-sparrow-700">
                      <span className={o.side === 'BUY' ? 'font-medium text-emerald-700' : 'font-medium text-flame-700'}>
                        {o.side}
                      </span>{' '}
                      <span className="font-mono font-medium">{o.symbol}</span> × {o.qty} @ {formatMoney(o.limitPrice)}
                      {o.side === 'BUY' && o.reservedCash > 0 && (
                        <span className="ml-2 text-xs text-sparrow-400">
                          reserved {formatMoney(o.reservedCash)}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const r = cancelOpenOrder(o.id)
                        if (r.ok) flash('Order canceled.', 'info')
                        else flash(r.reason, 'err')
                      }}
                      className="rounded-lg border border-sparrow-200 bg-white px-3 py-1 text-xs font-medium text-sparrow-600 hover:border-flame-300"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium text-sparrow-900">Watchlist</h3>
              <span className="text-xs text-sparrow-400">Click a symbol in the quote table to trade it</span>
            </div>
            {watchlist.length === 0 ? (
              <p className="mt-2 text-sm text-sparrow-500">Use “Watch” on symbols below to build a list.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {watchlist.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setSymbol(sym)}
                    className="rounded-full border border-flame-200 bg-flame-50/80 px-3 py-1.5 font-mono text-xs font-medium text-flame-900 hover:bg-flame-100"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
            <div className="border-b border-sparrow-100 px-5 py-3">
              <h3 className="font-medium text-sparrow-900">Practice quotes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-sparrow-50 text-xs uppercase tracking-wide text-sparrow-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Symbol</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">
                      <GlossaryTip term="bid">Bid</GlossaryTip>
                    </th>
                    <th className="px-5 py-3 font-medium">
                      <GlossaryTip term="last">Last</GlossaryTip>
                    </th>
                    <th className="px-5 py-3 font-medium">
                      <GlossaryTip term="ask">Ask</GlossaryTip>
                    </th>
                    <th className="px-5 py-3 font-medium">You hold</th>
                    <th className="px-5 py-3 font-medium">Watch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sparrow-100">
                  {SYMBOLS.map((s) => {
                    const p = snapshot.positions[s.symbol]
                    const bidPx = snapshot.bidPrices[s.symbol]
                    const askPx = snapshot.askPrices[s.symbol]
                    const lastPx = snapshot.lastPrices[s.symbol]
                    const move = quoteMoves[s.symbol] ?? null
                    const watched = watchlist.includes(s.symbol)
                    return (
                      <tr
                        key={s.symbol}
                        className={`cursor-pointer bg-white transition-colors hover:bg-flame-50/40 ${
                          s.symbol === symbol ? 'bg-flame-50/50' : ''
                        }`}
                        onClick={() => setSymbol(s.symbol)}
                      >
                        <td className="px-5 py-3 font-mono font-medium text-sparrow-900">{s.symbol}</td>
                        <td className="px-5 py-3 text-sparrow-600">{s.name}</td>
                        <td className="px-5 py-3 font-mono text-sparrow-800">{bidPx != null ? formatMoney(bidPx) : '—'}</td>
                        <td className="px-5 py-3 font-mono text-sparrow-800">
                          <span className="inline-flex items-center gap-1.5">
                            {lastPx != null ? formatMoney(lastPx) : '—'}
                            {move === 'up' && (
                              <span className="text-xs font-sans font-semibold text-emerald-600" title="Tick vs prior">
                                ↑
                              </span>
                            )}
                            {move === 'down' && (
                              <span className="text-xs font-sans font-semibold text-red-500" title="Tick vs prior">
                                ↓
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-sparrow-800">{askPx != null ? formatMoney(askPx) : '—'}</td>
                        <td className="px-5 py-3 text-sparrow-600">
                          {p && p.qty > 0 ? `${p.qty} @ avg ${formatMoney(p.avgCost)}` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleWatch(s.symbol)
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              watched
                                ? 'bg-flame-600 text-white'
                                : 'border border-sparrow-200 bg-white text-sparrow-600 hover:border-flame-300'
                            }`}
                          >
                            {watched ? 'Watching' : 'Watch'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sparrow-100 px-5 py-3">
              <h3 className="font-medium text-sparrow-900">Recent ledger</h3>
              <span className="text-xs text-sparrow-400">{snapshot.ledger.length} fills</span>
            </div>
            <ul className="max-h-64 divide-y divide-sparrow-100 overflow-y-auto text-sm">
              {snapshot.ledger.length === 0 && (
                <li className="px-5 py-8 text-center text-sparrow-500">
                  <p>No fills yet.</p>
                  <p className="mt-1 text-xs text-sparrow-400">Try a small buy on any symbol to see the ledger update.</p>
                </li>
              )}
              {snapshot.ledger.slice(0, 20).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 hover:bg-flame-50/30"
                >
                  <span className="text-sparrow-600">
                    <span className={row.side === 'BUY' ? 'font-medium text-emerald-700' : 'font-medium text-flame-700'}>
                      {row.side}
                    </span>{' '}
                    <span className="font-mono font-medium text-sparrow-900">{row.symbol}</span> × {row.qty}
                    <span className="ml-2 text-xs text-sparrow-400">{formatRelativeTime(row.t)}</span>
                  </span>
                  <span className="font-mono text-sparrow-500">
                    @ {formatMoney(row.price)} → notional {formatMoney(row.total)}
                    {row.fees != null && row.fees > 0 && (
                      <span className="text-sparrow-400" title={GLOSSARY.fee}>
                        {' '}
                        (−{formatMoney(row.fees)} fee)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside
          className={`lg:sticky lg:top-24 lg:self-start ${mobileTab === 'coach' ? 'block' : 'hidden'} md:block`}
        >
          <AIAssistantPanel />
        </aside>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`toast-enter fixed bottom-6 left-1/2 z-20 w-[min(92%,440px)] -translate-x-1/2 rounded-2xl px-5 py-3 text-center text-sm shadow-lg ${
            toast.tone === 'ok'
              ? 'border border-emerald-200/80 bg-white text-emerald-900'
              : toast.tone === 'err'
                ? 'border border-red-200 bg-white text-red-900'
                : 'border border-flame-200 bg-white text-sparrow-800 ring-1 ring-flame-500/15'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
