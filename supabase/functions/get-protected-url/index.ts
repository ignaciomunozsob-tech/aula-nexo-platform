// Returns a short-lived signed URL for an object in the private `protected-content` bucket.
// Authorizes the request by validating that the calling user owns the resource OR
// has an active enrollment / paid order tied to the requested path.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUCKET = 'protected-content'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

type Body = { path?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    )
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const userId = claimsData.claims.sub as string

    const body = (await req.json().catch(() => ({}))) as Body
    const path = (body.path ?? '').trim()
    if (!path || path.includes('..') || path.startsWith('/')) {
      return json({ error: 'Invalid path' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const allowed = await isAllowed(admin, userId, path)
    if (!allowed) return json({ error: 'Forbidden' }, 403)

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL)
    if (signErr || !signed?.signedUrl) {
      return json({ error: 'Could not sign URL' }, 500)
    }
    return json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL })
  } catch (e) {
    console.error('get-protected-url error', e)
    return json({ error: 'Internal error' }, 500)
  }
})

async function isAllowed(admin: any, userId: string, path: string): Promise<boolean> {
  // 1. Owner of the path (path is `<userId>/...`)
  const owner = path.split('/')[0]
  if (owner === userId) return true

  // 2. Admin
  const { data: roleRow } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()
  if (roleRow) return true

  // 3. Active enrollment for a lesson video pointing at this path
  const { data: lessonRow } = await admin
    .from('lessons')
    .select('id, module_id, video_url')
    .eq('video_url', path)
    .maybeSingle()
  if (lessonRow) {
    const { data: moduleRow } = await admin
      .from('course_modules')
      .select('course_id')
      .eq('id', lessonRow.module_id)
      .maybeSingle()
    if (moduleRow?.course_id) {
      const { data: enrol } = await admin
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', moduleRow.course_id)
        .eq('status', 'active')
        .maybeSingle()
      if (enrol) return true
    }
  }

  // 4. Lesson resource pointing at this path -> needs active enrollment
  const { data: resRow } = await admin
    .from('lesson_resources')
    .select('lesson_id')
    .eq('file_url', path)
    .maybeSingle()
  if (resRow?.lesson_id) {
    const { data: l } = await admin
      .from('lessons')
      .select('module_id')
      .eq('id', resRow.lesson_id)
      .maybeSingle()
    if (l?.module_id) {
      const { data: m } = await admin
        .from('course_modules')
        .select('course_id')
        .eq('id', l.module_id)
        .maybeSingle()
      if (m?.course_id) {
        const { data: enrol } = await admin
          .from('enrollments')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', m.course_id)
          .eq('status', 'active')
          .maybeSingle()
        if (enrol) return true
      }
    }
  }

  // 5. Ebook file -> needs a paid order
  const { data: ebookRow } = await admin
    .from('ebooks')
    .select('id, creator_id')
    .eq('file_url', path)
    .maybeSingle()
  if (ebookRow) {
    if (ebookRow.creator_id === userId) return true
    const { data: ord } = await admin
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('product_type', 'ebook')
      .eq('product_id', ebookRow.id)
      .eq('status', 'paid')
      .maybeSingle()
    if (ord) return true
  }

  return false
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
