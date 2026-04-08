export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return Response.json({ error: 'Env vars missing', url: !!url, key: !!key }, { status: 500 })
  }

  // Test 1: enkel fetch til Supabase
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    
    const res = await fetch(`${url}/rest/v1/events?limit=1&select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    
    const data = await res.json()
    return Response.json({ ok: true, status: res.status, rows: Array.isArray(data) ? data.length : null, data })

  } catch (e: unknown) {
    const err = e as Error & { cause?: unknown; code?: string }
    return Response.json({
      ok: false,
      error: err.message,
      cause: String(err.cause ?? 'none'),
      code: err.code ?? 'none',
      name: err.name,
    }, { status: 500 })
  }
}
