// One-shot: refresh Bunny status for all lessons currently marked 'processing'.
// Idempotent, safe to delete after use.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID')!
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY')!
const BUNNY_CDN_HOSTNAME = Deno.env.get('BUNNY_CDN_HOSTNAME')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: lessons } = await admin.from('lessons')
    .select('id, bunny_video_id, bunny_status')
    .eq('video_source', 'bunny')
    .neq('bunny_status', 'ready')
    .not('bunny_video_id', 'is', null)
    .limit(200)

  const results: any[] = []
  for (const l of lessons ?? []) {
    try {
      const r = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${l.bunny_video_id}`,
        { headers: { AccessKey: BUNNY_API_KEY, accept: 'application/json' } },
      )
      if (!r.ok) { results.push({ id: l.id, err: r.status }); continue }
      const info = await r.json()
      const s = info.status as number
      let bunny_status: 'uploading' | 'processing' | 'ready' | 'error' = 'processing'
      if (s === 3 || s === 4) bunny_status = 'ready'
      else if (s === 5) bunny_status = 'error'
      else if (s === 6) bunny_status = 'uploading'
      const patch: any = { bunny_status }
      if (bunny_status === 'ready') {
        patch.video_url = `https://${BUNNY_CDN_HOSTNAME}/${l.bunny_video_id}/play_720p.mp4`
      }
      await admin.from('lessons').update(patch).eq('id', l.id)
      results.push({ id: l.id, bunnyStatus: s, mapped: bunny_status })
    } catch (e: any) {
      results.push({ id: l.id, err: e?.message })
    }
  }
  return new Response(JSON.stringify({ checked: lessons?.length ?? 0, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
