import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SparrowMark } from '../components/SparrowMark'
import { setOnboardingDone } from '../lib/storage'

const slides = [
  {
    title: 'Welcome to Sparrow',
    body: `Sparrow is a risk-free paper trading simulator. You start with practice cash to buy and sell stocks using live-style quotes. It's the perfect place to learn how trading works, build a portfolio, and interact with a built-in AI coach—all without risking a single dime. Let's start with some basics.`,
    kicker: 'Paper only · Education-first',
  },
  {
    title: 'What is a Stock?',
    body: `A stock represents a small piece of ownership in a real company. When you buy a share, you become a part-owner. If the company grows and makes a profit, the value of your stock typically goes up. If the company struggles, the value goes down. The stock market is simply where people buy and sell these shares.`,
    kicker: 'The Basics',
  },
  {
    title: 'Tickers and Prices',
    body: `Companies are identified by short abbreviations called 'tickers' (like AAPL for Apple). Stock prices change constantly throughout the day based on supply and demand. If more people want to buy, the price rises; if more want to sell, it falls. In Sparrow, you'll see these live-style quotes update automatically.`,
    kicker: 'Market Mechanics',
  },
  {
    title: 'Buying and Selling',
    body: `To buy a stock, you select its ticker, choose how many shares you want, and place a Buy order using your available cash. To lock in a profit or cut a loss, you place a Sell order to convert those shares back to cash. In this app, select a symbol and tap Buy or Sell to see immediate simulated fills.`,
    kicker: 'Taking Action',
  },
  {
    title: 'Managing Your Portfolio',
    body: `Your portfolio is the total value of your cash and the stocks you own. A key investing concept is 'diversification'—spreading your money across different companies to reduce risk. Your portfolio tab shows your positions, the average price you paid, and how your wealth fluctuates with the market.`,
    kicker: 'Wealth Building',
  },
  {
    title: 'What is Paper Trading?',
    body: `Sparrow is a "paper trading" simulator. This means you are using fake practice cash to trade real-world or simulated stock movements. Nothing connects to a real broker, and there is zero financial risk. It's the perfect way to test strategies and learn how trading screens work before using real money.`,
    kicker: 'Risk-Free Practice',
  },
  {
    title: 'Breaking News Events',
    body: `Keep an eye on the live news ticker at the bottom of the screen. Simulated breaking news will drop periodically, causing immediate spikes or crashes in stock prices. Learning to trade around volatility is a key part of the experience.`,
    kicker: 'Market Catalysts',
  },
  {
    title: 'AI Trade Post-Mortems',
    body: `After you close a position by selling your shares, you can instantly request an AI Trade Post-Mortem. The AI coach will analyze your execution and profit/loss to give you direct feedback on what you did right and what to improve next time.`,
    kicker: 'Continuous Learning',
  },
  {
    title: 'Your Personal AI Coach',
    body: `If you ever feel lost or want to learn a new financial term, open the AI coach panel. It can explain risk habits, and answer questions about the market. Use it to build your financial vocabulary and confidence as you trade.`,
    kicker: 'Ask in Plain Language',
  },
  {
    title: 'You are set',
    body: `You are now ready to hit the trading desk. You will start with a fresh balance of practice cash. Take your time, buy your first stock, and watch how it performs. You can revisit this tour anytime if you need a refresher.`,
    kicker: 'Let us practice',
  },
]

function TutorialVisual({ slideIndex }: { slideIndex: number }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1500)
    return () => clearInterval(interval)
  }, [])

  switch (slideIndex) {
    case 0:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <SparrowMark className="h-20 w-20 text-flame-600 animate-pulse" />
        </div>
      )
    case 1:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <div className={`grid grid-cols-2 gap-2 transition-transform duration-1000 ${tick % 2 === 0 ? 'scale-110 rotate-12' : 'scale-95 -rotate-6'}`}>
            <div className="h-12 w-12 rounded-md bg-sparrow-800"></div>
            <div className="h-12 w-12 rounded-md bg-flame-500"></div>
            <div className="h-12 w-12 rounded-md bg-flame-400"></div>
            <div className="h-12 w-12 rounded-md bg-sparrow-300"></div>
          </div>
        </div>
      )
    case 2:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <div className="flex items-center gap-4 rounded-xl border border-sparrow-100 bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold text-sparrow-900">AAPL</div>
            <div className={`font-mono text-2xl font-medium transition-colors duration-300 ${tick % 2 === 0 ? 'text-green-600' : 'text-red-500'}`}>
              ${tick % 2 === 0 ? '150.25' : '149.90'}
            </div>
          </div>
        </div>
      )
    case 3:
      return (
        <div className="flex h-48 w-full items-center justify-center gap-6 rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <div className="relative">
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-green-600 transition-all duration-500 ${tick % 2 === 0 ? '-translate-y-2 opacity-100' : 'translate-y-0 opacity-0'}`}>
              +1
            </div>
            <div className={`rounded-lg bg-green-500 px-6 py-3 font-bold text-white shadow-md transition-transform duration-200 ${tick % 2 === 0 ? 'scale-95 bg-green-600' : 'scale-100'}`}>
              BUY
            </div>
          </div>
          <div className="relative">
            <div className={`rounded-lg bg-red-500 px-6 py-3 font-bold text-white shadow-md transition-transform duration-200 ${tick % 2 === 1 ? 'scale-95 bg-red-600' : 'scale-100'}`}>
              SELL
            </div>
          </div>
        </div>
      )
    case 4:
      return (
        <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-sparrow-200 bg-white/50 p-8 shadow-sm">
          <div className="flex w-full max-w-[200px] items-center gap-3">
            <div className="w-12 text-xs font-bold text-sparrow-500">AAPL</div>
            <div className={`h-4 rounded-full bg-flame-500 transition-all duration-1000 ${tick % 2 === 0 ? 'w-[60%]' : 'w-[65%]'}`}></div>
          </div>
          <div className="flex w-full max-w-[200px] items-center gap-3">
            <div className="w-12 text-xs font-bold text-sparrow-500">MSFT</div>
            <div className={`h-4 rounded-full bg-sparrow-800 transition-all duration-1000 ${tick % 2 === 0 ? 'w-[40%]' : 'w-[35%]'}`}></div>
          </div>
          <div className="flex w-full max-w-[200px] items-center gap-3">
            <div className="w-12 text-xs font-bold text-sparrow-500">TSLA</div>
            <div className={`h-4 rounded-full bg-flame-300 transition-all duration-1000 ${tick % 2 === 0 ? 'w-[25%]' : 'w-[30%]'}`}></div>
          </div>
        </div>
      )
    case 5:
      return (
        <div className="flex h-48 w-full flex-col items-center justify-center rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <div className={`font-mono text-4xl font-bold transition-colors duration-500 ${tick % 2 === 0 ? 'text-sparrow-900' : 'text-flame-600'}`}>$100,000.00</div>
          <div className="mt-2 rounded-full bg-flame-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-flame-700">Practice Cash</div>
        </div>
      )
    case 6:
      return (
        <div className="flex h-48 w-full flex-col overflow-hidden items-center justify-center rounded-2xl border border-sparrow-200 bg-sparrow-900 shadow-sm relative">
          <div className="absolute top-1/2 left-0 w-full bg-flame-600 h-10 flex items-center shadow-[0_0_15px_rgba(234,88,12,0.6)]">
            <div className={`whitespace-nowrap font-mono text-sm font-bold text-white transition-transform duration-[3000ms] ease-linear ${tick % 2 === 0 ? '-translate-x-10' : '-translate-x-32'}`}>
              BREAKING: TSLA ANNOUNCES NEW AI ROBOTICS PLATFORM... AAPL EARNINGS BEAT EXPECTATIONS... 
            </div>
          </div>
        </div>
      )
    case 7:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <div className={`flex flex-col items-center gap-3 transition-transform duration-500 ${tick % 2 === 0 ? 'scale-105' : 'scale-100'}`}>
            <div className="rounded-xl border border-sparrow-200 bg-white px-4 py-2 shadow-sm text-sm">
              <span className="font-bold text-flame-600">SELL AAPL</span> • +$120.50 Profit
            </div>
            <div className="rounded-lg bg-sparrow-800 px-4 py-2 text-xs text-white">
              AI: Nice work closing in the green!
            </div>
          </div>
        </div>
      )
    case 8:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <div className={`max-w-[200px] rounded-2xl rounded-bl-sm bg-sparrow-800 p-4 text-white shadow-lg transition-transform duration-500 ${tick % 2 === 0 ? '-translate-y-2' : 'translate-y-0'}`}>
            <p className="text-sm">Hi! I'm your AI Coach. Ask me anything about trading.</p>
          </div>
        </div>
      )
    case 9:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-sparrow-200 bg-white/50 shadow-sm">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500 ${tick % 2 === 0 ? 'scale-110 bg-green-100' : 'scale-100 bg-green-50'}`}>
            <svg className="h-10 w-10 text-green-600" fill="none" strokeWidth="3" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function Onboarding() {
  const [i, setI] = useState(0)
  const navigate = useNavigate()
  const slide = slides[i]
  const last = i === slides.length - 1

  function finish() {
    setOnboardingDone()
    sessionStorage.setItem('start_walkthrough', 'true')
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
        <TutorialVisual slideIndex={i} />

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-widest text-flame-700/90">{slide.kicker}</p>
          <h1 className="font-display mt-3 text-4xl leading-tight text-sparrow-900 md:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-6 max-w-2xl text-left text-lg leading-relaxed text-sparrow-600">{slide.body}</p>
        </div>

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
