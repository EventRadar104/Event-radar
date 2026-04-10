import { Suspense } from 'react'
import Link from 'next/link'
import { searchEvents, getPublishedEventCount } from '@/lib/queries'
import { EventCard } from '@/components/EventCard'
import type { SearchParams } from '@/lib/types'

// ── Filter bar ────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Music',      slug: 'concerts-music' },
  { label: 'Sports',     slug: 'sports' },
  { label: 'Food & Drink',       slug: 'food-nightlife' },
  { label: 'Outdoor',    slug: 'outdoors' },
  { label: 'Comedy',     slug: 'comedy' },
]

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Tromsø', 'Stavanger', 'Kristiansand']

// ── Page ─────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const [events, totalCount] = await Promise.all([
  searchEvents(params),
  getPublishedEventCount(),
])

  const activeCity = params.city ?? ''
  const activeCat  = params.cat  ?? ''
  const onlyFree   = params.free === 'true'

  return (
