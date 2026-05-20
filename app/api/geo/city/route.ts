import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let lat: number, lon: number
  try {
    const body = await req.json()
    lat = body.lat
    lon = body.lon
    if (typeof lat !== 'number' || typeof lon !== 'number') throw new Error('invalid')
  } catch {
    return NextResponse.json({ error: 'Expected { lat: number, lon: number }' }, { status: 400 })
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lon}&format=json&accept-language=no`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EventRadar/1.0' },
    })
    if (!res.ok) throw new Error('nominatim error')

    const data = await res.json()
    const city =
      data.address?.city ??
      data.address?.town ??
      data.address?.municipality ??
      data.address?.county ??
      null

    if (!city) {
      return NextResponse.json({ error: 'Could not determine city from coordinates' }, { status: 404 })
    }

    return NextResponse.json({ city })
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
  }
}
