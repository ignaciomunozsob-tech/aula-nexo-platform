// Admin-only: migrates one legacy lesson video from `protected-content` storage to
// Bunny Stream. Idempotent — if the lesson already has `bunny_video_id`, we only
// refresh its encoding status. The legacy storage object is NOT deleted here; use
// `bunny-cleanup-legacy` once the migration is fully verified.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUCKET = 'protected-content'
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
    const userId = claims?.claims?.sub as string | undefined
    if (!userId) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: adminRow } = await admin.from('user_roles')
      .select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
    if (!adminRow) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const lessonId = String(body.lessonId ?? '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return json({ error: 'Invalid lessonId' }, 400)

    // Upsert a job row
    await admin.from('video_migration_jobs').upsert(
      { lesson_id: lessonId, status: 'running', error_message: null },
      { onConflict: 'lesson_id' },
    )
    await admin.rpc('noop').catch(() => {}) // ignore
    await admin.from('video_migration_jobs').update({
      attempts: 1,
    }).eq('lesson_id', lessonId)

    const fail = async (msg: string, http = 500) => {
      await admin.from('video_migration_jobs').update({
        status: 'error', error_message: msg,
      }).eq('lesson_id', lessonId)
      return json({ error: msg }, http)
    }

    const { data: lesson } = await admin.from('lessons')
      .select('id, title, video_url, video_source, bunny_video_id, bunny_status')
      .eq('id', lessonId).maybeSingle()
    if (!lesson) return fail('Lesson not found', 404)

    // Nothing to migrate for external / already-bunny lessons
    if (lesson.video_source === 'bunny' && lesson.bunny_status === 'ready') {
      await admin.from('video_migration_jobs').update({
        status: 'done', bunny_video_id: lesson.bunny_video_id,
      }).eq('lesson_id', lessonId)
      return json({ ok: true, alreadyDone: true })
    }
    if (lesson.video_source === 'external') {
      await admin.from('video_migration_jobs').update({
        status: 'done', error_message: 'external (skipped)',
      }).eq('lesson_id', lessonId)
      return json({ ok: true, skipped: 'external' })
    }
    if (!lesson.video_url) {
      await admin.from('video_migration_jobs').update({
        status: 'done', error_message: 'no file (skipped)',
      }).eq('lesson_id', lessonId)
      return json({ ok: true, skipped: 'empty' })
    }
    if (/^https?:\/\//i.test(lesson.video_url)) {
      await admin.from('video_migration_jobs').update({
        status: 'done', error_message: 'absolute URL (skipped)',
      }).eq('lesson_id', lessonId)
      return json({ ok: true, skipped: 'absolute' })
    }

    // 1) Create video in Bunny
    let videoId = lesson.bunny_video_id as string | null
    if (!videoId) {
      const cr = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
        {
          method: 'POST',
          headers: {
            AccessKey: BUNNY_API_KEY,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({ title: lesson.title || 'Lección' }),
        },
      )
      if (!cr.ok) return fail(`Bunny create failed: ${await cr.text()}`, 502)
      const j = await cr.json()
      videoId = j.guid as string
    }

    // 2) Download the legacy file
    const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(lesson.video_url)
    if (dlErr || !blob) return fail(`Download failed: ${dlErr?.message || 'no blob'}`)

    // 3) Upload to Bunny (single PUT — fine for typical lesson sizes)
    const up = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'PUT',
        headers: { AccessKey: BUNNY_API_KEY, 'Content-Type': 'application/octet-stream' },
        body: blob.stream(),
      },
    )
    if (!up.ok) return fail(`Bunny upload failed: ${await up.text()}`, 502)

    // 4) Update the lesson
    await admin.from('lessons').update({
      bunny_video_id: videoId,
      bunny_status: 'processing',
      video_source: 'bunny',
      bunny_migrated_at: new Date().toISOString(),
      video_url: `https://${BUNNY_CDN_HOSTNAME}/${videoId}/play_720p.mp4`,
    }).eq('id', lessonId)

    await admin.from('video_migration_jobs').update({
      status: 'done', bunny_video_id: videoId,
    }).eq('lesson_id', lessonId)

    return json({ ok: true, videoId })
  } catch (e) {
    console.error('bunny-migrate-lesson error', e)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
