// Returns a short-lived signed URL for an object in the private `protected-content` bucket.
// Caller passes a resource ID (lesson video, lesson resource, or ebook); we look up the
// stored storage path server-side after validating access. Clients never need the raw path.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUCKET = 'protected-content'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

type Kind = 'lesson_video' | 'lesson_resource' | 'ebook'
type Body = { kind?: Kind; id?: string }

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
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    )
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
    const userId = claimsData.claims.sub as string

    const body = (await req.json().catch(() => ({}))) as Body
    const kind = body.kind
    const id = (body.id ?? '').trim()
    if (!kind || !id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return json({ error: 'Invalid request' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Admin always allowed
    const { data: adminRow } = await admin
      .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
    const isAdmin = !!adminRow

    let path: string | null = null

    if (kind === 'lesson_video' || kind === 'lesson_resource') {
      let lessonId = id
      if (kind === 'lesson_resource') {
        const { data: res } = await admin.from('lesson_resources')
          .select('lesson_id, file_url').eq('id', id).maybeSingle()
        if (!res) return json({ error: 'Not found' }, 404)
        path = res.file_url
        lessonId = res.lesson_id
      } else {
        const { data: lesson } = await admin.from('lessons')
          .select('video_url').eq('id', id).maybeSingle()
        if (!lesson) return json({ error: 'Not found' }, 404)
        path = lesson.video_url
      }

      // Look up course and validate access (creator or active enrollment)
      const { data: l } = await admin.from('lessons')
        .select('module_id').eq('id', lessonId).maybeSingle()
      const { data: m } = l?.module_id
        ? await admin.from('course_modules').select('course_id, courses(creator_id)')
            .eq('id', l.module_id).maybeSingle()
        : { data: null as any }
      const courseId = m?.course_id
      const creatorId = (m as any)?.courses?.creator_id

      let allowed = isAdmin || creatorId === userId
      if (!allowed && courseId) {
        const { data: enrol } = await admin.from('enrollments')
          .select('id').eq('user_id', userId).eq('course_id', courseId)
          .eq('status', 'active').maybeSingle()
        allowed = !!enrol
      }
      if (!allowed) return json({ error: 'Forbidden' }, 403)
    } else if (kind === 'ebook') {
      const { data: e } = await admin.from('ebooks')
        .select('file_url, creator_id').eq('id', id).maybeSingle()
      if (!e) return json({ error: 'Not found' }, 404)
      path = e.file_url
      let allowed = isAdmin || e.creator_id === userId
      if (!allowed) {
        const { data: ord } = await admin.from('orders').select('id')
          .eq('user_id', userId).eq('product_type', 'ebook')
          .eq('product_id', id).eq('status', 'paid').maybeSingle()
        allowed = !!ord
      }
      if (!allowed) return json({ error: 'Forbidden' }, 403)
    } else {
      return json({ error: 'Invalid kind' }, 400)
    }

    if (!path) return json({ error: 'No file' }, 404)

    // Backwards-compat: legacy entries may already be absolute URLs
    if (/^https?:\/\//i.test(path)) return json({ url: path, expires_in: SIGNED_URL_TTL })

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
    if (signErr || !signed?.signedUrl) return json({ error: 'Could not sign URL' }, 500)

    return json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL })
  } catch (e) {
    console.error('get-protected-url error', e)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
