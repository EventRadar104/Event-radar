import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
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
      url: 'https://eventradar.no/saved',
      changeFrequency: 'weekly',
      priority: 0.5,
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
  ]
}
