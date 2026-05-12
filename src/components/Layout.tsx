import { useState, useCallback, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { CloudSyncBar } from './CloudSyncBar'
import { SparrowMark } from './SparrowMark'
import { loadWatchlist, saveWatchlist } from '../lib/storage'
import { usePaper } from '../context/PaperTradingContext'
import { useAchievements } from '../context/AchievementsContext'
import { Walkthrough } from './Walkthrough'
import { NewsTicker } from './NewsTicker'

export type OutletContextType = {
  flash: (text: string, tone?: 'ok' | 'err' | 'info') => void
  watchlist: string[]
  setWatchlist: React.Dispatch<React.SetStateAction<string[]>>
}

export function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { resetPaper } = usePaper()
  const { resetAchievementProgress } = useAchievements()
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist())
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'err' | 'info' } | null>(null)

  useEffect(() => {
    saveWatchlist(watchlist)
  }, [watchlist])

  const flash = useCallback((text: string, tone: 'ok' | 'err' | 'info' = 'info') => {
    setToast({ text, tone })
    window.setTimeout(() => setToast(null), 3400)
  }, [])

  const navLinks = [
    { id: 'nav-trade', path: '/trade', label: 'Trade Desk' },
    { id: 'nav-portfolio', path: '/portfolio', label: 'Portfolio' },
    { id: 'nav-achievements', path: '/achievements', label: 'Achievements' },
    { id: 'nav-coach', path: '/coach', label: 'AI Coach' },
  ]

  return (
    <div className="min-h-dvh text-sparrow-800 bg-sparrow-50/20">
      <header className="sticky top-0 z-10 border-b border-sparrow-200 bg-white/90 backdrop-blur-md">
        <div className="h-0.5 w-full bg-gradient-to-r from-flame-400/0 via-flame-500/60 to-flame-400/0" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <SparrowMark className="h-9 w-9 drop-shadow-sm" />
              <div>
                <p className="font-display text-lg leading-none text-sparrow-900 italic">Sparrow</p>
                <p className="text-xs text-sparrow-500">Paper desk</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((l) => (
                <Link
                  key={l.path}
                  id={l.id}
                  to={l.path}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    location.pathname === l.path
                      ? 'bg-flame-50 text-flame-700'
                      : 'text-sparrow-600 hover:bg-sparrow-100 hover:text-sparrow-900'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/onboard')}
              className="hidden md:block rounded-full border border-sparrow-200 bg-white px-4 py-2 text-xs font-medium text-sparrow-700 shadow-sm transition hover:border-flame-300 hover:text-flame-800"
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
                if (window.confirm('Reset all achievement progress?')) {
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
        {/* Mobile Nav */}
        <div className="md:hidden border-t border-sparrow-100 bg-white px-4 py-2 flex overflow-x-auto gap-2">
           {navLinks.map((l) => (
              <Link
                key={l.path}
                id={`mobile-${l.id}`}
                to={l.path}
                className={`rounded-full px-4 py-2 text-xs font-medium transition whitespace-nowrap ${
                  location.pathname === l.path
                    ? 'bg-flame-50 text-flame-700 border border-flame-200'
                    : 'text-sparrow-600 hover:bg-sparrow-100 border border-transparent hover:text-sparrow-900'
                }`}
              >
                {l.label}
              </Link>
            ))}
        </div>
        <CloudSyncBar flash={flash} watchlist={watchlist} setWatchlist={setWatchlist} />
      </header>
      
      <NewsTicker />

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <Outlet context={{ flash, watchlist, setWatchlist } satisfies OutletContextType} />
      </main>

      <Walkthrough />

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
