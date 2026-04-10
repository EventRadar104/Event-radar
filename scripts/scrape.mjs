import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TM_KEY = process.env.TICKETMASTER_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !TM_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function getCategorySlug(classifications) {
  const seg = classifications?.[0]?.segment?.name?.toLowerCase() ?? ''
  if (seg.includes('music')) return 'concerts-music'
  if (seg.includes('sport')) return 'sports'
  if (seg.includes('arts') || seg.includes('theatre')) return 'culture-arts'
  if (seg.includes('food')) return 'food-nightlife'
  if (seg.includes('comedy')) return 'comedy'
  return 'other'
}

function makeSlug(title, id) {
  const base = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
  return `${base}-${id.slice(-8)}`
}

async function fetchPage(page) {
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
  url.searchParams.set('apikey', TM_KEY)
  url.searchParams.set('countryCode', 'NO')
  url.searchParams.set('size', '100')
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', 'date,asc')
  url.searchParams.set('startDateTime', new Date().toISOString().slice(0, 19) + 'Z')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TM API ${res.status}`)
  return res.json()
}

async function upsertVenue(v) {
  if (!v) return null
  const { data, error } = await supabase.from('venues').upsert({
    name: v.name,
    city: v.city?.name ?? null,
    address: v.address?.line1 ?? null,
    postal_code: v.postalCode ?? null,
    country: 'NO',
    latitude: v.location?.latitude ? parseFloat(v.location.latitude) : null,
    longitude: v.location?.longitude ? parseFloat(v.location.longitude) : null,
  }, { onConflict: 'name' }).select('id').single()
  if (error) {
    const { data: ex } = await supabase.from('venues').select('id').eq('name', v.name).maybeSingle()
    return ex?.id ?? null
  }
  return data?.id ?? null
}

async function getCatId(slug, cache) {
  if (cache[slug]) return cache[slug]
  const { data } = await supabase.from('categories').select('id').eq('slug', slug).single()
  cache[slug] = data?.id ?? null
  return cache[slug]
}

async function main() {
  let page = 0, totalPages = 1, total = 0
  const catCache = {}
  while (page < totalPages && page < 5) {
    console.log(`Page ${page + 1}/${totalPages}`)
    const data = await fetchPage(page)
    totalPages = Math.min(data.page?.totalPages ?? 1, 5)
    const events = data._embedded?.events ?? []
    for (const ev of events) {
      try {
        const venueId = await upsertVenue(ev._embedded?.venues?.[0])
        const catSlug = getCategorySlug(ev.classifications)
        const catId = await getCatId(catSlug, catCache)
        const price = ev.priceRanges?.[0]
        const image = ev.images?.find(i => i.ratio === '16_9' && i.width > 1000) ?? ev.images?.[0]
        const slug = makeSlug(ev.name, ev.id)
        const { data: saved, error } = await supabase.from('events').upsert({
          title: ev.name,
          slug,
          description: ev.info ?? ev.pleaseNote ?? null,
          cover_image_url: image?.url ?? null,
          starts_at: ev.dates?.start?.dateTime ?? `${ev.dates?.start?.localDate}T20:00:00Z`,
          venue_id: venueId,
          is_free: price ? price.min === 0 : false,
          price_from: price?.min ?? null,
          price_to: price?.max ?? null,
          ticket_url: ev.url ?? null,
          status: 'published',
          source: 'scraped',
          source_url: ev.url ?? null,
          source_id: ev.id,
          language: 'no',
        }, { onConflict: 'source,source_id' }).select('id').single()
        if (error) { console.error(ev.name, error.message); continue }
        if (saved?.id && catId) {
          await supabase.from('event_categories')
            .upsert({ event_id: saved.id, category_id: catId }, { onConflict: 'event_id,category_id', ignoreDuplicates: true })
        }
        total++
      } catch (e) {
        console.error(ev.name, e.message)
      }
    }
    page++
    await new Promise(r => setTimeout(r, 300))
  }
  console.log(`Done — ${total} events upserted.`)
}

main().catch(e => { console.error(e); process.exit(1) })
