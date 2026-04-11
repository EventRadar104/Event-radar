import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TM_KEY = process.env.TICKETMASTER_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !TM_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Suffixes that indicate a VIP/upgrade variant of an existing event
const VIP_PATTERN = /[\s\-\u2013\u2014]*(VIP|Platinum|Premium|Package|Meet\s*&\s*Greet|Early\s*Access|Soundcheck|Hospitality)\b.*/i

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
  url.searchParams.set('startDateTime', new Date().toISOString().slice(0, -5) + 'Z')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TM API ${res.status}`)
  return res.json()
}

async function upsertVenue(v) {
  if (!v) return null
  const { name, city, postalCode, address, location } = v
  const { data, error } = await supabase
    .from('venues')
    .upsert({
      name,
      city: city?.name ?? null,
      address: address?.line1 ?? null,
      postal_code: postalCode ?? null,
      country: 'NO',
      latitude: location?.latitude ? parseFloat(location.latitude) : null,
      longitude: location?.longitude ? parseFloat(location.longitude) : null,
    }, { onConflict: 'name' })
    .select('id')
    .single()
  if (error) {
    const { data } = await supabase.from('venues').select('id').eq('name', name).maybeSingle()
    return data?.id ?? null
  }
  return data?.id ?? null
}

const catCache = {}
async function getCatId(slug) {
  if (catCache[slug]) return catCache[slug]
  const { data } = await supabase.from('categories').select('id').eq('slug', slug).single()
  catCache[slug] = data?.id ?? null
  return catCache[slug]
}

async function main() {
  let page = 0
  let totalPages = 1
  let total = 0

  while (page < totalPages) {
    console.log(`Page ${page + 1}/${totalPages}`)
    const data = await fetchPage(page)
    totalPages = Math.min(data.page?.totalPages ?? 1, 5)
    const events = data._embedded?.events ?? []

    for (const ev of events) {
      try {
        const venueId = await upsertVenue(ev._embedded?.venues?.[0])
        const catSlug = getCategorySlug(ev.classifications)
        const catId = await getCatId(catSlug)
        const price = ev.priceRanges?.[0]
        const image = ev.images?.find(i => i.ratio === '16_9' && i.width >= 1000) ?? ev.images?.[0]
        const slug = makeSlug(ev.name, ev.id)

        // --- Dedup: merge VIP/Package variants into the parent event ---
        const isVipVariant = VIP_PATTERN.test(ev.name)
        const baseTitle = ev.name.replace(VIP_PATTERN, '').trim()
        const dateOnly = (ev.dates?.start?.dateTime ?? (ev.dates?.start?.localDate + 'T00:00:00Z')).slice(0, 10)

        if (isVipVariant && venueId) {
          const { data: parent } = await supabase
            .from('events')
            .select('id, price_to')
            .eq('venue_id', venueId)
            .gte('starts_at', dateOnly + 'T00:00:00Z')
            .lte('starts_at', dateOnly + 'T23:59:59Z')
            .ilike('title', baseTitle + '%')
            .eq('source', 'scraped')
            .maybeSingle()

          if (parent) {
            // Update price_to so card shows "fra X kr" to "Y kr"
            const newPriceTo = price?.max ?? parent.price_to
            await supabase.from('events').update({ price_to: newPriceTo }).eq('id', parent.id)
            console.log(`  ↩ Merged VIP price into: ${baseTitle}`)
            continue
          }
          // No parent found yet — fall through and insert as normal
        }

        const { data: saved, error } = await supabase
          .from('events')
          .upsert({
            title: ev.name,
            slug,
            description: ev.info || ev.pleaseNote || null,
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
          }, { onConflict: 'source,source_id' })
          .select('id')
          .single()

        if (error) {
          console.error(ev.name, error.message)
          continue
        }

        if (saved && catId) {
          await supabase.from('event_categories').upsert(
            { event_id: saved.id, category_id: catId },
            { onConflict: 'event_id,category_id', ignoreDuplicates: true }
          )
        }

        total++
      } catch (err) {
        console.error(ev.name, err.message)
      }
    }

    page++
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`Done — ${total} events upserted.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
