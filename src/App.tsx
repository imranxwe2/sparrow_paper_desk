import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireOnboarding } from './components/RequireOnboarding'
import { AchievementsProvider } from './context/AchievementsContext'
import { PaperTradingProvider } from './context/PaperTradingContext'
import { getOnboardingDone } from './lib/storage'
import Onboarding from './pages/Onboarding'
import TradeDesk from './pages/TradeDesk'

function RootRedirect() {
  return <Navigate to={getOnboardingDone() ? '/trade' : '/onboard'} replace />
}

export default function App() {
  return (
    <PaperTradingProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/onboard" element={<Onboarding />} />
        <Route
          path="/trade"
          element={
            <RequireOnboarding>
              <AchievementsProvider>
                <TradeDesk />
              </AchievementsProvider>
            </RequireOnboarding>
          }
        />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </PaperTradingProvider>
  )
}
