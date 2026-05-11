import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SparrowMark } from '../components/SparrowMark'
import { setOnboardingDone } from '../lib/storage'

const slides = [
  {
    title: 'Welcome to Sparrow',
    body: `Sparrow is a calm, white-themed practice desk for learning how trading screens work — without risking real money. You will move through a few short ideas, then land on a simple paper desk with a built-in coach.`,
    kicker: 'Paper only · Education-first',
  },
  {
    title: 'What paper trading means here',
    body: `You start with practice cash. Buy and sell use live-style quotes that drift slowly so you can see fills, cash, and positions change. Nothing connects to a broker; no orders leave your browser.`,
    kicker: 'Simulated fills',
  },
  {
    title: 'How to place a practice order',
    body: `Pick a symbol from the list, choose whole shares, and tap Buy or Sell. Buys spend cash at the desk price; sells return cash only if you already own enough shares. Watch the ledger to see each line item.`,
    kicker: 'Market-style simplicity',
  },
  {
    title: 'Reading your portfolio',
    body: `Cash is what you can still deploy. Positions show quantity and average cost; the desk estimates value using the current practice quote. Use that to think about concentration and how P&L moves when prices change.`,
    kicker: 'Cash · positions · history',
  },
  {
    title: 'The AI practice coach',
    body: `Open the coach panel anytime. It can explain orders, risk habits, and recap your paper snapshot. It is not personalized investment advice — it is training wheels for language and mechanics you will see elsewhere.`,
    kicker: 'Ask in plain language',
  },
  {
    title: 'You are set',
    body: `When you are ready, continue to the paper desk. You can revisit this tour later from the trading page if you want a refresher.`,
    kicker: 'Let us practice',
  },
]

export default function Onboarding() {
  const [i, setI] = useState(0)
  const navigate = useNavigate()
  const slide = slides[i]
  const last = i === slides.length - 1

  function finish() {
    setOnboardingDone()
    navigate('/trade', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-sparrow-50 text-sparrow-700 flex flex-col">
      <header className="border-b border-sparrow-200 bg-white/85 backdrop-blur-sm">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-flame-400/70 to-transparent" aria-hidden />
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <SparrowMark className="h-10 w-10 shrink-0 drop-shadow-sm" />
            <div className="text-left">
              <p className="font-display text-xl text-sparrow-900 italic">Sparrow</p>
              <p className="text-xs text-sparrow-500">Paper trading tour</p>
            </div>
          </div>
          <button
            type="button"
            onClick={finish}
            className="text-sm text-sparrow-500 underline-offset-4 transition hover:text-flame-700 hover:underline"
          >
            Skip tour
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-flame-700/90">{slide.kicker}</p>
        <h1 className="font-display mt-3 text-4xl leading-tight text-sparrow-900 md:text-5xl">
          {slide.title}
        </h1>
        <p className="mt-6 max-w-2xl text-left text-lg leading-relaxed text-sparrow-600">{slide.body}</p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === i
                  ? 'w-10 bg-gradient-to-r from-flame-500 to-flame-600 shadow-sm'
                  : 'w-2 bg-sparrow-300 hover:bg-flame-300'
              }`}
            />
          ))}
        </div>

        <div className="mt-auto flex flex-wrap justify-between gap-4 pt-14">
          <button
            type="button"
            disabled={i === 0}
            onClick={() => setI((x) => Math.max(0, x - 1))}
            className="rounded-full border border-sparrow-300 bg-white px-6 py-3 text-sm font-medium text-sparrow-800 shadow-sm transition hover:border-flame-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          {last ? (
            <button
              type="button"
              onClick={finish}
              className="rounded-full bg-gradient-to-r from-sparrow-900 via-sparrow-900 to-flame-700 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:to-flame-600"
            >
              Go to paper desk
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setI((x) => x + 1)}
              className="rounded-full bg-gradient-to-r from-sparrow-900 via-sparrow-900 to-flame-700 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:to-flame-600"
            >
              Next
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
