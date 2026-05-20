import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city')?.trim()
  if (!city) {
    return NextResponse.json({ error: 'Expected ?city= param' }, { status: 400 })
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(city)}&countrycodes=no&format=json&limit=1&addressdetails=0`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EventRadar/1.0' },
      next: { revalidate: 86400 },
    } as any)
    if (!res.ok) throw new Error('nominatim error')

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 })
    }

    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    })
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
  }
}
