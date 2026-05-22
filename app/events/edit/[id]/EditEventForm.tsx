'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand', 'Bodø', 'Drammen', 'Other']

interface Category { id: string; name: string; slug: string }
interface Venue { id: string; name: string; city: string; address: string | null }

interface Props {
  event: Record<string, unknown>
  venue: Venue | null
  currentCategoryId: string
  allCategories: Category[]
  userId: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid var(--border)', borderRadius: 10,
  fontSize: 14, fontFamily: 'var(--font-sans)',
  background: 'var(--white)', color: 'var(--ink)',
  outline: 'none',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--ink3)',
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14,
      }}>
        {title}
      </div>
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function toLocalDatetime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditEventForm({ event, venue, currentCategoryId, allCategories, userId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(String(event.title ?? ''))
  const [desc, setDesc] = useState(String(event.description ?? ''))
  const [catId, setCatId] = useState(currentCategoryId)
  const [city, setCity] = useState(venue?.city ?? 'Oslo')
  const [venueName, setVenueName] = useState(venue?.name ?? '')
  const [address, setAddress] = useState(venue?.address ?? '')
  const [startsAt, setStartsAt] = useState(toLocalDatetime(String(event.starts_at ?? '')))
  const [endsAt, setEndsAt] = useState(toLocalDatetime(String(event.ends_at ?? '')))
  const [isFree, setIsFree] = useState(Boolean(event.is_free))
  const [priceFrom, setPriceFrom] = useState(event.price_from != null ? String(event.price_from) : '')
  const [priceTo, setPriceTo] = useState(event.price_to != null ? String(event.price_to) : '')
  const [ticketUrl, setTicketUrl] = useState(String(event.ticket_url ?? ''))
  const [isOnline, setIsOnline] = useState(Boolean(event.is_online))
  const [tags, setTags] = useState(
    Array.isArray(event.tags) ? (event.tags as string[]).join(', ') : ''
  )
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(
    typeof event.cover_image_url === 'string' ? event.cover_image_url : null
  )
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    setRemoveImage(false)
    const reader = new FileReader()
    reader.onload = ev => setImgPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave(publish: boolean) {
    if (!title.trim()) { setError('Event title is required'); return }
    if (!startsAt)     { setError('Start date & time is required'); return }
    setError('')

    startTransition(async () => {
      const supabase = createClient()
      const eventId = String(event.id)

      // 1. Image: upload new, remove, or keep existing
      let coverUrl: string | null | undefined = undefined
      if (removeImage) {
        coverUrl = null
      } else if (imgFile) {
        const ext = imgFile.name.split('.').pop()
        const path = `events/${userId}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('event-images')
          .upload(path, imgFile, { upsert: true, contentType: imgFile.type })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('event-images')
            .getPublicUrl(path)
          coverUrl = publicUrl
        }
      }

      // 2. Venue: find or create
      let venueId: string | null = event.venue_id as string | null
      if (!isOnline && venueName.trim()) {
        const { data: existing } = await supabase
          .from('venues')
          .select('id')
          .eq('name', venueName.trim())
          .eq('city', city)
          .maybeSingle()
        if (existing) {
          venueId = existing.id
        } else {
          const { data: newVenue } = await supabase
            .from('venues')
            .insert({ name: venueName.trim(), city, address: address || null, country: 'NO' })
            .select('id')
            .single()
          venueId = newVenue?.id ?? null
        }
      } else if (isOnline) {
        venueId = null
      }

      // 3. Update event row
      const updatePayload: Record<string, unknown> = {
        title: title.trim(),
        description: desc.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        venue_id: venueId,
        is_online: isOnline,
        is_free: isFree,
        price_from: !isFree && priceFrom ? parseFloat(priceFrom) : null,
        price_to: !isFree && priceTo ? parseFloat(priceTo) : null,
        ticket_url: !isFree && ticketUrl ? ticketUrl.trim() : null,
        status: publish ? 'published' : 'draft',
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        updated_at: new Date().toISOString(),
      }
      if (coverUrl !== undefined) updatePayload.cover_image_url = coverUrl

      const { error: updateErr } = await supabase
        .from('events')
        .update(updatePayload)
        .eq('id', eventId)

      if (updateErr) {
        setError(updateErr.message ?? 'Failed to save. Please try again.')
        return
      }

      // 4. Replace event category
      await supabase.from('event_categories').delete().eq('event_id', eventId)
      if (catId) {
        await supabase.from('event_categories').insert({ event_id: eventId, category_id: catId })
      }

      setSuccess(true)
      setTimeout(() => router.push('/profile'), 1200)
    })
  }

  return (
    <div>
      {/* ── Image ─────────────────────────────────────── */}
      <div id="image">
        <Section title="Event photo">
          <div>
            {imgPreview && !removeImage ? (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgPreview}
                  alt="Preview"
                  style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--stone)',
                  borderTop: '1px solid var(--border)', gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--ink2)', flex: 1 }}>
                    {imgFile ? imgFile.name : 'Current image'}
                  </span>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    Change
                  </button>
                  <button
                    onClick={() => { setImgPreview(null); setImgFile(null); setRemoveImage(true) }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#c0392b', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 12,
                  padding: 32, textAlign: 'center', cursor: 'pointer',
                  background: 'var(--stone)',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  Drop your photo here, or click to browse
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)' }}>JPG, PNG or WEBP · Max 10MB</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        </Section>
      </div>

      {/* ── Details ───────────────────────────────────── */}
      <Section title="Details">
        <Field label="Event title *">
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Category">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {allCategories.map(c => (
              <button
                key={c.id}
                onClick={() => setCatId(catId === c.id ? '' : c.id)}
                style={{
                  padding: 10, borderRadius: 10,
                  border: `1.5px solid ${catId === c.id ? 'var(--green)' : 'var(--border)'}`,
                  background: catId === c.id ? 'var(--green-lt)' : '#fff',
                  color: catId === c.id ? 'var(--green)' : 'var(--ink2)',
                  cursor: 'pointer', fontSize: 13, transition: 'all .15s',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {c.name.replace(/\p{Extended_Pictographic}\s*/gu, '').split('&')[0].trim()}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Description">
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
          />
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="e.g. live-music, all-ages"
            style={inputStyle}
          />
        </Field>
      </Section>

      {/* ── Location & time ───────────────────────────── */}
      <Section title="Location & time">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['In-person', 'Online'] as const).map(type => (
            <button
              key={type}
              onClick={() => setIsOnline(type === 'Online')}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                border: `1.5px solid ${(type === 'Online') === isOnline ? 'var(--green)' : 'var(--border)'}`,
                background: (type === 'Online') === isOnline ? 'var(--green-lt)' : 'none',
                color: (type === 'Online') === isOnline ? 'var(--green)' : 'var(--ink2)',
                cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)',
              }}
            >
              {type === 'In-person' ? '📍 In-person' : '💻 Online'}
            </button>
          ))}
        </div>

        {!isOnline && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="City">
                <select value={city} onChange={e => setCity(e.target.value)} style={inputStyle}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Venue">
                <input
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  placeholder="e.g. Sentrum Scene"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Address">
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Street address"
                style={inputStyle}
              />
            </Field>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Starts *">
            <input
              type="datetime-local"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Ends">
            <input
              type="datetime-local"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>
      </Section>

      {/* ── Pricing ───────────────────────────────────── */}
      <Section title="Pricing">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['Free', 'Paid'] as const).map(type => (
            <button
              key={type}
              onClick={() => setIsFree(type === 'Free')}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                border: `1.5px solid ${(type === 'Free') === isFree ? 'var(--green)' : 'var(--border)'}`,
                background: (type === 'Free') === isFree ? 'var(--green-lt)' : 'none',
                color: (type === 'Free') === isFree ? 'var(--green)' : 'var(--ink2)',
                cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-sans)',
              }}
            >
              {type === 'Free' ? '🎟 Free' : '💳 Paid'}
            </button>
          ))}
        </div>

        {!isFree && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Price from (kr)">
                <input
                  type="number" min="0"
                  value={priceFrom}
                  onChange={e => setPriceFrom(e.target.value)}
                  placeholder="299"
                  style={inputStyle}
                />
              </Field>
              <Field label="Price to (kr)">
                <input
                  type="number" min="0"
                  value={priceTo}
                  onChange={e => setPriceTo(e.target.value)}
                  placeholder="499"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Ticket link">
              <input
                type="url"
                value={ticketUrl}
                onChange={e => setTicketUrl(e.target.value)}
                placeholder="https://ticketmaster.no/…"
                style={inputStyle}
              />
            </Field>
          </>
        )}
      </Section>

      {/* ── Feedback ──────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#FEE2E2', color: '#DC2626',
          borderRadius: 10, padding: '12px 16px',
          fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          background: 'var(--green-lt)', color: 'var(--green)',
          borderRadius: 10, padding: '12px 16px',
          fontSize: 13, marginBottom: 16,
        }}>
          Saved! Redirecting to profile…
        </div>
      )}

      {/* ── Actions ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => handleSave(true)}
          disabled={isPending}
          style={{
            flex: 1, padding: '13px 0',
            background: 'var(--green)', color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', opacity: isPending ? .6 : 1,
          }}
        >
          {isPending ? 'Saving…' : 'Save & publish'}
        </button>
        <button
          onClick={() => handleSave(false)}
          disabled={isPending}
          style={{
            flex: 1, padding: '13px 0',
            background: 'var(--stone)', color: 'var(--ink)',
            border: '1px solid var(--border)', borderRadius: 12,
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', opacity: isPending ? .6 : 1,
          }}
        >
          Save as draft
        </button>
      </div>
    </div>
  )
}
