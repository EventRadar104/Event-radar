export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const result: Record<string, unknown> = {
    url: url ? url.slice(0, 40) + '...' : 'MISSING',
    keySet: !!key,
    keyLength: key ? key.length : 0,
  }

  if (!url || !key) {
    return Response.json({ error: 'Env vars missing', ...result }, { status: 500 })
  }

  try {
    const res = await fetch(`${url}/rest/v1/events?limit=1&select=id`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })
    const data = await res.json()
    return Response.json({
      ...result,
      supabaseStatus: res.status,
      supabaseOk: res.ok,
      rowsReturned: Array.isArray(data) ? data.length : null,
      data,
    })
  } catch (e) {
    return Response.json({
      ...result,
      supabaseStatus: 'fetch_failed',
      error: String(e),
    }, { status: 500 })
  }
}
