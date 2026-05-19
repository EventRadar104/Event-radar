'use client'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const MapContent = dynamic(() => import('./MapContent'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 'calc(100vh - 60px)', background: 'var(--stone)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '3px solid var(--border)', borderTopColor: 'var(--green)',
        animation: 'spin .8s linear infinite',
      }} />
    </div>
  ),
})

export default function MapPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 'calc(100vh - 60px)', background: 'var(--stone)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '3px solid var(--border)', borderTopColor: 'var(--green)',
        }} />
      </div>
    }>
      <MapContent />
    </Suspense>
  )
}
