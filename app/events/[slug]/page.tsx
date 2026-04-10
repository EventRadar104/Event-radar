import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getEventBySlug, getRsvpCount, getUserEventState } from '@/lib/queries'
import { RsvpButton } from '@/components/RsvpButton'
import { SaveButton } from '@/components/SaveButton'
import { ShareButton } from '@/components/ShareButton'
import ViewTracker from './ViewTracker'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Event not found — Event Radar' }

  const date = new Date(event.starts_at).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const venue = [event.venue_name, event.venue_city].filter(Boolean).join(', ')
  const priceText = event.is_free
    ? 'Free entry'
    : event.price_from
    ? `From ${event.price_from} kr`
    : null

  const parts = [venue, date, priceText].filter(Boolean)
  const suffix = parts.join(' · ')
  const snippet = event.description?.slice(0, 80)
  const description = snippet ? `${suffix}. ${snippet}` : suffix

  return {
    title: `${event.title} — Event Radar`,
    description: description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: description.slice(0, 160),
      images: event.cover_image_url ? [event.cover_image_url] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: description.slice(0, 160),
      images: event.cover_image_url ? [event.cover_image_url] : [],
    },
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params
  const [event, , userState] = await Promise.all([
    getEventBySlug(slug),
    getRsvpCount(slug),
    getUserEventState(slug),
