import { supabase } from './supabase'
import type { PaperSnapshot } from '../context/PaperTradingContext'
import type { PersistedAchievementState } from '../lib/achievementStorage'

export type CloudProfileData = {
  paper_snapshot?: PaperSnapshot
  achievements_snapshot?: PersistedAchievementState
  watchlist?: string[]
}

export async function saveCloudProfile(username: string, data: CloudProfileData) {
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.from('profiles').upsert({
    username,
    ...data,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
  return true
}

export async function loadCloudProfile(username: string): Promise<CloudProfileData | null> {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('profiles')
    .select('paper_snapshot, achievements_snapshot, watchlist')
    .eq('username', username)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data as CloudProfileData
}
