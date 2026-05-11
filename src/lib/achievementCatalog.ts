export type AchievementId =
  | 'first_profitable_trade'
  | 'diamond_hands'
  | 'risk_manager'
  | 'diversified_portfolio'
  | 'ten_green_days'

export type AchievementDef = {
  id: AchievementId
  title: string
  description: string
  icon: string
  /** Progress target for UI (optional) */
  target?: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_profitable_trade',
    title: 'First profitable trade',
    description: 'Complete a paper sell for more than your average cost on those shares.',
    icon: '✦',
  },
  {
    id: 'diamond_hands',
    title: 'Diamond hands',
    description:
      'Hold shares in a symbol without changing quantity for 48 desk quote ticks in a row (about three minutes at the default timer).',
    icon: '💎',
    target: 48,
  },
  {
    id: 'risk_manager',
    title: 'Risk manager',
    description:
      'Keep cash at or above 30% of portfolio equity for 15 consecutive desk quote ticks (default ~1 minute).',
    icon: '🛡️',
    target: 15,
  },
  {
    id: 'diversified_portfolio',
    title: 'Diversified portfolio',
    description: 'Hold at least one share in four different symbols at the same time.',
    icon: '◎',
  },
  {
    id: 'ten_green_days',
    title: 'Ten green days',
    description: 'Finish 10 separate calendar days with ending equity higher than that day’s start.',
    icon: '🌿',
    target: 10,
  },
]

export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>
