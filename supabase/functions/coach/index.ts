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
    const { messages, snapshot } = await req.json()
    
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('Missing GEMINI_API_KEY environment variable in Supabase')

    const systemInstruction = `You are Sparrow, a helpful, highly knowledgeable practice trading coach for a paper trading app.
You are helping a beginner learn how to trade. Keep your answers concise, practical, and friendly. DO NOT give financial advice.
The user is currently looking at their paper trading desk. Here is their current portfolio snapshot:
${JSON.stringify({
  cash: snapshot.cash,
  openPositions: Object.entries(snapshot.positions).filter(([_, p]) => (p as any).qty > 0).map(([sym, p]) => ({ symbol: sym, qty: (p as any).qty, avgCost: (p as any).avgCost }))
})}

Answer the user's question based on this context.`

    // Format messages for Gemini
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }))

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
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
