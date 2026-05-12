import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const WALKTHROUGH_STEPS = [
  { path: '/trade', target: '#nav-trade, #mobile-nav-trade', title: 'Trade Desk', body: 'This is where you place practice orders and view live quotes.' },
  { path: '/trade', target: '#order-panel', title: 'Place an Order', body: 'Buy or sell stocks here. You can set market orders for immediate fills or limit orders.' },
  { path: '/trade', target: '#order-panel', title: 'AI Post-Mortem', body: 'After selling a position, an Analyze button will appear here. Click it to get immediate, AI-generated feedback on your completed trade.' },
  { path: '/trade', target: '#live-chart', title: 'Interactive Chart', body: 'Track real-time market data on this chart to see how prices trend.' },
  { path: '/trade', target: '#live-quotes', title: 'Live Quotes', body: 'Click on any symbol here to select it for trading and update the chart.' },
  { path: '/trade', target: '#news-ticker', title: 'Live News', body: 'Watch this ticker for breaking news events that directly impact stock prices in real-time.' },
  { path: '/portfolio', target: '#nav-portfolio, #mobile-nav-portfolio', title: 'Your Portfolio', body: 'After trading, head here to see your open positions, average costs, and overall performance.' },
  { path: '/coach', target: '#nav-coach, #mobile-nav-coach', title: 'AI Coach', body: 'Ask questions, review trades, or get trading tips from your built-in AI mentor.' },
]

export function Walkthrough() {
  const [activeStep, setActiveStep] = useState(-1)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check if we just finished onboarding
    if (sessionStorage.getItem('start_walkthrough') === 'true') {
      sessionStorage.removeItem('start_walkthrough')
      setActiveStep(0)
    }
  }, [])

  useEffect(() => {
    if (activeStep < 0 || activeStep >= WALKTHROUGH_STEPS.length) return
    const step = WALKTHROUGH_STEPS[activeStep]
    
    // Auto-navigate to the correct page for the step
    if (location.pathname !== step.path) {
      navigate(step.path)
    }
  }, [activeStep, location.pathname, navigate])

  if (activeStep < 0 || activeStep >= WALKTHROUGH_STEPS.length) return null

  const step = WALKTHROUGH_STEPS[activeStep]

  return <WalkthroughTooltip stepIndex={activeStep} step={step} onNext={() => setActiveStep(i => i + 1)} onEnd={() => setActiveStep(-1)} />
}

function WalkthroughTooltip({ stepIndex, step, onNext, onEnd }: any) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    let active = true
    const checkEl = () => {
      if (!active) return
      const els = document.querySelectorAll(step.target)
      for (const el of Array.from(els)) {
         if (el instanceof HTMLElement && el.offsetParent !== null) {
            setRect(el.getBoundingClientRect())
            return
         }
      }
    }
    
    // Poll to find the element
    const interval = setInterval(checkEl, 200)
    checkEl()

    // Also observe scroll/resize
    window.addEventListener('resize', checkEl)
    window.addEventListener('scroll', checkEl, { capture: true })
    
    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('resize', checkEl)
      window.removeEventListener('scroll', checkEl, { capture: true })
    }
  }, [step])

  if (!rect) return null

  // Calculate tooltip position to keep it in viewport
  const topPosition = rect.bottom + 20 > window.innerHeight - 150 ? Math.max(20, rect.top - 160) : rect.bottom + 20
  const leftPosition = Math.max(20, Math.min(rect.left, window.innerWidth - 340))

  return (
     <div className="fixed inset-0 z-[100]">
        {/* Invisible blocker to prevent clicks on the app */}
        <div className="absolute inset-0 cursor-default" />
        
        {/* Dark overlay with cutout using box-shadow on a pointer-events-none element */}
        <div 
           className="pointer-events-none rounded-xl"
           style={{
             position: 'absolute',
             top: rect.top - 4,
             left: rect.left - 4,
             width: rect.width + 8,
             height: rect.height + 8,
             boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)',
             transition: 'all 0.3s ease-in-out'
           }}
        />

        {/* Tooltip Popover */}
        <div 
           className="absolute pointer-events-auto bg-white p-5 rounded-2xl shadow-2xl border border-sparrow-200 w-80 transition-all duration-300 transform scale-100 animate-[in_0.2s_ease-out]"
           style={{
              top: topPosition,
              left: leftPosition
           }}
        >
           <h4 className="font-bold text-sparrow-900 mb-2">{step.title}</h4>
           <p className="text-sm text-sparrow-600 mb-5 leading-relaxed">{step.body}</p>
           
           <div className="flex items-center justify-between">
              <span className="text-xs text-sparrow-400 font-medium tracking-wider uppercase">Step {stepIndex + 1} of {WALKTHROUGH_STEPS.length}</span>
              <div className="flex gap-3">
                 <button onClick={onEnd} className="text-xs font-medium text-sparrow-500 hover:text-sparrow-900 transition-colors">Skip</button>
                 <button onClick={onNext} className="px-4 py-2 text-xs font-bold bg-flame-600 text-white rounded-full hover:bg-flame-700 shadow-sm transition-transform active:scale-95">
                   {stepIndex === WALKTHROUGH_STEPS.length - 1 ? 'Finish' : 'Next'}
                 </button>
              </div>
           </div>
        </div>
     </div>
  )
}
