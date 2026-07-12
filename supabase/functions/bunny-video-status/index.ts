// Polls Bunny for the encoding status of a video and mirrors it into the `lessons` row.
// Bunny status codes:
//   0=queued, 1=processing, 2=encoding, 3=finished, 4=resolution finished,
//   5=failed, 6=presigned upload, 7=captions generated, 8=title/description generated

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID')!
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY')!
const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (!claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const lessonId = String(body.lessonId ?? '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return json({ error: 'Invalid lessonId' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: lesson } = await admin.from('lessons')
      .select('bunny_video_id, bunny_status').eq('id', lessonId).maybeSingle()
    if (!lesson?.bunny_video_id) return json({ error: 'No bunny video for lesson' }, 404)

    const r = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${lesson.bunny_video_id}`,
      { headers: { AccessKey: BUNNY_API_KEY, accept: 'application/json' } },
    )
    if (!r.ok) return json({ error: 'Bunny fetch failed' }, 502)
    const info = await r.json()
    const status = info.status as number

    let bunny_status: 'uploading' | 'processing' | 'ready' | 'error' = 'processing'
    if (status === 3 || status === 4) bunny_status = 'ready'
    else if (status === 5) bunny_status = 'error'
    else if (status === 6) bunny_status = 'uploading'

    const patch: Record<string, unknown> = { bunny_status }
    if (bunny_status === 'ready') {
      patch.video_url =
        `https://${BUNNY_CDN_HOSTNAME}/${lesson.bunny_video_id}/play_720p.mp4`
    }
    await admin.from('lessons').update(patch).eq('id', lessonId)

    return json({
      status: bunny_status,
      bunnyStatus: status,
      duration: info.length ?? null,
    })
  } catch (e) {
    console.error('bunny-video-status error', e)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
