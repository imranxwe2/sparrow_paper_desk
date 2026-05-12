import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { usePaper } from '../context/PaperTradingContext'
import { buyFeeForOrder, sellFeeForOrder } from '../lib/paperFees'
import { quoteBookAtTick, SYMBOLS } from '../lib/mockMarket'
import type { OutletContextType } from '../components/Layout'

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

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

import { CandleChart } from '../components/CandleChart'

export default function TradeDesk() {
  const {
    snapshot,
    buy,
    sell,
    tick,
    placeLimitBuy,
    placeLimitSell,
  } = usePaper()
  
  const { flash, watchlist, setWatchlist } = useOutletContext<OutletContextType>()

  const [symbol, setSymbol] = useState(SYMBOLS[0].symbol)
  const [qty, setQty] = useState('10')
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState('')

  const bid = snapshot.bidPrices[symbol]
  const ask = snapshot.askPrices[symbol]
  const mid = snapshot.lastPrices[symbol]
  const qtyNum = Math.max(0, Math.floor(Number(qty) || 0))
  const position = snapshot.positions[symbol]
  const limitNum = Number(limitPrice)
  const limitPx = Number.isFinite(limitNum) && limitNum > 0 ? round2(limitNum) : null

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

  function toggleWatch(sym: string) {
    setWatchlist((w) => (w.includes(sym) ? w.filter((x) => x !== sym) : [...w, sym]))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* LEFT COLUMN */}
      <div className="space-y-6 lg:col-span-1">
        <div id="order-panel" className="rounded-2xl border border-sparrow-200 bg-white p-6 shadow-sm ring-1 ring-flame-500/5">
          <h2 className="font-display text-2xl italic text-sparrow-900">Place an order</h2>
          <p className="mt-2 text-sm text-sparrow-500">
            Available cash: <span className="font-medium text-sparrow-900">{formatMoney(snapshot.cash)}</span>
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

          <div className="mt-6 grid gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <label className="block text-left text-sm">
                <span className="text-sparrow-500">Shares</span>
                <input
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border border-sparrow-200 bg-sparrow-50 px-4 py-3 text-sm text-sparrow-900 outline-none focus:border-flame-300 focus:ring-2 focus:ring-flame-500/25"
                />
              </label>
              {orderMode === 'limit' && (
                <label className="block text-left text-sm">
                  <span className="text-sparrow-500">Limit px</span>
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

          {ask != null && bid != null && qtyNum > 0 && (
            <div className="mt-6 space-y-3 rounded-xl border border-flame-100 bg-flame-50/60 px-4 py-3 text-sm text-sparrow-700">
              <p className="font-medium text-flame-900">Order preview</p>
              {orderMode === 'market' ? (
                <ul className="list-inside list-disc space-y-1 text-xs">
                  <li>Ask {formatMoney(ask)} · Bid {formatMoney(bid)}</li>
                  <li>
                    Buy cost: ~{formatMoney(marketBuyTotal!)} → est. cash{' '}
                    <span className={estCashAfterMarketBuy! < 0 ? 'text-red-600' : ''}>
                      {formatMoney(estCashAfterMarketBuy!)}
                    </span>
                  </li>
                  <li>
                    Sell yield: ~{formatMoney(marketSellNet!)} → est. cash{' '}
                    {formatMoney(estCashAfterMarketSell!)}
                  </li>
                </ul>
              ) : (
                <ul className="list-inside list-disc space-y-1 text-xs">
                  {limitBuyEscrow != null && (
                    <li>
                      Buy Escrow: {formatMoney(limitBuyEscrow)} → est. cash{' '}
                      <span className={estCashAfterLimitBuyPlace! < -1e-6 ? 'text-red-600' : ''}>
                        {formatMoney(estCashAfterLimitBuyPlace!)}
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {orderMode === 'market' ? (
              <>
                <button
                  type="button"
                  onClick={onMarketBuy}
                  className="w-full rounded-xl bg-gradient-to-br from-flame-600 to-flame-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-flame-500 hover:to-flame-600"
                >
                  Buy (market)
                </button>
                <button
                  type="button"
                  onClick={onMarketSell}
                  className="w-full rounded-xl border border-sparrow-300 bg-white px-6 py-3 text-sm font-semibold text-sparrow-900 shadow-sm transition hover:border-flame-400 hover:shadow"
                >
                  Sell (market)
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onPlaceLimitBuy}
                  className="w-full rounded-xl bg-gradient-to-br from-flame-600 to-flame-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-flame-500 hover:to-flame-600"
                >
                  Place limit buy
                </button>
                <button
                  type="button"
                  onClick={onPlaceLimitSell}
                  className="w-full rounded-xl border border-sparrow-300 bg-white px-6 py-3 text-sm font-semibold text-sparrow-900 shadow-sm transition hover:border-flame-400 hover:shadow"
                >
                  Place limit sell
                </button>
              </>
            )}
          </div>
        </div>
        
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
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-2 space-y-6">
        <div id="live-chart" className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h3 className="font-medium text-sparrow-900">{symbol} <span className="text-sparrow-500 text-sm font-normal">Live Chart (1m)</span></h3>
            <span className="text-xs text-sparrow-400">Market Sync: Tick {tick}</span>
          </div>
          <div className="h-[400px] w-full">
            <CandleChart symbol={symbol} currentTick={tick} />
          </div>
        </div>

        <div id="live-quotes" className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
          <div className="border-b border-sparrow-100 px-5 py-3 flex justify-between items-center bg-sparrow-50/50">
            <h3 className="font-medium text-sparrow-900">Live Quotes</h3>
            <span className="text-xs text-sparrow-500">{SYMBOLS.length} symbols</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-sparrow-50/80 text-xs uppercase tracking-wide text-sparrow-500 border-b border-sparrow-100">
                <tr>
                  <th className="px-5 py-3 font-medium">Symbol</th>
                  <th className="px-5 py-3 font-medium">Bid</th>
                  <th className="px-5 py-3 font-medium">Last</th>
                  <th className="px-5 py-3 font-medium">Ask</th>
                  <th className="px-5 py-3 font-medium">Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sparrow-100">
                {SYMBOLS.map((s) => {
                  const bidPx = snapshot.bidPrices[s.symbol]
                  const askPx = snapshot.askPrices[s.symbol]
                  const lastPx = snapshot.lastPrices[s.symbol]
                  const move = quoteMoves[s.symbol] ?? null
                  const watched = watchlist.includes(s.symbol)
                  return (
                    <tr
                      key={s.symbol}
                      className={`cursor-pointer transition-colors hover:bg-flame-50/40 ${
                        s.symbol === symbol ? 'bg-flame-50/50' : 'bg-white'
                      }`}
                      onClick={() => setSymbol(s.symbol)}
                    >
                      <td className="px-5 py-3">
                        <div className="font-mono font-medium text-sparrow-900">{s.symbol}</div>
                        <div className="text-xs text-sparrow-500 truncate max-w-[120px]">{s.name}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-sparrow-800">{bidPx != null ? formatMoney(bidPx) : '—'}</td>
                      <td className="px-5 py-3 font-mono text-sparrow-800">
                        <span className="inline-flex items-center gap-1.5">
                          {lastPx != null ? formatMoney(lastPx) : '—'}
                          {move === 'up' && <span className="text-xs text-emerald-600">↑</span>}
                          {move === 'down' && <span className="text-xs text-red-500">↓</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-sparrow-800">{askPx != null ? formatMoney(askPx) : '—'}</td>
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
                          {watched ? '★' : '☆'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
