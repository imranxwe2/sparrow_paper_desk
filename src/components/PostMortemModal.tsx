import { useEffect, useState } from 'react'
import { usePaper } from '../context/PaperTradingContext'
import { getTradePostMortem } from '../lib/aiAssistant'
import type { LedgerRow } from '../context/PaperTradingContext'

export function PostMortemModal({
  row,
  onClose,
}: {
  row: LedgerRow | null
  onClose: () => void
}) {
  const { snapshot } = usePaper()
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!row) return
    setLoading(true)
    setAnalysis(null)
    getTradePostMortem(row, snapshot)
      .then((res) => setAnalysis(res))
      .catch((err) => setAnalysis(`Error: ${err.message}`))
      .finally(() => setLoading(false))
  }, [row, snapshot])

  if (!row) return null

  const isWin = row.total - ((row.avgCostAtSell ?? 0) * row.qty) >= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sparrow-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="border-b border-sparrow-100 bg-gradient-to-r from-white via-flame-50/40 to-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="font-display text-xl text-sparrow-900 italic flex items-center gap-2">
              AI Post-Mortem
            </h2>
            <p className="mt-1 text-xs text-sparrow-500">
              {row.symbol} • {row.qty} shares • {isWin ? 'Profit' : 'Loss'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sparrow-400 hover:text-sparrow-600 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sparrow-200 border-t-flame-500 mb-4" />
              <p className="text-sm text-sparrow-500 italic">Coach is analyzing your trade...</p>
            </div>
          ) : (
            <div className="rounded-xl border-l-2 border-flame-400/80 bg-sparrow-50 p-4 text-sm text-sparrow-700 leading-relaxed ring-1 ring-sparrow-100">
              {analysis}
            </div>
          )}
        </div>

        <div className="border-t border-sparrow-100 bg-sparrow-50/50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-br from-flame-600 to-flame-700 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:from-flame-500 hover:to-flame-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
