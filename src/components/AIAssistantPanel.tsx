import { useRef, useState } from 'react'
import { usePaper } from '../context/PaperTradingContext'
import { getAssistantReply } from '../lib/aiAssistant'

type Msg = { role: 'user' | 'assistant'; text: string }

const INITIAL: Msg = {
  role: 'assistant',
  text: 'I am your Sparrow practice coach. Ask about orders, symbols, or how to read your paper portfolio — I will keep answers grounded in what you see on the desk.',
}

const suggestions = [
  'What is paper trading?',
  'How should I think about risk?',
  'Explain my portfolio snapshot.',
]

export function AIAssistantPanel() {
  const { snapshot } = usePaper()
  const [messages, setMessages] = useState<Msg[]>([INITIAL])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  async function send(text?: string) {
    const t = (text ?? input).trim()
    if (!t || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: t }])
    setLoading(true)
    try {
      const reply = await getAssistantReply(t, snapshot)
      setMessages((m) => [...m, { role: 'assistant', text: reply }])
    } finally {
      setLoading(false)
      queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }))
    }
  }

  function clearChat() {
    setMessages([INITIAL])
    setInput('')
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-sparrow-200 bg-white shadow-sm ring-1 ring-flame-500/10">
      <div className="border-b border-sparrow-100 bg-gradient-to-r from-white via-flame-50/40 to-white px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-sparrow-900 italic">Practice coach</h2>
            <p className="mt-1 text-xs text-sparrow-500">
              AI-style guidance for mechanics and habits — not financial advice.
            </p>
          </div>
          <button
            type="button"
            onClick={clearChat}
            className="shrink-0 rounded-lg border border-sparrow-200 bg-white px-2.5 py-1.5 text-xs font-medium text-sparrow-600 transition hover:border-flame-300 hover:text-flame-700"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-flame-600 to-flame-700 text-white shadow-sm'
                  : 'border-l-2 border-flame-400/80 bg-sparrow-50 text-sparrow-700 ring-1 ring-sparrow-100'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-xs text-flame-600/80 italic">Coach is thinking…</p>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-sparrow-100 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="rounded-full border border-sparrow-200 bg-sparrow-50 px-3 py-1.5 text-xs text-sparrow-600 transition hover:border-flame-300 hover:bg-flame-50/80 hover:text-flame-800"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about trading on this desk…"
            className="min-w-0 flex-1 rounded-xl border border-sparrow-200 bg-sparrow-50 px-4 py-3 text-sm text-sparrow-900 outline-none placeholder:text-sparrow-400 focus:border-flame-300 focus:bg-white focus:ring-2 focus:ring-flame-500/25"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-xl bg-gradient-to-br from-flame-600 to-flame-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:from-flame-500 hover:to-flame-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
