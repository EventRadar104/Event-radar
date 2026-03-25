import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateEventForm } from './CreateEventForm'

export const metadata = {
  title: 'Post an event — Event Radar',
}

export default async function CreateEventPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?redirect=/events/new')

  // Ensure user has organizer role
  await supabase
    .from('profiles')
    .update({ role: 'organizer' })
    .eq('id', user.id)
    .eq('role', 'attendee') // only update if still attendee

  // Load categories for the form
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .order('name')

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 100px' }}>
      <a href="/dashboard" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'var(--ink3)', marginBottom:32, textDecoration:'none' }}>
        ← Back to dashboard
      </a>
      <h1 style={{ fontSize:32, marginBottom:6 }}>Post an event</h1>
      <p style={{ fontSize:14, color:'var(--ink3)', marginBottom:32 }}>Free to post on Event Radar 🇳🇴</p>

      <CreateEventForm
        userId={user.id}
        categories={categories ?? []}
      />
    </div>
  )
}
