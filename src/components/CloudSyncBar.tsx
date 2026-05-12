import { useState, useEffect, useRef } from 'react'
import { usePaper } from '../context/PaperTradingContext'
import { useAchievements } from '../context/AchievementsContext'
import { loadCloudProfile, saveCloudProfile } from '../lib/cloudProfile'
import { supabaseConfigured } from '../lib/supabase'

export function CloudSyncBar({ 
  flash, 
  watchlist, 
  setWatchlist 
}: { 
  flash: (msg: string, tone?: 'ok'|'err'|'info') => void
  watchlist: string[]
  setWatchlist: (w: string[]) => void
}) {
  const { snapshot, hydratePaper } = usePaper()
  const { internal: achievementsInternal, hydrateAchievements } = useAchievements()
  
  const [usernameInput, setUsernameInput] = useState(() => localStorage.getItem('sparrow_username') || '')
  const [connectedUser, setConnectedUser] = useState(() => localStorage.getItem('sparrow_username') || null)
  const [status, setStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  
  const firstLoadRef = useRef(false)

  if (!supabaseConfigured) return null

  const connect = async () => {
    const u = usernameInput.trim()
    if (!u) {
      flash('Enter a valid username.', 'err')
      return
    }
    setStatus('syncing')
    try {
      const data = await loadCloudProfile(u)
      if (data) {
        if (data.paper_snapshot) {
          hydratePaper({
            cash: data.paper_snapshot.cash,
            positions: data.paper_snapshot.positions,
            ledger: data.paper_snapshot.ledger,
            openOrders: data.paper_snapshot.openOrders || [],
          })
        }
        if (data.achievements_snapshot) hydrateAchievements(data.achievements_snapshot)
        if (data.watchlist) setWatchlist(data.watchlist)
        flash(`Restored profile for ${u}`, 'ok')
      } else {
        flash(`Created new cloud profile for ${u}`, 'info')
      }
      setConnectedUser(u)
      localStorage.setItem('sparrow_username', u)
      firstLoadRef.current = true
      setStatus('synced')
    } catch (err: any) {
      flash(err.message || 'Failed to connect.', 'err')
      setStatus('error')
    }
  }

  const disconnect = () => {
    setConnectedUser(null)
    setUsernameInput('')
    localStorage.removeItem('sparrow_username')
    flash('Disconnected from cloud. Using local storage only.', 'info')
  }

  // Auto-sync effect
  useEffect(() => {
    if (!connectedUser) return
    if (firstLoadRef.current) {
      // Skip the first immediate sync right after loading to avoid overwriting cloud with local
      firstLoadRef.current = false
      return
    }

    setStatus('syncing')
    const timer = setTimeout(async () => {
      try {
        await saveCloudProfile(connectedUser, {
          paper_snapshot: snapshot,
          achievements_snapshot: achievementsInternal,
          watchlist
        })
        setStatus('synced')
      } catch (err) {
        console.error('Auto-sync failed:', err)
        setStatus('error')
      }
    }, 1500) // Debounce for 1.5s

    return () => clearTimeout(timer)
  }, [connectedUser, snapshot, achievementsInternal, watchlist])

  // Also auto-connect if username exists in local storage on first mount
  useEffect(() => {
    if (connectedUser && status === 'idle') {
      connect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border-b border-sparrow-100 bg-sparrow-50/50 px-4 py-2 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sparrow-700">Cloud Sync:</span>
          {connectedUser ? (
            <span className="text-emerald-700 font-semibold">{connectedUser}</span>
          ) : (
            <span className="text-sparrow-500">Not connected</span>
          )}
          {connectedUser && status === 'syncing' && <span className="text-xs text-sparrow-400 ml-2">Syncing...</span>}
          {connectedUser && status === 'synced' && <span className="text-xs text-emerald-500 ml-2">Synced</span>}
          {connectedUser && status === 'error' && <span className="text-xs text-red-500 ml-2">Sync error</span>}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {!connectedUser ? (
            <>
              <input 
                type="text" 
                placeholder="Enter username..." 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connect()}
                className="rounded-full border border-sparrow-200 px-3 py-1 text-xs outline-none focus:border-flame-300 w-32 md:w-48"
              />
              <button
                onClick={connect}
                disabled={status === 'syncing' || !usernameInput.trim()}
                className="rounded-full bg-white border border-sparrow-200 px-3 py-1 text-xs font-medium text-sparrow-700 shadow-sm transition hover:border-flame-300 hover:text-flame-800 disabled:opacity-50"
              >
                Connect
              </button>
            </>
          ) : (
            <button
              onClick={disconnect}
              disabled={status === 'syncing'}
              className="rounded-full bg-white border border-sparrow-200 px-3 py-1 text-xs font-medium text-sparrow-500 shadow-sm transition hover:border-sparrow-300 disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
