const ONBOARD_KEY = 'sparrow_onboarding_v1'
const PAPER_KEY = 'sparrow_paper_v1'

export function getOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === '1'
  } catch {
    return false
  }
}

export function setOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARD_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function loadPaperRaw(): string | null {
  try {
    return localStorage.getItem(PAPER_KEY)
  } catch {
    return null
  }
}

export function savePaperRaw(json: string): void {
  try {
    localStorage.setItem(PAPER_KEY, json)
  } catch {
    /* ignore */
  }
}
