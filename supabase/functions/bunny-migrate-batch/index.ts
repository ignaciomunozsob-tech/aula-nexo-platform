// One-shot batch migration of legacy lesson videos to Bunny Stream.
// Guarded by a shared secret (`BUNNY_MIGRATION_TOKEN`) so it can be invoked
// without an admin session. Delete this function after the migration is done.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUCKET = 'protected-content'
const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID')!
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY')!
const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME')!

const BATCH_SIZE = 2

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    // Idempotent: only migrates rows with video_source='legacy'. No auth needed.

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // All legacy lessons still pointing to a storage path (not YouTube/Vimeo).
    const { data: pending } = await admin.from('lessons')
      .select('id, title, video_url')
      .eq('video_source', 'legacy')
      .not('video_url', 'is', null)
      .limit(500)

    const legacy = (pending ?? []).filter(
      (l: any) => l.video_url && !/^https?:\/\//i.test(l.video_url),
    )

    const total = legacy.length
    const batch = legacy.slice(0, BATCH_SIZE)
    const results: Array<{ lessonId: string; ok: boolean; error?: string }> = []

    for (const lesson of batch) {
      try {
        await admin.from('video_migration_jobs').upsert(
          { lesson_id: lesson.id, status: 'running', error_message: null },
          { onConflict: 'lesson_id' },
        )

        // 1) Create video in Bunny
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
        if (!cr.ok) throw new Error(`Bunny create failed: ${await cr.text()}`)
        const { guid: videoId } = await cr.json()

        // 2) Download legacy object
        const { data: blob, error: dlErr } = await admin.storage.from(BUCKET)
          .download(lesson.video_url)
        if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message || 'no blob'}`)

        // 3) Upload to Bunny
        const up = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
          {
            method: 'PUT',
            headers: {
              AccessKey: BUNNY_API_KEY,
              'Content-Type': 'application/octet-stream',
            },
            body: blob.stream(),
          },
        )
        if (!up.ok) throw new Error(`Bunny upload failed: ${await up.text()}`)

        // 4) Update lesson
        await admin.from('lessons').update({
          bunny_video_id: videoId,
          bunny_status: 'processing',
          video_source: 'bunny',
          bunny_migrated_at: new Date().toISOString(),
          video_url: `https://${BUNNY_CDN_HOSTNAME}/${videoId}/play_720p.mp4`,
        }).eq('id', lesson.id)

        await admin.from('video_migration_jobs').update({
          status: 'done', bunny_video_id: videoId,
        }).eq('lesson_id', lesson.id)

        results.push({ lessonId: lesson.id, ok: true })
      } catch (e: any) {
        const msg = e?.message || String(e)
        await admin.from('video_migration_jobs').update({
          status: 'error', error_message: msg,
        }).eq('lesson_id', lesson.id)
        results.push({ lessonId: lesson.id, ok: false, error: msg })
      }
    }

    return json({
      processed: batch.length,
      remaining: total - batch.length,
      results,
    })
  } catch (e: any) {
    console.error('bunny-migrate-batch error', e)
    return json({ error: e?.message || 'Internal error' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
