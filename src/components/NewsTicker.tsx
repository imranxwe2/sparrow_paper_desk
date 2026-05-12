import { useEffect, useState } from 'react'
import { getLatestNews, type NewsEvent } from '../lib/mockMarket'
import { usePaper } from '../context/PaperTradingContext'

export function NewsTicker() {
  const { tick } = usePaper()
  const [currentNews, setCurrentNews] = useState<NewsEvent | null>(null)
  
  useEffect(() => {
    // get latest news
    const news = getLatestNews(tick)
    if (!currentNews || news.id !== currentNews.id) {
      setCurrentNews(news)
    }
  }, [tick, currentNews])

  if (!currentNews) return null

  const isPos = currentNews.impact > 1

  return (
    <div className="bg-sparrow-900 text-white overflow-hidden text-xs py-2 flex items-center border-t border-sparrow-800">
      <div className="px-4 font-bold uppercase tracking-wider shrink-0 border-r border-sparrow-700 flex items-center gap-2 text-flame-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flame-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-flame-500"></span>
        </span>
        Live News
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="whitespace-nowrap animate-[marquee_20s_linear_infinite] inline-block px-4">
          <span className="font-bold mr-2">{currentNews.symbol}</span>
          <span>{currentNews.headline}</span>
          <span className={`ml-3 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${isPos ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            Impact: {isPos ? '+' : ''}{((currentNews.impact - 1) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
