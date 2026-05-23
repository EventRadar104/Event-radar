export default function Loading() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 100px' }}>
      {/* Back button */}
      <div style={{ width: 72, height: 32, borderRadius: 8, background: 'var(--stone)', marginBottom: 20 }} />
      {/* Page title */}
      <div style={{ width: 200, height: 28, borderRadius: 8, background: 'var(--stone)', marginBottom: 28 }} />
      {/* Form fields */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ width: 90, height: 13, borderRadius: 6, background: 'var(--stone)', marginBottom: 6 }} />
          <div style={{ height: 44, borderRadius: 10, background: 'var(--stone)' }} />
        </div>
      ))}
      {/* Textarea field */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ width: 90, height: 13, borderRadius: 6, background: 'var(--stone)', marginBottom: 6 }} />
        <div style={{ height: 100, borderRadius: 10, background: 'var(--stone)' }} />
      </div>
    </div>
  )
}
