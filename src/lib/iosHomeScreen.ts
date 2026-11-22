const DISMISS_KEY = 'ourcal.a2hs.dismissed'

/** True on iPhone/iPad Safari that is not already running as a home-screen app. */
export function shouldShowIosHomeScreenHint(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (window.localStorage.getItem(DISMISS_KEY) === '1') return false

  const standalone =
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)) ||
    window.matchMedia('(display-mode: standalone)').matches
  if (standalone) return false

  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua)
  const notChromeOrFirefox = !/CriOS|FxiOS|EdgiOS/.test(ua)
  return iOS && webkit && notChromeOrFirefox
}

export function dismissIosHomeScreenHint(): void {
  window.localStorage.setItem(DISMISS_KEY, '1')
}
