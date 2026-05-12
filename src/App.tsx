import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireOnboarding } from './components/RequireOnboarding'
import { AchievementsProvider } from './context/AchievementsContext'
import { PaperTradingProvider } from './context/PaperTradingContext'
import { getOnboardingDone } from './lib/storage'
import Onboarding from './pages/Onboarding'
import TradeDesk from './pages/TradeDesk'
import Portfolio from './pages/Portfolio'
import CoachPage from './pages/CoachPage'
import AchievementsPage from './pages/AchievementsPage'
import { Layout } from './components/Layout'

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
          element={
            <RequireOnboarding>
              <AchievementsProvider>
                <Layout />
              </AchievementsProvider>
            </RequireOnboarding>
          }
        >
          <Route path="/trade" element={<TradeDesk />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
        </Route>
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </PaperTradingProvider>
  )
}
