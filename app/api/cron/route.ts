/*
app/api/cron/route.ts
*/
import { expandRadius } from '@/lib/cron'

export async function GET() {
  await expandRadius()
  return Response.json({ ok: true })
}