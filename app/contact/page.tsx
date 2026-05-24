'use client'

import { useState } from 'react'

const SUBJECTS = [
  'General feedback',
  'Bug report',
  'List my event',
  'Press & media',
  'Other',
]

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    fontSize: 15,
    fontFamily: 'var(--font-sans)',
    color: 'var(--ink)',
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--ink2)',
    marginBottom: 6,
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px 80px' }}>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 32,
        fontWeight: 400,
        color: 'var(--ink)',
        marginBottom: 10,
      }}>
        Contact us
      </h1>
      <p style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 36 }}>
        Have feedback, questions, or want to list your event? We&apos;d love to hear from you.
      </p>

      {status === 'success' ? (
        <div style={{
          background: 'var(--green-lt)',
          border: '1px solid #BBD9CC',
          borderRadius: 16,
          padding: '32px 28px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg viewBox="0 0 20 20" fill="none" width={22} height={22}>
              <path d="M4 10l4.5 4.5L16 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            Message sent!
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.55 }}>
            Thanks for reaching out. We&apos;ll get back to you as soon as possible.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Subject</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{ ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 }}
            >
              {SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Message</label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
            />
          </div>

          {status === 'error' && (
            <div style={{
              fontSize: 14, color: '#c0392b',
              background: '#fdf0ef',
              border: '1px solid #f5c6c2',
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              Something went wrong. Please try again or email us at hei@eventradar.no.
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              padding: '13px 0',
              background: 'var(--green)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
              transition: 'opacity .15s',
            }}
          >
            {status === 'loading' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}
    </div>
  )
}
