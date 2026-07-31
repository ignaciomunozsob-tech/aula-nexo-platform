// Manages the single recording video attached to an online event.
// Actions:
//   create -> creates a Bunny Stream video + returns TUS upload config
//   status -> mirrors Bunny encoding status into events.recording_status
//   remove -> clears the recording from the event
// Only the event creator (or an admin) can call it.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUNNY_LIBRARY_ID = (Deno.env.get('BUNNY_LIBRARY_ID') ?? '').trim()
const BUNNY_API_KEY = (Deno.env.get('BUNNY_API_KEY') ?? '').trim()
const BUNNY_CDN_HOSTNAME = (Deno.env.get('BUNNY_CDN_HOSTNAME') ?? '').trim()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!BUNNY_LIBRARY_ID || !BUNNY_API_KEY) {
      return json({ error: 'Video hosting no configurado' }, 200)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    const userId = userData?.user?.id
    if (userErr || !userId) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? 'create')
    const eventId = String(body.eventId ?? '').trim()
    if (!UUID_RE.test(eventId)) return json({ error: 'Invalid eventId' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: event } = await admin
      .from('events')
      .select('id, creator_id, title, recording_video_id')
      .eq('id', eventId)
      .maybeSingle()
    if (!event) return json({ error: 'Event not found' }, 404)

    if (event.creator_id !== userId) {
      const { data: adminRow } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle()
      if (!adminRow) {
        // Students with access may only read the encoding status.
        let allowed = false
        if (action === 'status') {
          const { data: reg } = await admin
            .from('event_registrations')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle()
          if (reg) allowed = true
          if (!allowed) {
            const { data: ord } = await admin
              .from('orders')
              .select('id')
              .eq('user_id', userId)
              .eq('status', 'paid')
              .or(`and(product_type.eq.event,product_id.eq.${eventId}),and(bump_product_type.eq.event,bump_product_id.eq.${eventId})`)
              .maybeSingle()
            if (ord) allowed = true
          }
        }
        if (!allowed) return json({ error: 'Forbidden' }, 403)
      }
    }

    if (action === 'remove') {
      await admin
        .from('events')
        .update({ recording_video_id: null, recording_status: 'ready' })
        .eq('id', eventId)
      return json({ ok: true })
    }

    if (action === 'status') {
      if (!event.recording_video_id) return json({ status: 'idle' })
      const r = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${event.recording_video_id}`,
        { headers: { AccessKey: BUNNY_API_KEY, accept: 'application/json' } },
      )
      if (!r.ok) return json({ error: 'Bunny fetch failed' }, 502)
      const info = await r.json()
      const s = info.status as number
      let recording_status: 'uploading' | 'processing' | 'ready' | 'error' = 'processing'
      if (s === 3 || s === 4) recording_status = 'ready'
      else if (s === 5) recording_status = 'error'
      else if (s === 6) recording_status = 'uploading'
      await admin.from('events').update({ recording_status }).eq('id', eventId)
      return json({ status: recording_status, bunnyStatus: s, cdn: BUNNY_CDN_HOSTNAME })
    }

    // action === 'create'
    const title = String(body.title ?? '').trim() || `Grabación — ${event.title ?? 'Evento'}`
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          AccessKey: BUNNY_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ title }),
      },
    )
    const createText = await createRes.text()
    if (!createRes.ok) {
      console.error('[event-recording-video] bunny create failed', createRes.status, createText)
      return json({ error: `Bunny create failed (${createRes.status})`, detail: createText }, 200)
    }
    const videoId = JSON.parse(createText)?.guid as string
    if (!videoId) return json({ error: 'Bunny returned no guid' }, 200)

    const expiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60
    const signature = await sha256Hex(
      `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expiration}${videoId}`,
    )

    const { error: updErr } = await admin
      .from('events')
      .update({ recording_video_id: videoId, recording_status: 'uploading' })
      .eq('id', eventId)
    if (updErr) return json({ error: updErr.message }, 200)

    return json({
      videoId,
      libraryId: BUNNY_LIBRARY_ID,
      endpoint: 'https://video.bunnycdn.com/tusupload',
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expiration),
        VideoId: videoId,
        LibraryId: BUNNY_LIBRARY_ID,
      },
    })
  } catch (e) {
    console.error('[event-recording-video] error', e)
    return json({ error: 'Internal error', detail: String((e as Error)?.message ?? e) }, 500)
  }
})
