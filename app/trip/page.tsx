'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Tromsø', 'Stavanger', 'Kristiansand']

const WHEN_OPTIONS = [
  { value: 'weekend', label: 'This weekend' },
  { value: 'week',    label: 'This week'    },
  { value: 'date',    label: 'Pick date'    },
]

const CATEGORIES = [
  { value: 'music',   label: 'Music'       },
  { value: 'sports',  label: 'Sports'      },
  { value: 'food',    label: 'Food & Drink'},
  { value: 'arts',    label: 'Arts'        },
  { value: 'outdoor', label: 'Outdoor'     },
  { value: 'comedy',  label: 'Comedy'      },
  { value: 'culture', label: 'Culture'     },
]

export default function TripPage() {
  const router = useRouter()
  const [selectedCity,     setSelectedCity]     = useState<string | null>(null)
  const [selectedWhen,     setSelectedWhen]     = useState<string | null>(null)
  const [pickDate,         setPickDate]         = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  function handleBrowseMap() {
    const params = new URLSearchParams()
    if (selectedCity)                         params.set('city',     selectedCity)
    if (selectedWhen)                         params.set('when',     selectedWhen)
    if (selectedWhen === 'date' && pickDate)  params.set('date',     pickDate)
    if (selectedCategory)                     params.set('category', selectedCategory)
    const qs = params.toString()
    router.push(`/map${qs ? '?' + qs : ''}`)
  }

  return (
    <>
      <style>{`
        .trip-city-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        @media (min-width: 641px) {
          .trip-city-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <div style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '28px 20px 32px',
        minHeight: 'calc(100vh - 60px)',
        background: 'var(--bg)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: 6 }}>
            Plan a trip
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.5 }}>
            Browse events across Norway. Build your trip around them.
          </p>
        </div>

        {/* City filter */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            City
          </div>
          <div className="trip-city-grid">
            {CITIES.map(city => {
              const active = selectedCity === city
              return (
                <button
                  key={city}
                  onClick={() => setSelectedCity(prev => prev === city ? null : city)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: active ? 'var(--green)' : 'var(--border)',
                    background: active ? 'var(--green-lt)' : 'var(--white)',
                    color: active ? 'var(--green)' : 'var(--ink)',
                    textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  {city}
                </button>
              )
            })}
          </div>
        </div>

        {/* When filter */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            When
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WHEN_OPTIONS.map(opt => {
              const active = selectedWhen === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedWhen(prev => prev === opt.value ? null : opt.value)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: active ? 'var(--green)' : 'var(--border)',
                    background: active ? 'var(--green-lt)' : 'var(--white)',
                    color: active ? 'var(--green)' : 'var(--ink)',
                    transition: 'all .15s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {selectedWhen === 'date' && (
            <input
              type="date"
              value={pickDate}
              onChange={e => setPickDate(e.target.value)}
              style={{
                marginTop: 12,
                padding: '9px 14px',
                borderRadius: 10,
                border: '1.5px solid var(--border)',
                fontSize: 14,
                background: 'var(--white)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          )}
        </div>

        {/* Category filter */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Category
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat.value
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(prev => prev === cat.value ? null : cat.value)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: active ? 'var(--green)' : 'var(--border)',
                    background: active ? 'var(--green-lt)' : 'var(--white)',
                    color: active ? 'var(--green)' : 'var(--ink)',
                    transition: 'all .15s',
                  }}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Browse map button */}
        <button
          onClick={handleBrowseMap}
          style={{
            width: '100%',
            padding: '16px',
            background: 'var(--green)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '.01em',
          }}
        >
          Browse map →
        </button>
      </div>
    </>
  )
}
