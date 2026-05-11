import { ACHIEVEMENTS, type AchievementId } from '../lib/achievementCatalog'
import { useAchievements } from '../context/AchievementsContext'

function ProgressBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((Math.min(current, target) / target) * 100)) : 0
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-sparrow-400">
        <span>{label}</span>
        <span className="font-mono text-sparrow-600">
          {Math.min(current, target)}/{target}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sparrow-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-flame-400 to-flame-600 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function AchievementsPanel() {
  const { unlocked, progress } = useAchievements()
  const set = new Set<AchievementId>(unlocked)

  return (
    <section className="overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/10">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-sparrow-100 bg-gradient-to-r from-white via-flame-50/30 to-white px-5 py-4">
        <div>
          <h2 className="font-display text-xl italic text-sparrow-900">Achievements</h2>
          <p className="mt-1 text-xs text-sparrow-500">
            Practice goals — progress is saved on this device.
          </p>
        </div>
        <p className="text-xs font-medium text-flame-700">
          {unlocked.length}/{ACHIEVEMENTS.length} unlocked
        </p>
      </div>

      <ul className="divide-y divide-sparrow-100">
        {ACHIEVEMENTS.map((a) => {
          const on = set.has(a.id)
          return (
            <li
              key={a.id}
              className={`flex gap-4 px-5 py-4 transition-colors ${
                on ? 'bg-flame-50/25' : 'bg-white hover:bg-sparrow-50/60'
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${
                  on
                    ? 'bg-gradient-to-br from-flame-500 to-flame-600 text-white shadow-sm'
                    : 'border border-sparrow-200 bg-sparrow-50 text-sparrow-400'
                }`}
                aria-hidden
              >
                {a.icon}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-medium ${on ? 'text-sparrow-900' : 'text-sparrow-600'}`}>{a.title}</p>
                  {on && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                      Unlocked
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-snug text-sparrow-500">{a.description}</p>

                {a.id === 'diamond_hands' && !on && (
                  <ProgressBar label="Hold streak (best symbol)" current={progress.diamondHands.current} target={progress.diamondHands.target} />
                )}
                {a.id === 'risk_manager' && !on && (
                  <ProgressBar label="Cash rule streak" current={progress.riskManager.current} target={progress.riskManager.target} />
                )}
                {a.id === 'ten_green_days' && !on && (
                  <ProgressBar label="Green calendar days" current={progress.greenDays.current} target={progress.greenDays.target} />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
