import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { row, snapshot } = await req.json()
    
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('Missing GEMINI_API_KEY environment variable in Supabase')

    const pnl = row.total - (row.avgCostAtSell * row.qty)
    const pnlPercent = row.avgCostAtSell > 0 ? (pnl / (row.avgCostAtSell * row.qty)) * 100 : 0

    const systemInstruction = `You are a concise AI trading coach. The user just closed a paper trade.
Analyze the trade in exactly 1 or 2 short sentences. Be direct. DO NOT use formatting. DO NOT give financial advice. Keep it under 40 words to save credits.
Context:
- Action: SOLD ${row.qty} shares of ${row.symbol} at $${row.price}.
- P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%).
- Current Cash: $${snapshot.cash.toFixed(2)}.
Tell them one thing they did well or one thing to watch out for based on this outcome.`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: "Analyze my recent trade." }]
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 100, // Very small to keep it cheap
        }
      })
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }

    const reply = data.candidates[0].content.parts[0].text

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
