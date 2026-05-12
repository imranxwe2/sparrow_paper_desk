import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { usePaper } from '../context/PaperTradingContext'
import { useAchievements } from '../context/AchievementsContext'
import { formatRelativeTime } from '../lib/formatTime'
import { GLOSSARY } from '../lib/glossary'
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

export default function Portfolio() {
  const { snapshot, cancelOpenOrder } = usePaper()
  const { internal: { dayBook } } = useAchievements()
  const { flash } = useOutletContext<OutletContextType>()

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

  const concentration = useMemo(() => {
    const rows: { sym: string; pct: number; value: number; qty: number; avgCost: number; unrealized: number }[] = []
    if (equity <= 1e-6) return rows
    for (const [sym, p] of Object.entries(snapshot.positions)) {
      if (p.qty <= 0) continue
      const px = snapshot.lastPrices[sym] ?? p.avgCost
      const value = px * p.qty
      rows.push({ 
        sym, 
        value, 
        pct: (value / equity) * 100, 
        qty: p.qty, 
        avgCost: p.avgCost,
        unrealized: value - (p.avgCost * p.qty)
      })
    }
    rows.sort((a, b) => b.pct - a.pct)
    return rows
  }, [snapshot, equity])

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Overview stats */}
      <div className="lg:col-span-3 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
          <p className="text-xs font-medium uppercase tracking-wide text-sparrow-400">Cash</p>
          <p className="mt-1 font-display text-3xl text-sparrow-900">{formatMoney(snapshot.cash)}</p>
        </div>
        <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
          <p className="text-xs font-medium uppercase tracking-wide text-sparrow-400">Est. Equity</p>
          <p className="mt-1 font-display text-3xl text-sparrow-900">{formatMoney(equity)}</p>
        </div>
        <div className="rounded-2xl border border-sparrow-200 bg-white p-4 shadow-sm ring-1 ring-flame-500/5">
          <p className="text-xs font-medium uppercase tracking-wide text-sparrow-400">Unrealized P&L</p>
          <p className={`mt-1 font-display text-3xl ${unrealizedPnl > 0 ? 'text-emerald-700' : unrealizedPnl < 0 ? 'text-red-600' : 'text-sparrow-900'}`}>
            {unrealizedPnl === 0 ? '—' : `${unrealizedPnl > 0 ? '+' : ''}${formatMoney(unrealizedPnl)}`}
          </p>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
          <div className="border-b border-sparrow-100 px-5 py-3">
            <h3 className="font-medium text-sparrow-900">Current Positions</h3>
          </div>
          {concentration.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-sparrow-50 text-xs uppercase tracking-wide text-sparrow-500 border-b border-sparrow-100">
                  <tr>
                    <th className="px-5 py-3 font-medium">Symbol</th>
                    <th className="px-5 py-3 font-medium">Shares</th>
                    <th className="px-5 py-3 font-medium">Avg Cost</th>
                    <th className="px-5 py-3 font-medium">Market Value</th>
                    <th className="px-5 py-3 font-medium">Unrealized</th>
                    <th className="px-5 py-3 font-medium">% of Port</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sparrow-100">
                  {concentration.map((r) => (
                    <tr key={r.sym} className="hover:bg-sparrow-50/50">
                      <td className="px-5 py-4 font-mono font-medium text-sparrow-900">{r.sym}</td>
                      <td className="px-5 py-4 text-sparrow-700">{r.qty}</td>
                      <td className="px-5 py-4 text-sparrow-700">{formatMoney(r.avgCost)}</td>
                      <td className="px-5 py-4 font-medium text-sparrow-900">{formatMoney(r.value)}</td>
                      <td className={`px-5 py-4 font-medium ${r.unrealized > 0 ? 'text-emerald-600' : r.unrealized < 0 ? 'text-red-600' : 'text-sparrow-500'}`}>
                        {r.unrealized > 0 ? '+' : ''}{formatMoney(r.unrealized)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-10">{r.pct.toFixed(1)}%</span>
                          <div className="h-1.5 w-16 bg-sparrow-100 rounded-full overflow-hidden">
                            <div className="h-full bg-flame-400" style={{ width: `${r.pct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sparrow-500">You don't have any open positions right now.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sparrow-100 px-5 py-3 bg-sparrow-50/50">
            <h3 className="font-medium text-sparrow-900">Ledger History</h3>
            <span className="text-xs text-sparrow-400">{snapshot.ledger.length} fills</span>
          </div>
          <ul className="max-h-96 divide-y divide-sparrow-100 overflow-y-auto text-sm">
            {snapshot.ledger.length === 0 && (
              <li className="px-5 py-8 text-center text-sparrow-500">
                <p>No fills yet.</p>
                <p className="mt-1 text-xs text-sparrow-400">Try a small buy on any symbol to see the ledger update.</p>
              </li>
            )}
            {snapshot.ledger.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 hover:bg-flame-50/30">
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
      </div>

      <div className="space-y-6 lg:col-span-1">
        <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
          <div className="border-b border-sparrow-100 px-5 py-3 bg-sparrow-50/50">
            <h3 className="font-medium text-sparrow-900">Working Orders</h3>
            <p className="mt-1 text-xs text-sparrow-500">Limit orders resting on the book.</p>
          </div>
          {snapshot.openOrders.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-sparrow-500">No active limit orders.</p>
          ) : (
            <ul className="divide-y divide-sparrow-100 text-sm">
              {snapshot.openOrders.map((o) => (
                <li key={o.id} className="p-4 hover:bg-flame-50/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sparrow-700">
                      <span className={o.side === 'BUY' ? 'font-medium text-emerald-700' : 'font-medium text-flame-700'}>
                        {o.side}
                      </span>{' '}
                      <span className="font-mono font-medium">{o.symbol}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const r = cancelOpenOrder(o.id)
                        if (r.ok) flash('Order canceled.', 'info')
                        else flash(r.reason, 'err')
                      }}
                      className="rounded border border-sparrow-200 bg-white px-2 py-1 text-xs font-medium text-sparrow-600 hover:border-flame-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="text-sparrow-600">
                    {o.qty} shares @ {formatMoney(o.limitPrice)}
                  </div>
                  {o.side === 'BUY' && o.reservedCash > 0 && (
                    <div className="mt-1 text-xs text-sparrow-400">
                      Escrowed: {formatMoney(o.reservedCash)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/5">
          <div className="border-b border-sparrow-100 px-5 py-3 bg-sparrow-50/50">
            <h3 className="font-medium text-sparrow-900">P&L Calendar</h3>
            <p className="mt-1 text-xs text-sparrow-500">Daily equity performance.</p>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {Object.keys(dayBook).length === 0 ? (
              <p className="text-sm text-sparrow-500">No trading history yet.</p>
            ) : (
              Object.entries(dayBook)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, data]) => {
                  const isGreen = data.last >= data.open
                  const diff = data.last - data.open
                  const pct = data.open > 0 ? (diff / data.open) * 100 : 0
                  return (
                    <div 
                      key={date} 
                      className={`px-3 py-2 rounded-lg border w-full sm:w-auto flex-1 min-w-[100px] ${
                        isGreen ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold opacity-70 mb-1">{date}</div>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-sm font-bold">{isGreen ? '+' : ''}{pct.toFixed(2)}%</div>
                        <div className="text-xs opacity-70">{formatMoney(diff)}</div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
