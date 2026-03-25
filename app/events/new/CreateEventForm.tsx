'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Tromsø', 'Kristiansand', 'Bodø', 'Drammen', 'Other']

interface Category { id: string; name: string; slug: string; icon: string | null }

interface Props {
  userId: string
  categories: Category[]
}

export function CreateEventForm({ userId, categories }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [catId, setCatId]       = useState('')
  const [city, setCity]         = useState('Oslo')
  const [venue, setVenue]       = useState('')
  const [address, setAddress]   = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt]     = useState('')
  const [isFree, setIsFree]     = useState(true)
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo]   = useState('')
  const [ticketUrl, setTicketUrl] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [tags, setTags]         = useState('')
  const [imgFile, setImgFile]   = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [error, setError]       = useState('')
  const [step, setStep]         = useState(1)  // 1=Details, 2=Location, 3=Pricing

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImgPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(publish: boolean) {
    if (!title.trim()) { setError('Event title is required'); return }
    if (!startsAt)     { setError('Start date & time is required'); return }
    setError('')

    startTransition(async () => {
      const supabase = createClient()

      // 1. Upload image if provided
      let coverUrl: string | null = null
      if (imgFile) {
        const ext  = imgFile.name.split('.').pop()
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

      // 2. Find or create venue
      let venueId: string | null = null
      if (venue.trim() && !isOnline) {
        const { data: existingVenue } = await supabase
          .from('venues')
          .select('id')
          .eq('name', venue.trim())
          .eq('city', city)
          .maybeSingle()

        if (existingVenue) {
          venueId = existingVenue.id
        } else {
          const { data: newVenue } = await supabase
            .from('venues')
            .insert({ name: venue.trim(), city, address: address || null, country: 'NO' })
            .select('id')
            .single()
          venueId = newVenue?.id ?? null
        }
      }

      // 3. Slugify title
      const slug = title.trim()
        .toLowerCase()
        .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'oe').replace(/[å]/g, 'aa')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36)

      // 4. Insert event
      const { data: event, error: insertErr } = await supabase
        .from('events')
        .insert({
          organizer_id:    userId,
          title:           title.trim(),
          slug,
          description:     desc.trim() || null,
          cover_image_url: coverUrl,
          starts_at:       new Date(startsAt).toISOString(),
          ends_at:         endsAt ? new Date(endsAt).toISOString() : null,
          venue_id:        venueId,
          is_online:       isOnline,
          is_free:         isFree,
          price_from:      !isFree && priceFrom ? parseFloat(priceFrom) : null,
          price_to:        !isFree && priceTo   ? parseFloat(priceTo)   : null,
          ticket_url:      !isFree && ticketUrl ? ticketUrl.trim()       : null,
          status:          publish ? 'published' : 'draft',
          source:          'manual',
          tags:            tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        })
        .select('id, slug')
        .single()

      if (insertErr || !event) {
        setError(insertErr?.message ?? 'Failed to create event. Please try again.')
        return
      }

      // 5. Attach category
      if (catId) {
        await supabase.from('event_categories').insert({
          event_id: event.id,
          category_id: catId,
        })
      }

      // 6. Navigate
      router.push(publish ? `/events/${event.slug}` : '/dashboard?tab=events')
    })
  }

  const steps = ['Details', 'Location', 'Pricing', 'Review']

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display:'flex', alignItems:'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color: i + 1 < step ? 'var(--green)' : i + 1 === step ? 'var(--ink)' : 'var(--ink4)', fontWeight: i + 1 === step ? 500 : 400 }}>
              <div style={{
                width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0,
                background: i + 1 < step ? 'var(--green)' : i + 1 === step ? 'var(--ink)' : 'var(--border)',
                color: i + 1 <= step ? '#fff' : 'var(--ink4)',
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              {s}
            </div>
            {i < steps.length - 1 && <div style={{ flex:1, height:1, background:'var(--border)', margin:'0 10px' }} />}
          </div>
        ))}
      </div>

      {/* Step 1 — Details */}
      {step === 1 && (
        <>
          {/* Photo */}
          <Section title="Event photo">
            <p style={{ fontSize:13, color:'var(--ink3)', marginBottom:16 }}>A clear, high-quality image makes a big difference.</p>
            {!imgPreview ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border:'2px dashed var(--border)', borderRadius:12, padding:32, textAlign:'center', cursor:'pointer', background:'var(--stone)', transition:'all .2s' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--green)'; (e.currentTarget as HTMLElement).style.background='var(--green-lt)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.background='var(--stone)' }}
              >
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
                <div style={{ fontSize:32, marginBottom:10 }}>📷</div>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Drop your photo here, or click to browse</div>
                <div style={{ fontSize:12, color:'var(--ink3)' }}>JPG, PNG or WEBP · Max 10MB · Min 1200×675px recommended</div>
              </div>
            ) : (
              <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
                <img src={imgPreview} alt="Preview" style={{ width:'100%', height:220, objectFit:'cover', display:'block' }} />
                <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', background:'var(--stone)', borderTop:'1px solid var(--border)' }}>
                  <span style={{ fontSize:12, color:'var(--ink2)', flex:1 }}>{imgFile?.name}</span>
                  <button onClick={() => { setImgFile(null); setImgPreview(null) }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#c0392b', cursor:'pointer' }}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Details */}
          <Section title="Event details">
            <Field label="Event title *">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Jazz Night at Blå, Oslo" style={inputStyle} />
            </Field>
            <Field label="Category">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCatId(catId === c.id ? '' : c.id)}
                    style={{ padding:10, borderRadius:10, border:`1.5px solid ${catId === c.id ? 'var(--green)' : 'var(--border)'}`, background: catId === c.id ? 'var(--green-lt)' : '#fff', color: catId === c.id ? 'var(--green)' : 'var(--ink2)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, transition:'all .15s' }}>
                    {c.icon} {c.name.split('&')[0].trim()}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Description">
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Tell people what to expect — vibe, lineup, dress code, age limits…" style={{ ...inputStyle, minHeight:100, resize:'vertical' }} />
            </Field>
            <Field label="Tags (comma-separated)">
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. live-music, all-ages, outdoor" style={inputStyle} />
            </Field>
          </Section>
        </>
      )}

      {/* Step 2 — Location */}
      {step === 2 && (
        <Section title="Location & time">
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <TypeButton label="📍 In-person" active={!isOnline} onClick={() => setIsOnline(false)} />
            <TypeButton label="💻 Online"    active={isOnline}  onClick={() => setIsOnline(true)} />
          </div>
          {!isOnline && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <Field label="City *">
                  <select value={city} onChange={e => setCity(e.target.value)} style={inputStyle}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Venue">
                  <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Sentrum Scene" style={inputStyle} />
                </Field>
              </div>
              <Field label="Address">
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Youngstorget 6, Oslo" style={inputStyle} />
                <span style={{ fontSize:11, color:'var(--ink3)' }}>Used to generate a Google Maps link on your event page</span>
              </Field>
            </>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Field label="Start *">
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="End">
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </Section>
      )}

      {/* Step 3 — Pricing */}
      {step === 3 && (
        <Section title="Tickets & pricing">
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <TypeButton label="🆓 Free event" active={isFree}  onClick={() => setIsFree(true)} />
            <TypeButton label="🎟 Paid event" active={!isFree} onClick={() => setIsFree(false)} />
          </div>
          {!isFree && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <Field label="Price from (kr)">
                  <input type="number" value={priceFrom} onChange={e => setPriceFrom(e.target.value)} placeholder="150" style={inputStyle} />
                </Field>
                <Field label="Price to (kr)">
                  <input type="number" value={priceTo} onChange={e => setPriceTo(e.target.value)} placeholder="500" style={inputStyle} />
                </Field>
              </div>
              <Field label="Ticket link">
                <input type="url" value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="https://ticketmaster.no/…" style={inputStyle} />
                <span style={{ fontSize:11, color:'var(--ink3)' }}>Where people buy tickets. Revenue is managed by your provider, not Event Radar.</span>
              </Field>
            </>
          )}
        </Section>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <Section title="Review & publish">
          <ReviewRow label="Title"    value={title || '—'} />
          <ReviewRow label="Date"     value={startsAt ? new Date(startsAt).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : '—'} />
          <ReviewRow label="Location" value={isOnline ? 'Online' : [venue, city].filter(Boolean).join(', ') || '—'} />
          <ReviewRow label="Price"    value={isFree ? 'Free' : [priceFrom && `from ${priceFrom} kr`, priceTo && `to ${priceTo} kr`].filter(Boolean).join(' ')} />
          {imgPreview && (
            <div style={{ marginTop:14 }}>
              <img src={imgPreview} alt="Cover" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:10 }} />
            </div>
          )}
        </Section>
      )}

      {error && <p style={{ fontSize:13, color:'#c0392b', marginBottom:16 }}>{error}</p>}

      {/* Action bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:20, background:'var(--white)', border:'1px solid var(--border)', borderRadius:12 }}>
        <span style={{ fontSize:13, color:'var(--ink3)' }}>
          Step {step} of 4 ·{' '}
          <button onClick={() => handleSubmit(false)} disabled={isPending} style={{ background:'none', border:'none', color:'var(--green)', cursor:'pointer', fontSize:13, fontWeight:500, padding:0 }}>
            Save as draft
          </button>
        </span>
        <div style={{ display:'flex', gap:10 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ padding:'11px 20px', border:'1.5px solid var(--border)', borderRadius:12, fontSize:14, fontWeight:500, background:'none', cursor:'pointer', color:'var(--ink2)' }}>
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} style={{ padding:'11px 24px', background:'var(--green)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:500, cursor:'pointer' }}>
              Continue →
            </button>
          ) : (
            <button onClick={() => handleSubmit(true)} disabled={isPending} style={{ padding:'11px 24px', background: isPending ? 'var(--border)' : 'var(--green)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:500, cursor: isPending ? 'default' : 'pointer' }}>
              {isPending ? 'Publishing…' : 'Publish event →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid var(--border)', borderRadius: 10,
  fontSize: 14, outline: 'none', background: '#fff',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, padding:24, marginBottom:20 }}>
      <h2 style={{ fontSize:18, marginBottom:20 }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}

function TypeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ flex:1, padding:10, borderRadius:10, border:`1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`, background: active ? 'var(--green-lt)' : '#fff', color: active ? 'var(--green)' : 'var(--ink2)', cursor:'pointer', fontSize:13, fontWeight:500, transition:'all .15s' }}>
      {label}
    </button>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border2)', fontSize:14 }}>
      <span style={{ color:'var(--ink3)', fontWeight:500 }}>{label}</span>
      <span style={{ color:'var(--ink)', textAlign:'right', maxWidth:'60%' }}>{value}</span>
    </div>
  )
}
