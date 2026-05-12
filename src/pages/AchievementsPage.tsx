import { AchievementsPanel } from '../components/AchievementsPanel'

export default function AchievementsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-display italic text-sparrow-900 mb-6">Your Progress</h1>
      <AchievementsPanel />
    </div>
  )
}
