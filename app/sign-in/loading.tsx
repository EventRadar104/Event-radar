export default function Loading() {
  return (
    <div style={{
      minHeight: 'calc(100dvh - 60px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'var(--white)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo */}
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--stone)', marginBottom: 16 }} />
        <div style={{ width: 130, height: 20, borderRadius: 8, background: 'var(--stone)', marginBottom: 8 }} />
        <div style={{ width: 200, height: 14, borderRadius: 6, background: 'var(--stone)', marginBottom: 28 }} />
        {/* Email input */}
        <div style={{ width: '100%', height: 46, borderRadius: 10, background: 'var(--stone)', marginBottom: 12 }} />
        {/* Password input */}
        <div style={{ width: '100%', height: 46, borderRadius: 10, background: 'var(--stone)', marginBottom: 16 }} />
        {/* Submit button */}
        <div style={{ width: '100%', height: 46, borderRadius: 12, background: 'var(--stone)' }} />
      </div>
    </div>
  )
}
