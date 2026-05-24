'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useT } from './i18n'
import { getAnalyticsConsent, getMarketingConsent, savePreferences } from '@/lib/consent'
import type { Lang } from './i18n'

interface Props {
  userId: string
  savedDisplayName: string | null
  savedAvatarUrl: string | null
  userEmail: string
  isPublisher: boolean
  isBecomingOrganizer: boolean
  language: Lang
  onLanguageChange: (lang: Lang) => void
  onBecomeOrganizer: () => Promise<void>
  onSignOut: () => void
  onProfileSaved: (updates: { displayName?: string | null; avatarUrl?: string }) => void
}

export function ConsumerView({
  userId,
  savedDisplayName,
  savedAvatarUrl,
  userEmail,
  isPublisher,
  isBecomingOrganizer,
  language,
  onLanguageChange,
  onBecomeOrganizer,
  onSignOut,
  onProfileSaved,
}: Props) {
  const t = useT(language)

  // Account editing
  const [currentSavedName, setCurrentSavedName] = useState(savedDisplayName)
  const [currentSavedAvatarUrl, setCurrentSavedAvatarUrl] = useState(savedAvatarUrl)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(savedDisplayName ?? '')
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Settings sheets
  const [activeSheet, setActiveSheet] = useState<'notifications' | 'language' | 'privacy' | null>(null)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(false)
  // Consent state — initialised from localStorage after mount
  const [analyticsConsent, setAnalyticsConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)

  useEffect(() => {
    setAnalyticsConsent(getAnalyticsConsent())
    setMarketingConsent(getMarketingConsent())
  }, [])

  const displayAvatarUrl = previewAvatarUrl ?? currentSavedAvatarUrl
  const initials = (currentSavedName ?? userEmail).slice(0, 1).toUpperCase()
  const nameChanged = editingName && nameInput !== (currentSavedName ?? '')
  const hasPendingChanges = pendingAvatarFile !== null || nameChanged

  function handleAvatarClick() {
    fileRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPreviewAvatarUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function startEditName() {
    setNameInput(currentSavedName ?? '')
    setEditingName(true)
    setSaveError('')
  }

  function cancelEditName() {
    setEditingName(false)
    setNameInput(currentSavedName ?? '')
  }

  async function handleSave() {
    if (isSaving) return
    setIsSaving(true)
    setSaveError('')

    const supabase = createClient()
    const dbUpdates: Record<string, unknown> = {}
    const uiUpdates: { displayName?: string | null; avatarUrl?: string } = {}

    if (pendingAvatarFile) {
      const ext = pendingAvatarFile.name.split('.').pop()
      const path = `profiles/${userId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('event-images')
        .upload(path, pendingAvatarFile, { upsert: true, contentType: pendingAvatarFile.type })

      if (uploadErr) {
        setSaveError(t.errorUpload)
        setIsSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(path)
      dbUpdates.avatar_url = publicUrl
      uiUpdates.avatarUrl = publicUrl
    }

    if (nameChanged) {
      const trimmed = nameInput.trim() || null
      dbUpdates.display_name = trimmed
      uiUpdates.displayName = trimmed
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId)
      if (error) {
        setSaveError(t.errorSave)
        setIsSaving(false)
        return
      }
    }

    if (uiUpdates.avatarUrl) {
      setCurrentSavedAvatarUrl(uiUpdates.avatarUrl)
      setPreviewAvatarUrl(null)
    }
    if ('displayName' in uiUpdates) {
      setCurrentSavedName(uiUpdates.displayName ?? null)
    }
    onProfileSaved(uiUpdates)

    setPendingAvatarFile(null)
    setEditingName(false)
    setIsSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 1. Account info card ────────────────────────────── */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '24px 20px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <button
            onClick={handleAvatarClick}
            aria-label={t.changePhoto}
            style={{
              position: 'relative', width: 84, height: 84,
              borderRadius: '50%', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            }}
          >
            {displayAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayAvatarUrl}
                alt="Profile"
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: 84, height: 84, borderRadius: '50%',
                background: 'var(--green-lt)', border: '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 600, color: 'var(--green)',
              }}>
                {initials}
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--white)',
            }}>
              <i className="ti ti-camera" style={{ fontSize: 13, color: '#fff', lineHeight: 1 }} />
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Display name */}
          {editingName ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                autoFocus
                placeholder={t.yourName}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEditName() }}
                style={{
                  width: '100%', maxWidth: 280,
                  padding: '9px 14px', textAlign: 'center',
                  border: '1.5px solid var(--green)', borderRadius: 10,
                  fontSize: 16, fontFamily: 'var(--font-serif)',
                  outline: 'none', background: 'var(--white)',
                }}
              />
              <button
                onClick={cancelEditName}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--ink3)', fontFamily: 'var(--font-sans)',
                }}
              >
                {t.cancel}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 18, fontWeight: 600, color: 'var(--ink)',
                fontFamily: 'var(--font-serif)',
              }}>
                {currentSavedName ?? userEmail.split('@')[0]}
              </span>
              <button
                onClick={startEditName}
                aria-label="Edit name"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 4, color: 'var(--ink3)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <i className="ti ti-pencil" style={{ fontSize: 15 }} />
              </button>
            </div>
          )}

          <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: -6 }}>{userEmail}</div>

          {saveError && (
            <div style={{
              background: '#FEE2E2', color: '#DC2626',
              padding: '9px 14px', borderRadius: 8,
              fontSize: 13, width: '100%', textAlign: 'center',
            }}>
              {saveError}
            </div>
          )}

          {hasPendingChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '10px 28px',
                background: 'var(--green)', color: '#fff',
                border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                opacity: isSaving ? .6 : 1,
                transition: 'opacity .15s',
              }}
            >
              {isSaving ? t.saving : t.saveChanges}
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Settings section ─────────────────────────────── */}
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <SettingsRow
          icon="ti-mail"
          label="Contact us"
          href="/contact"
        />
        <SettingsRow
          icon="ti-bell"
          label={t.notifications}
          onClick={() => setActiveSheet('notifications')}
        />
        <SettingsRow
          icon="ti-language"
          label={t.language}
          value={t.languageValue}
          onClick={() => setActiveSheet('language')}
        />
        <SettingsRow
          icon="ti-shield"
          label={t.privacy}
          onClick={() => setActiveSheet('privacy')}
          isLast
        />
      </div>

      {/* ── 3. Become an organizer ──────────────────────────── */}
      {!isPublisher && (
        <div style={{
          background: 'var(--green-lt)',
          border: '1px solid #BBD9CC',
          borderRadius: 16, padding: '20px 20px',
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="ti ti-calendar-plus" style={{ fontSize: 22, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>
                {t.ctaHeading}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.55 }}>
                {t.ctaBody}
              </div>
            </div>
          </div>
          <button
            onClick={onBecomeOrganizer}
            disabled={isBecomingOrganizer}
            style={{
              width: '100%', padding: '12px 0',
              background: 'var(--green)', color: '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 500,
              cursor: isBecomingOrganizer ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: isBecomingOrganizer ? .65 : 1,
              transition: 'opacity .15s',
            }}
          >
            {isBecomingOrganizer ? t.ctaButtonBusy : t.ctaButton}
          </button>
        </div>
      )}

      {/* ── 4. Sign out ─────────────────────────────────────── */}
      <button
        onClick={onSignOut}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '14px 16px',
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 14, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          textAlign: 'left',
        }}
      >
        <i className="ti ti-logout" style={{ fontSize: 18, color: '#DC2626' }} />
        <span style={{ fontSize: 15, fontWeight: 500, color: '#DC2626' }}>{t.signOut}</span>
      </button>

      {/* ── Bottom sheets ───────────────────────────────────── */}
      {activeSheet !== null && (
        <>
          <div
            onClick={() => setActiveSheet(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,.4)',
            }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 510,
              background: 'var(--white)',
              borderRadius: '20px 20px 0 0',
              padding: '8px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -4px 32px rgba(0,0,0,.12)',
            }}
          >
            <div style={{
              width: 36, height: 4, background: 'var(--border)',
              borderRadius: 2, margin: '10px auto 22px',
            }} />

            {activeSheet === 'notifications' && (
              <NotificationsSheet
                t={t}
                emailNotifs={emailNotifs}
                pushNotifs={pushNotifs}
                onEmailToggle={() => setEmailNotifs(v => !v)}
                onPushToggle={() => setPushNotifs(v => !v)}
                onClose={() => setActiveSheet(null)}
              />
            )}
            {activeSheet === 'language' && (
              <LanguageSheet
                t={t}
                language={language}
                onSelect={lang => { onLanguageChange(lang); setActiveSheet(null) }}
                onClose={() => setActiveSheet(null)}
              />
            )}
            {activeSheet === 'privacy' && (
              <PrivacySheet
                t={t}
                userId={userId}
                analytics={analyticsConsent}
                marketing={marketingConsent}
                onAnalyticsChange={setAnalyticsConsent}
                onMarketingChange={setMarketingConsent}
                onClose={() => setActiveSheet(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  value,
  onClick,
  href,
  isLast,
}: {
  icon: string
  label: string
  value?: string
  onClick?: () => void
  href?: string
  isLast?: boolean
}) {
  const inner = (
    <>
      <i className={`ti ${icon}`} style={{ fontSize: 18, color: 'var(--ink3)', width: 22, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 15, color: 'var(--ink)' }}>{label}</span>
      {value && <span style={{ fontSize: 13, color: 'var(--ink3)', marginRight: 6 }}>{value}</span>}
      <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--ink4)' }} />
    </>
  )

  const sharedStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px',
    borderBottom: isLast ? 'none' : '1px solid var(--border2)',
    textDecoration: 'none',
    width: '100%', background: 'none',
    cursor: 'pointer', fontFamily: 'var(--font-sans)',
  }

  if (href) {
    return (
      <Link href={href} style={sharedStyle}>
        {inner}
      </Link>
    )
  }
  return (
    <button onClick={onClick} style={sharedStyle}>
      {inner}
    </button>
  )
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: enabled ? 'var(--green)' : 'var(--border)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background .2s', flexShrink: 0, padding: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: enabled ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </button>
  )
}

type T = ReturnType<typeof useT>

function NotificationsSheet({
  t,
  emailNotifs,
  pushNotifs,
  onEmailToggle,
  onPushToggle,
  onClose,
}: {
  t: T
  emailNotifs: boolean
  pushNotifs: boolean
  onEmailToggle: () => void
  onPushToggle: () => void
  onClose: () => void
}) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{t.notificationsTitle}</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border2)', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{t.emailNotifs}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{t.emailNotifsDesc}</div>
        </div>
        <ToggleSwitch enabled={emailNotifs} onToggle={onEmailToggle} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{t.pushNotifs}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{t.pushNotifsDesc}</div>
        </div>
        <ToggleSwitch enabled={pushNotifs} onToggle={onPushToggle} />
      </div>

      <button
        onClick={onClose}
        style={{
          width: '100%', padding: '13px 0',
          background: 'var(--stone)', border: '1px solid var(--border)',
          borderRadius: 12, fontSize: 15, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {t.done}
      </button>
    </div>
  )
}

function LanguageSheet({
  t,
  language,
  onSelect,
  onClose,
}: {
  t: T
  language: Lang
  onSelect: (lang: Lang) => void
  onClose: () => void
}) {
  const options: { value: Lang; label: string; sub: string }[] = [
    { value: 'en', label: t.langEnLabel, sub: t.langEnSub },
    { value: 'no', label: t.langNoLabel, sub: t.langNoSub },
  ]

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{t.languageTitle}</div>

      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '14px 0',
            background: 'none', border: 'none',
            borderBottom: i < options.length - 1 ? '1px solid var(--border2)' : 'none',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            marginBottom: i < options.length - 1 ? 0 : 12,
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: language === opt.value ? 500 : 400 }}>
              {opt.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{opt.sub}</div>
          </div>
          {language === opt.value && (
            <i className="ti ti-check" style={{ fontSize: 18, color: 'var(--green)' }} />
          )}
        </button>
      ))}

      <button
        onClick={onClose}
        style={{
          width: '100%', padding: '13px 0',
          background: 'var(--stone)', border: '1px solid var(--border)',
          borderRadius: 12, fontSize: 15, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {t.cancel}
      </button>
    </div>
  )
}

function PrivacySheet({
  t,
  userId,
  analytics,
  marketing,
  onAnalyticsChange,
  onMarketingChange,
  onClose,
}: {
  t: T
  userId: string
  analytics: boolean
  marketing: boolean
  onAnalyticsChange: (v: boolean) => void
  onMarketingChange: (v: boolean) => void
  onClose: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    setIsSaving(true)
    savePreferences(analytics, marketing)
    const consentValue = analytics || marketing ? 'accepted' : 'declined'
    const supabase = createClient()
    await supabase.from('profiles').update({ cookie_consent: consentValue }).eq('id', userId)
    setIsSaving(false)
    onClose()
  }

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{t.privacyTitle}</div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 16, borderBottom: '1px solid var(--border2)', marginBottom: 16,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{t.analyticsCookies}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{t.analyticsCookiesDesc}</div>
        </div>
        <ToggleSwitch enabled={analytics} onToggle={() => onAnalyticsChange(!analytics)} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{t.marketingCookies}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>{t.marketingCookiesDesc}</div>
        </div>
        <ToggleSwitch enabled={marketing} onToggle={() => onMarketingChange(!marketing)} />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        style={{
          width: '100%', padding: '13px 0',
          background: 'var(--green)', color: '#fff',
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          opacity: isSaving ? .6 : 1,
          marginBottom: 16,
        }}
      >
        {isSaving ? t.savingPreferences : t.savePreferences}
      </button>

      <div style={{ textAlign: 'center' }}>
        <Link
          href="/privacy"
          onClick={onClose}
          style={{ fontSize: 13, color: 'var(--green)', textDecoration: 'underline' }}
        >
          {t.readPrivacyPolicy}
        </Link>
      </div>
    </div>
  )
}
