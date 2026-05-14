/**
 * affiliate.ts
 *
 * Adds Ticketmaster affiliate tracking to ticket URLs.
 *
 * How to activate:
 * 1. Sign up at https://app.impact.com and find the Ticketmaster program
 * 2. Copy your affiliate/publisher ID
 * 3. Add NEXT_PUBLIC_TM_AFFILIATE_ID=your_id to .env.local (and Vercel env vars)
 *
 * Until the env var is set, all ticket URLs pass through unchanged.
 */

const TM_AFFILIATE_ID = process.env.NEXT_PUBLIC_TM_AFFILIATE_ID

/**
   * Returns the ticket URL with affiliate tracking appended,
   * but only for Ticketmaster URLs and only if the affiliate ID is configured.
   * For all other URLs (Billetto, venue sites, etc.) the URL is unchanged.
   */
export function getTicketUrl(url: string | null | undefined): string | null {
    if (!url) return null

  // Only apply affiliate tracking to Ticketmaster URLs
  if (!TM_AFFILIATE_ID || !url.includes('ticketmaster')) {
        return url
  }

  try {
        const u = new URL(url)
        u.searchParams.set('camefrom', TM_AFFILIATE_ID)
        return u.toString()
  } catch {
        // If URL parsing fails for any reason, return original
      return url
  }
}
