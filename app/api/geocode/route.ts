//app/api/geocode/route.ts
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q')

        if (!q) {
            return NextResponse.json([])
        }

        const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`
        )

        const data = await res.json()

        return NextResponse.json(data.features || [])
    } catch (err) {
        console.error(err)
        return NextResponse.json([])
    }
}