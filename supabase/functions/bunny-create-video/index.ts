// Creates a new Bunny Stream video for a lesson and returns a TUS upload signature
// so the browser can upload the file directly (resumable, with real progress) without
// ever seeing the Bunny API key. The lesson is marked as `video_source='bunny'` and
// `bunny_status='uploading'` right away; polling `bunny-video-status` moves it to
// `ready` once Bunny finishes encoding.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID')!
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY')!

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
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    )
    if (claimsErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
    const userId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const lessonId = String(body.lessonId ?? '').trim()
    const title = String(body.title ?? '').trim() || 'Lección'
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return json({ error: 'Invalid lessonId' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Authorization: user must be creator of the lesson's course or admin
    const { data: lesson } = await admin.from('lessons')
      .select('id, module_id').eq('id', lessonId).maybeSingle()
    if (!lesson) return json({ error: 'Lesson not found' }, 404)
    const { data: mod } = await admin.from('course_modules')
      .select('course_id, courses(creator_id)').eq('id', lesson.module_id).maybeSingle()
    const creatorId = (mod as any)?.courses?.creator_id
    const { data: adminRow } = await admin.from('user_roles')
      .select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
    if (creatorId !== userId && !adminRow) return json({ error: 'Forbidden' }, 403)

    // 1) Create the video in Bunny
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
    if (!createRes.ok) {
      const t = await createRes.text()
      return json({ error: 'Bunny create failed', detail: t }, 502)
    }
    const created = await createRes.json()
    const videoId = created.guid as string
    if (!videoId) return json({ error: 'Bunny returned no guid' }, 502)

    // 2) Build TUS authorization signature (valid ~24h)
    const expiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60
    const signaturePayload =
      `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expiration}${videoId}`
    const signature = await sha256Hex(signaturePayload)

    // 3) Persist bunny fields on the lesson
    const { error: updErr } = await admin.from('lessons').update({
      bunny_video_id: videoId,
      bunny_status: 'uploading',
      video_source: 'bunny',
      video_url: null,
    }).eq('id', lessonId)
    if (updErr) return json({ error: updErr.message }, 500)

    return json({
      videoId,
      libraryId: BUNNY_LIBRARY_ID,
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
      authorizationSignature: signature,
      authorizationExpire: expiration,
    })
  } catch (e) {
    console.error('bunny-create-video error', e)
    return json({ error: 'Internal error' }, 500)
  }
})

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
