import type { PaperSnapshot } from '../context/PaperTradingContext'
import { supabase, supabaseConfigured } from './supabase'

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

export type ChatMessage = { role: 'user' | 'assistant'; text: string }

async function invokeGeminiDirectly(messages: ChatMessage[], snapshot: PaperSnapshot, key: string): Promise<string> {
  const systemInstruction = `You are Sparrow, a helpful, highly knowledgeable practice trading coach for a paper trading app.
You are helping a beginner learn how to trade. Keep your answers concise, practical, and friendly. DO NOT give financial advice.
CRITICAL: DO NOT use markdown formatting like asterisks, bolding, or lists. Use plain text only. Use standard newlines for spacing.
The user is currently looking at their paper trading desk. Here is their current portfolio snapshot:
${JSON.stringify({
  cash: snapshot.cash,
  openPositions: Object.entries(snapshot.positions).filter(([_, p]) => p.qty > 0).map(([sym, p]) => ({ symbol: sym, qty: p.qty, avgCost: p.avgCost }))
})}

Answer the user's question based on this context.`

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }))

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
    })
  })
  
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.candidates[0].content.parts[0].text
}

export async function getAssistantReply(
  messages: ChatMessage[],
  snapshot: PaperSnapshot,
): Promise<string> {
  // Temporary local override
  const localKey = import.meta.env.VITE_GEMINI_API_KEY
  if (localKey) {
    try {
      return await invokeGeminiDirectly(messages, snapshot, localKey)
    } catch (err: any) {
      return `[Local API Error] ${err.message}`
    }
  }

  // If Supabase is configured, try the Edge Function first
  if (supabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('coach', {
        body: { messages, snapshot }
      })
      if (!error && data?.reply) {
        return data.reply
      }
      
      // Try to extract the real error message if it's a 400
      let errorMessage = error?.message || 'Unknown error'
      if (error && (error as any).context && typeof (error as any).context.json === 'function') {
        try {
          const errBody = await (error as any).context.json()
          if (errBody?.error) errorMessage = errBody.error
        } catch (_) { }
      }
      
      console.warn('Edge function returned error:', errorMessage)
      return `[Backend Error] ${errorMessage}`
    } catch (err: any) {
      console.warn('Failed to reach LLM coach.', err)
      return `[Backend Error] ${err.message}`
    }
  }

  // Fallback to local regex-based logic if no connection or no API key set
  const userMessage = messages[messages.length - 1].text
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
    return `Buying increases exposure: market buys pay the ask (plus any practice fees); limit buys reserve cash until fill or cancel. Consider size versus available cash. ${summary}`
  }

  if (/sell|short|exit|close/.test(msg)) {
    return `Selling here closes long paper shares you already own at the bid (minus a tiny mock sell fee). Limit sells cannot use shares already reserved for other open sell orders. ${summary}`
  }

  if (/risk|diversif|portfolio|allocat/.test(msg)) {
    return `Risk practice: avoid putting most of your paper cash in one ticker, revisit after a few trades, and notice how volatility feels. Diversifying means spreading exposure so one move hurts less. ${summary}`
  }

  if (/pnl|profit|loss|performance/.test(msg)) {
    return `P&L on the desk is mark-to-market using the last/mid practice quote (between bid and ask) minus your average cost for held shares. ${summary}`
  }

  if (/bid|ask|spread|fee/.test(msg)) {
    return `The quote table shows bid (where sells fill), ask (where buys fill), and last/mid for portfolio value. A small mock fee applies on sell fills so you notice friction on tiny trades. ${summary}`
  }

  if (/symbol|ticker|aapl|msft|goog|amzn|nvda|meta/.test(msg)) {
    return `Symbols on this desk are large U.S. tech-style names for learning mechanics. Pick one from the dropdown, decide share count, and submit a paper order. ${summary}`
  }

  if (/limit|market|order type/.test(msg)) {
    return `Market orders fill immediately at the bid (sell) or ask (buy). Limit orders rest in “Working orders” until a quote tick crosses your price, then they fill like a market order at bid/ask. Cancel anytime to release reserved cash (buys) or shares (sells). ${summary}`
  }

  return `I can explain paper mechanics, orders, risk ideas, or read back your portfolio. Try asking: "How do I size a buy?" or "What is my exposure?" Snapshot: ${summary}`
}

export async function getTradePostMortem(
  row: any,
  snapshot: PaperSnapshot,
): Promise<string> {
  const pnl = row.total - ((row.avgCostAtSell ?? 0) * row.qty)

  // Temporary local override
  const localKey = import.meta.env.VITE_GEMINI_API_KEY
  if (localKey) {
    try {
      const messages: ChatMessage[] = [{
        role: 'user',
        text: `I just closed a paper trade: SOLD ${row.qty} shares of ${row.symbol} at $${row.price}. My P&L for this trade was $${pnl.toFixed(2)}. Analyze this trade in exactly 1 or 2 short sentences and give me direct feedback.`
      }]
      return await invokeGeminiDirectly(messages, snapshot, localKey)
    } catch (err: any) {
      return `[Local API Error] ${err.message}`
    }
  }

  if (supabaseConfigured && supabase) {
    try {
      const messages = [{
        role: 'user',
        text: `I just closed a paper trade: SOLD ${row.qty} shares of ${row.symbol} at $${row.price}. My P&L for this trade was $${pnl.toFixed(2)}. Analyze this trade in exactly 1 or 2 short sentences and give me direct feedback.`
      }]
      const { data, error } = await supabase.functions.invoke('coach', {
        body: { messages, snapshot }
      })
      if (!error && data?.reply) {
        return data.reply
      }
      
      let errorMessage = error?.message || 'Unknown error'
      if (error && (error as any).context && typeof (error as any).context.json === 'function') {
        try {
          const errBody = await (error as any).context.json()
          if (errBody?.error) errorMessage = errBody.error
        } catch (_) { }
      }
      
      console.warn('Edge function returned error:', errorMessage)
      return `[Backend Error] ${errorMessage}`
    } catch (err: any) {
      console.warn('Failed to reach LLM coach.', err)
      return `[Backend Error] ${err.message}`
    }
  }

  // Fallback if no Supabase
  await new Promise((r) => setTimeout(r, 450))
  return pnl >= 0 
    ? `Nice work closing this trade in the green for a profit of $${pnl.toFixed(2)}. Make sure your risk was managed well!`
    : `You took a small loss of $${Math.abs(pnl).toFixed(2)} here. Review your entry criteria to see what you could improve next time.`
}
