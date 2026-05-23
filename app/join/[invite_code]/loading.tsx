export default function Loading() {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px' }}>
      <div style={{
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '40px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Group avatar */}
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--stone)', marginBottom: 20 }} />
        {/* Group name */}
        <div style={{ width: 160, height: 20, borderRadius: 8, background: 'var(--stone)', marginBottom: 10 }} />
        {/* Member count */}
        <div style={{ width: 110, height: 13, borderRadius: 6, background: 'var(--stone)', marginBottom: 28 }} />
        {/* Join button */}
        <div style={{ width: '100%', height: 46, borderRadius: 12, background: 'var(--stone)' }} />
      </div>
    </div>
  )
}
