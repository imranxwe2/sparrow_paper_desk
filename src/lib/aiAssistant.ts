import type { PaperSnapshot } from '../context/PaperTradingContext'

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function portfolioSummary(s: PaperSnapshot): string {
  const lines = [`Cash: ${formatMoney(s.cash)}.`]
  const entries = Object.entries(s.positions).filter(([, p]) => p.qty > 0)
  if (entries.length === 0) {
    lines.push('No open positions yet.')
  } else {
    lines.push('Open positions:')
    for (const [sym, p] of entries) {
      const px = s.lastPrices[sym] ?? p.avgCost
      const mkt = px * p.qty
      const cost = p.avgCost * p.qty
      const pnl = mkt - cost
      lines.push(
        `• ${sym}: ${p.qty} sh @ avg ${formatMoney(p.avgCost)} — ~${formatMoney(mkt)} (${pnl >= 0 ? '+' : ''}${formatMoney(pnl)} vs cost)`,
      )
    }
  }
  return lines.join(' ')
}

const lower = (t: string) => t.toLowerCase()

export async function getAssistantReply(
  userMessage: string,
  snapshot: PaperSnapshot,
): Promise<string> {
  await new Promise((r) => setTimeout(r, 450 + Math.random() * 400))

  const msg = lower(userMessage)
  const summary = portfolioSummary(snapshot)

  if (/hello|hi\b|hey/.test(msg)) {
    return `Hello. I am your Sparrow practice coach. Ask me about orders, risk, or your paper portfolio. Right now: ${summary}`
  }

  if (/help|how (do|to)|confused|start/.test(msg)) {
    return `Here is a quick map: use Buy or Sell on the paper desk with a symbol and whole shares. Start small, track how cash moves, and revisit onboarding anytime from the menu. Your snapshot: ${summary}`
  }

  if (/paper|simulat|fake|real money/.test(msg)) {
    return `Paper trading uses pretend money and live-style quotes that drift for practice only. Nothing here is investment advice, and no real broker is connected. ${summary}`
  }

  if (/buy|long|entry/.test(msg)) {
    return `Buying increases exposure: you pay cash and receive shares at the desk price. Consider position size versus cash, and whether you already hold the name. ${summary}`
  }

  if (/sell|short|exit|close/.test(msg)) {
    return `Selling here closes long paper shares you already own; we do not simulate short selling. If you do not own the symbol, sell will not go through. ${summary}`
  }

  if (/risk|diversif|portfolio|allocat/.test(msg)) {
    return `Risk practice: avoid putting most of your paper cash in one ticker, revisit after a few trades, and notice how volatility feels. Diversifying means spreading exposure so one move hurts less. ${summary}`
  }

  if (/pnl|profit|loss|performance/.test(msg)) {
    return `P&L on the desk is mark-to-market using the current practice quote minus your average cost for held shares. ${summary}`
  }

  if (/symbol|ticker|aapl|msft|goog|amzn|nvda|meta/.test(msg)) {
    return `Symbols on this desk are large U.S. tech-style names for learning mechanics. Pick one from the dropdown, decide share count, and submit a paper order. ${summary}`
  }

  if (/limit|market|order type/.test(msg)) {
    return `This practice app uses simple market-style fills at the shown desk price for immediacy. Real platforms offer limit and stop orders; the idea here is repetition with less friction. ${summary}`
  }

  return `I can explain paper mechanics, orders, risk ideas, or read back your portfolio. Try asking: "How do I size a buy?" or "What is my exposure?" Snapshot: ${summary}`
}
