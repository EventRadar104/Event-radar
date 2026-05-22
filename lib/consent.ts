const CONSENT_KEY = 'cookie_consent'
const ANALYTICS_KEY = 'analytics_consent'
const MARKETING_KEY = 'marketing_consent'

export type ConsentValue = 'accepted' | 'declined' | null

export function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CONSENT_KEY) as ConsentValue
}

export function getAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  const v = localStorage.getItem(ANALYTICS_KEY)
  // Fall back to overall consent if granular key not yet set
  return v === null ? getConsent() === 'accepted' : v === 'true'
}

export function getMarketingConsent(): boolean {
  if (typeof window === 'undefined') return false
  const v = localStorage.getItem(MARKETING_KEY)
  return v === null ? getConsent() === 'accepted' : v === 'true'
}

export function acceptAll(): void {
  localStorage.setItem(CONSENT_KEY, 'accepted')
  localStorage.setItem(ANALYTICS_KEY, 'true')
  localStorage.setItem(MARKETING_KEY, 'true')
  loadAnalytics()
  loadAds()
}

export function declineAll(): void {
  localStorage.setItem(CONSENT_KEY, 'declined')
  localStorage.setItem(ANALYTICS_KEY, 'false')
  localStorage.setItem(MARKETING_KEY, 'false')
}

export function savePreferences(analytics: boolean, marketing: boolean): void {
  localStorage.setItem(ANALYTICS_KEY, String(analytics))
  localStorage.setItem(MARKETING_KEY, String(marketing))
  localStorage.setItem(CONSENT_KEY, analytics || marketing ? 'accepted' : 'declined')
  if (analytics) loadAnalytics()
  if (marketing) loadAds()
}

// Placeholder — replace with actual GA script injection when ready
export function loadAnalytics(): void {
  // e.g. inject gtag script tag here
}

// Placeholder — replace with actual ads script injection when ready
export function loadAds(): void {
  // e.g. inject Google Ads script tag here
}

// Call on every page load to re-activate scripts for returning visitors who already consented
export function initConsentedScripts(): void {
  if (typeof window === 'undefined') return
  if (getAnalyticsConsent()) loadAnalytics()
  if (getMarketingConsent()) loadAds()
}
