import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AchievementsPanel } from '../components/AchievementsPanel'
import { AIAssistantPanel } from '../components/AIAssistantPanel'
import { SparrowMark } from '../components/SparrowMark'
import { useAchievements } from '../context/AchievementsContext'
import { usePaper } from '../context/PaperTradingContext'
import { formatRelativeTime } from '../lib/formatTime'
import { SYMBOLS, pricesAtTick } from '../lib/mockMarket'

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n >= 100 ? 0 : 2,
  })
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
  const { snapshot, buy, sell, resetPaper, tick } = usePaper()
  const { lastUnlock, clearLastUnlock } = useAchievements()
  const [symbol, setSymbol] = useState(SYMBOLS[0].symbol)
  const [qty, setQty] = useState('10')
  const [toast, setToast] = useState<ToastState>(null)
  const [mobileTab, setMobileTab] = useState<'desk' | 'coach'>('desk')

  const price = snapshot.lastPrices[symbol]
  const qtyNum = Math.max(0, Math.floor(Number(qty) || 0))
  const position = snapshot.positions[symbol]

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
    return Math.round(t * 100) / 100
  }, [snapshot])

  const maxBuyQty = useMemo(() => {
    if (price == null || price <= 0) return 0
    return Math.floor(snapshot.cash / price)
  }, [snapshot.cash, price])

  const maxSellQty = position?.qty ?? 0

  const previewBuyTotal =
    price != null && qtyNum > 0 ? Math.round(price * qtyNum * 100) / 100 : null
  const previewSellTotal =
    price != null && qtyNum > 0 ? Math.round(price * qtyNum * 100) / 100 : null

  const quoteMoves = useMemo(() => {
    if (tick <= 0) return {} as Record<string, 'up' | 'down' | null>
    const prev = pricesAtTick(tick - 1)
    const curr = pricesAtTick(tick)
    const out: Record<string, 'up' | 'down' | null> = {}
    for (const s of SYMBOLS) {
      const a = prev[s.symbol]
      const b = curr[s.symbol]
      if (a != null && b != null && a !== b) out[s.symbol] = b > a ? 'up' : 'down'
      else out[s.symbol] = null
    }
    return out
  }, [tick])

  const flash = useCallback((text: string, tone: ToastTone = 'info') => {
    setToast({ text, tone })
    window.setTimeout(() => setToast(null), 3400)
  }, [])

  const onBuy = useCallback(() => {
    const r = buy(symbol, qtyNum)
    if (r.ok) flash(`Paper buy filled: ${symbol} × ${qtyNum}`, 'ok')
    else flash(r.reason, 'err')
  }, [buy, flash, symbol, qtyNum])

  const onSell = useCallback(() => {
    const r = sell(symbol, qtyNum)
    if (r.ok) flash(`Paper sell filled: ${symbol} × ${qtyNum}`, 'ok')
    else flash(r.reason, 'err')
  }, [sell, flash, symbol, qtyNum])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        onBuy()
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        onSell()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBuy, onSell])

  useEffect(() => {
    if (!lastUnlock) return
    const t = window.setTimeout(() => {
      flash(`Achievement unlocked: ${lastUnlock.title}`, 'ok')
      clearLastUnlock()
    }, 0)
    return () => window.clearTimeout(t)
  }, [lastUnlock, clearLastUnlock, flash])

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
            </div>
            <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
              <p className="text-xs font-medium uppercase tracking-wide text-sparrow-400">Est. equity</p>
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
                Desk prices refresh on a timer (tick {tick}) so you can watch fills and value drift.
              </p>
            </div>
          </div>

          <AchievementsPanel />

          <div className="rounded-2xl border border-sparrow-200 bg-white p-6 shadow-sm ring-1 ring-flame-500/5">
            <h2 className="font-display text-2xl italic text-sparrow-900">Place a paper order</h2>
            <p className="mt-2 text-sm text-sparrow-500">
              Whole shares only. Fills use the current practice quote for <span className="font-mono text-flame-800">{symbol}</span>.
            </p>

            {price != null && qtyNum > 0 && (
              <div className="mt-4 rounded-xl border border-flame-100 bg-flame-50/60 px-4 py-3 text-sm text-sparrow-700">
                <span className="font-medium text-flame-900">Preview · </span>
                Buy would deploy about <span className="font-mono">{formatMoney(previewBuyTotal!)}</span>
                {' · '}
                Sell would return about <span className="font-mono">{formatMoney(previewSellTotal!)}</span>
                {qtyNum > maxBuyQty && (
                  <span className="mt-1 block text-red-600">Buy exceeds available cash at this size.</span>
                )}
                {qtyNum > maxSellQty && maxSellQty >= 0 && (
                  <span className="mt-1 block text-red-600">Sell exceeds shares you hold in this symbol.</span>
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
                onClick={() => setQty(String(maxSellQty))}
                disabled={maxSellQty <= 0}
                className="rounded-full border border-sparrow-200 bg-white px-3 py-1.5 text-xs font-medium text-sparrow-600 transition hover:border-flame-300 hover:text-flame-800 disabled:opacity-40"
              >
                Max sell ({maxSellQty})
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBuy}
                className="rounded-full bg-gradient-to-br from-flame-600 to-flame-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-flame-500 hover:to-flame-600"
              >
                Buy
              </button>
              <button
                type="button"
                onClick={onSell}
                className="rounded-full border border-sparrow-300 bg-white px-6 py-3 text-sm font-semibold text-sparrow-900 shadow-sm transition hover:border-flame-400 hover:shadow"
              >
                Sell
              </button>
            </div>
            <p className="mt-4 text-xs text-sparrow-400">
              Shortcuts when not typing in a field: <kbd className="rounded border border-sparrow-200 bg-sparrow-50 px-1.5 py-0.5 font-mono text-sparrow-600">B</kbd> buy ·{' '}
              <kbd className="rounded border border-sparrow-200 bg-sparrow-50 px-1.5 py-0.5 font-mono text-sparrow-600">S</kbd> sell
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
            <div className="border-b border-sparrow-100 px-5 py-3">
              <h3 className="font-medium text-sparrow-900">Practice quotes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-sparrow-50 text-xs uppercase tracking-wide text-sparrow-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Symbol</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Desk price</th>
                    <th className="px-5 py-3 font-medium">You hold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sparrow-100">
                  {SYMBOLS.map((s) => {
                    const p = snapshot.positions[s.symbol]
                    const px = snapshot.lastPrices[s.symbol]
                    const move = quoteMoves[s.symbol] ?? null
                    return (
                      <tr
                        key={s.symbol}
                        className={`bg-white transition-colors hover:bg-flame-50/40 ${
                          s.symbol === symbol ? 'bg-flame-50/50' : ''
                        }`}
                      >
                        <td className="px-5 py-3 font-mono font-medium text-sparrow-900">{s.symbol}</td>
                        <td className="px-5 py-3 text-sparrow-600">{s.name}</td>
                        <td className="px-5 py-3 font-mono text-sparrow-800">
                          <span className="inline-flex items-center gap-1.5">
                            {px != null ? formatMoney(px) : '—'}
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
                        <td className="px-5 py-3 text-sparrow-600">
                          {p && p.qty > 0 ? `${p.qty} @ avg ${formatMoney(p.avgCost)}` : '—'}
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
                    @ {formatMoney(row.price)} → {formatMoney(row.total)}
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
