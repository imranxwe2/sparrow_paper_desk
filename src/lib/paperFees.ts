/** Mock regulatory-style fee per sell order (flat, for learning only). */
export const MOCK_SELL_FEE_PER_ORDER = 0.02

export function sellFeeForOrder(_qty: number): number {
  return MOCK_SELL_FEE_PER_ORDER
}

export function buyFeeForOrder(_qty: number): number {
  return 0
}
