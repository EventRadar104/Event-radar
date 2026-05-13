'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid var(--border)', borderRadius: 10,
  fontSize: 14, outline: 'none', background: '#fff',
}

interface Props {
  userId: string
  userDisplayName: string | null
}

export function CreateGroupModal({ userId, userDisplayName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImgPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function resetForm() {
    setName('')
    setImgFile(null)
    setImgPreview(null)
    setError('')
  }

  function handleClose() {
    setOpen(false)
    resetForm()
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a group name'); return }
    setError('')

    startTransition(async () => {
      const supabase = createClient()

      let coverUrl: string | null = null
      if (imgFile) {
        const ext = imgFile.name.split('.').pop()
        const path = `groups/${userId}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('group-images')
          .upload(path, imgFile, { upsert: true, contentType: imgFile.type })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('group-images')
            .getPublicUrl(path)
          coverUrl = publicUrl
        }
      }

      const { data: group, error: insertErr } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          creator_id: userId,
          creator_name: userDisplayName ?? userId,
          cover_image_url: coverUrl,
        })
        .select('id')
        .single()

      if (insertErr || !group) {
        setError('Something went wrong — please try again.')
        return
      }

      await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: userId })

      router.push(`/groups/${group.id}`)
      handleClose()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--green)', color: '#fff', border: 'none',
          borderRadius: 40, padding: '8px 18px', fontSize: 13,
          fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        + New group
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div style={{
            background: 'var(--white)', borderRadius: 20,
            padding: 28, width: '100%', maxWidth: 440,
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20 }}>New group</h2>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)', lineHeight: 1 }}>×</button>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                Group photo <span style={{ fontWeight: 400, color: 'var(--ink3)' }}>(optional)</span>
              </label>
              {!imgPreview ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 12,
                    padding: '20px 16px', textAlign: 'center',
                    cursor: 'pointer', background: 'var(--stone)',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)'; (e.currentTarget as HTMLElement).style.background = 'var(--green-lt)' }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--stone)' }}
                >
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>Upload a cover photo</div>
                  <div style={{ fontSize: 12, color: 'var(--ink3)' }}>JPG, PNG or WEBP · Max 10 MB</div>
                </div>
              ) : (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={imgPreview} alt="Preview" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--stone)', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink2)', flex: 1 }}>{imgFile?.name}</span>
                    <button onClick={() => { setImgFile(null); setImgPreview(null) }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', fontSize: 12, color: '#c0392b', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Group name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Weekend plans with the crew"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--ink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                autoFocus
              />
            </div>

            {error && <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleClose}
                style={{ flex: 1, padding: '11px 0', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 500, background: 'none', cursor: 'pointer', color: 'var(--ink2)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending}
                style={{ flex: 2, padding: '11px 0', background: isPending ? 'var(--border)' : 'var(--green)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: isPending ? 'default' : 'pointer' }}
              >
                {isPending ? 'Creating…' : 'Create group →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
