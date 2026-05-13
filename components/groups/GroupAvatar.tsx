import Image from 'next/image'

export function GroupAvatar({ name, imageUrl, size = 40 }: { name: string; imageUrl: string | null; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--green-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          width={size}
          height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 600, color: 'var(--green)' }}>{initials}</span>
      )}
    </div>
  )
}
