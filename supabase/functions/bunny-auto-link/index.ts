// One-off admin tool: lists all videos in the Bunny library, cross-references
// with lessons.bunny_video_id, and returns orphan videos + lessons without a
// video. Optionally auto-links matches whose normalized titles are similar
// enough (threshold configurable via body.minSimilarity, default 0.85).
//
// This function does NOT delete anything on Bunny. It only writes bunny fields
// on `lessons` for confirmed matches. Delete this function once the migration
// is complete.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUNNY_LIBRARY_ID = Deno.env.get('BUNNY_LIBRARY_ID')!
const BUNNY_API_KEY = Deno.env.get('BUNNY_API_KEY')!

function normalize(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Dice coefficient on bigrams — cheap and reasonably robust for short titles.
function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0
  const bigrams = (s: string) => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      m.set(g, (m.get(g) ?? 0) + 1)
    }
    return m
  }
  const A = bigrams(na)
  const B = bigrams(nb)
  let hits = 0
  for (const [g, n] of A) {
    const m = B.get(g)
    if (m) hits += Math.min(n, m)
  }
  const total = [...A.values()].reduce((s, n) => s + n, 0) +
                [...B.values()].reduce((s, n) => s + n, 0)
  return (2 * hits) / total
}

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
    const apply: boolean = !!body.apply
    const applyPairs: Array<{ lessonId: string; videoId: string }> = Array.isArray(body.applyPairs)
      ? body.applyPairs : []
    const minSimilarity: number = typeof body.minSimilarity === 'number' ? body.minSimilarity : 0.85
    const reviewSimilarity: number = typeof body.reviewSimilarity === 'number' ? body.reviewSimilarity : 0.55

    // Direct assignments requested by the caller (already-confirmed matches).
    if (applyPairs.length > 0) {
      const results: any[] = []
      for (const { lessonId, videoId } of applyPairs) {
        if (!/^[0-9a-f-]{36}$/i.test(lessonId) || !/^[0-9a-f-]{36}$/i.test(videoId)) {
          results.push({ lessonId, videoId, ok: false, error: 'invalid id' })
          continue
        }
        const { error } = await admin.from('lessons').update({
          bunny_video_id: videoId,
          bunny_status: 'ready',
          video_source: 'bunny',
          video_url: null,
        }).eq('id', lessonId)
        results.push({ lessonId, videoId, ok: !error, error: error?.message })
      }
      return json({ applied: results })
    }

    // 1) Fetch ALL Bunny videos (paginated)
    const bunnyVideos: Array<{ guid: string; title: string; status: number; length: number }> = []
    let page = 1
    while (true) {
      const url = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos?page=${page}&itemsPerPage=100&orderBy=date`
      const r = await fetch(url, { headers: { AccessKey: BUNNY_API_KEY, accept: 'application/json' } })
      if (!r.ok) return json({ error: `Bunny list failed: ${await r.text()}` }, 502)
      const j = await r.json()
      const items = j.items ?? []
      for (const it of items) {
        bunnyVideos.push({
          guid: it.guid, title: it.title ?? '', status: it.status, length: it.length ?? 0,
        })
      }
      if (items.length < 100) break
      page++
      if (page > 20) break // safety
    }

    // 2) Load all lessons with context
    const { data: lessons } = await admin
      .from('lessons')
      .select('id, title, bunny_video_id, video_source, video_url, module_id, course_modules(course_id, title, courses(title))')
    const linkedIds = new Set(
      (lessons ?? [])
        .map((l: any) => l.bunny_video_id)
        .filter((v: any) => !!v),
    )

    const orphans = bunnyVideos.filter((v) => !linkedIds.has(v.guid))
    const lessonsWithoutVideo = (lessons ?? []).filter((l: any) => {
      const hasBunny = !!l.bunny_video_id
      const hasExternal = l.video_url && /^https?:\/\//i.test(l.video_url)
      return !hasBunny && !hasExternal
    })

    // 3) Greedy best-match by similarity
    type Pair = {
      videoId: string
      videoTitle: string
      lessonId: string
      lessonTitle: string
      moduleTitle: string | null
      courseTitle: string | null
      similarity: number
    }
    const allPairs: Pair[] = []
    for (const v of orphans) {
      for (const l of lessonsWithoutVideo as any[]) {
        const s = similarity(v.title, l.title)
        if (s >= reviewSimilarity) {
          allPairs.push({
            videoId: v.guid,
            videoTitle: v.title,
            lessonId: l.id,
            lessonTitle: l.title,
            moduleTitle: l.course_modules?.title ?? null,
            courseTitle: l.course_modules?.courses?.title ?? null,
            similarity: s,
          })
        }
      }
    }
    allPairs.sort((a, b) => b.similarity - a.similarity)

    const usedVideos = new Set<string>()
    const usedLessons = new Set<string>()
    const auto: Pair[] = []
    const review: Pair[] = []
    for (const p of allPairs) {
      if (usedVideos.has(p.videoId) || usedLessons.has(p.lessonId)) continue
      if (p.similarity >= minSimilarity) {
        auto.push(p)
        usedVideos.add(p.videoId)
        usedLessons.add(p.lessonId)
      } else {
        // Keep for review (still block one-per-video/lesson)
        review.push(p)
        usedVideos.add(p.videoId)
        usedLessons.add(p.lessonId)
      }
    }

    const applied: any[] = []
    if (apply && auto.length > 0) {
      for (const p of auto) {
        const { error } = await admin.from('lessons').update({
          bunny_video_id: p.videoId,
          bunny_status: 'ready',
          video_source: 'bunny',
          video_url: null,
        }).eq('id', p.lessonId)
        applied.push({ ...p, ok: !error, error: error?.message })
      }
    }

    const unmatchedVideos = orphans
      .filter((v) => !usedVideos.has(v.guid))
      .map((v) => ({ videoId: v.guid, videoTitle: v.title, status: v.status }))
    const unmatchedLessons = (lessonsWithoutVideo as any[])
      .filter((l: any) => !usedLessons.has(l.id))
      .map((l: any) => ({
        lessonId: l.id,
        lessonTitle: l.title,
        moduleTitle: l.course_modules?.title ?? null,
        courseTitle: l.course_modules?.courses?.title ?? null,
      }))

    return json({
      totals: {
        bunnyVideos: bunnyVideos.length,
        orphanVideos: orphans.length,
        lessonsWithoutVideo: lessonsWithoutVideo.length,
      },
      autoMatched: auto,
      needsReview: review,
      unmatchedVideos,
      unmatchedLessons,
      applied,
    })
  } catch (e) {
    console.error('bunny-auto-link error', e)
    return json({ error: 'Internal error', detail: String(e) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
