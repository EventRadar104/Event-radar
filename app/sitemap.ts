import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('slug, updated_at')
    .eq('status', 'published')
    .not('slug', 'is', null)

  const eventUrls: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
    url: `https://eventradar.no/events/${event.slug}`,
    lastModified: event.updated_at,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [
    {
      url: 'https://eventradar.no',
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://eventradar.no/search',
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://eventradar.no/trip',
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://eventradar.no/map',
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: 'https://eventradar.no/saved',
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    ...eventUrls,
  ]
}
