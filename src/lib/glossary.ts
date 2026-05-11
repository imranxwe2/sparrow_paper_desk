/** One-line definitions for desk UI tooltips (education only, not advice). */
export const GLOSSARY = {
  last: 'Last / mid: practice “fair” price between bid and ask, used for portfolio value on this desk.',
  bid: 'Bid: the price a buyer is willing to pay. Paper sells fill at the bid (minus any practice fees).',
  ask: 'Ask: the price a seller wants. Paper buys fill at the ask (plus any practice fees).',
  spread: 'Spread: ask minus bid. Wider spreads mean you pay more to cross both ways in real markets.',
  equity: 'Est. equity: cash plus the value of shares at last/mid prices (same basis as achievements).',
  fee: 'Practice fee: a tiny mock regulatory-style charge on sells so you notice costs on small trades.',
  limit: 'Limit order: rests until the practice quote crosses your price, then fills like a market fill at bid/ask.',
  market: 'Market order: fills immediately at the current bid (sell) or ask (buy) on this desk.',
  escrow: 'Reserved cash: limit buys lock up limit × shares until fill or cancel so overlaps cannot overspend.',
} as const

export type GlossaryKey = keyof typeof GLOSSARY
