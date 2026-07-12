// Creates a new Bunny Stream video for a lesson and returns a TUS upload signature
// so the browser can upload the file directly (resumable, with real progress) without
// ever seeing the Bunny API key. The lesson is marked as `video_source='bunny'` and
// `bunny_status='uploading'` right away; polling `bunny-video-status` moves it to
// `ready` once Bunny finishes encoding.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const BUNNY_LIBRARY_ID = (Deno.env.get('BUNNY_LIBRARY_ID') ?? '').trim()
const BUNNY_API_KEY = (Deno.env.get('BUNNY_API_KEY') ?? '').trim()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!BUNNY_LIBRARY_ID || !BUNNY_API_KEY) {
      console.error('[bunny-create-video] missing env', {
        hasLibraryId: !!BUNNY_LIBRARY_ID,
        hasApiKey: !!BUNNY_API_KEY,
      })
      return json({ error: 'Bunny credentials not configured' }, 200)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[bunny-create-video] missing bearer')
      return json({ error: 'Unauthorized' }, 200)
    }
    const token = authHeader.replace('Bearer ', '')

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData?.user?.id) {
      console.error('[bunny-create-video] auth failed', userErr?.message)
      return json({ error: 'Unauthorized', detail: userErr?.message }, 200)
    }
    const userId = userData.user.id

    const body = await req.json().catch(() => ({}))
    let lessonId = String(body.lessonId ?? '').trim()
    const title = String(body.title ?? '').trim() || 'Lección'
    const courseId = String(body.courseId ?? '').trim()
    let moduleId = String(body.moduleId ?? '').trim()
    const moduleTitle = cleanTitle(body.moduleTitle, 'Nuevo módulo')
    const moduleOrderIndex = toSafeOrderIndex(body.moduleOrderIndex)
    const lessonTitle = cleanTitle(body.lessonTitle, 'Nueva lección')
    const lessonOrderIndex = toSafeOrderIndex(body.lessonOrderIndex)
    const lessonType = body.lessonType === 'text' ? 'text' : 'video'
    if (!lessonId) lessonId = `new-${Date.now()}`

    const isTemporaryLesson = lessonId.startsWith('new-')
    const isTemporaryModule = moduleId.startsWith('new-') || !moduleId

    if (!isTemporaryLesson && !isUuid(lessonId)) {
      console.error('[bunny-create-video] invalid lessonId', lessonId)
      return json({ error: 'Invalid lessonId', detail: lessonId })
    }

    console.log('[bunny-create-video] start', {
      lessonId,
      courseId,
      moduleId,
      title,
      userId,
      temporaryLesson: isTemporaryLesson,
      temporaryModule: isTemporaryModule,
    })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: adminRow } = await admin.from('user_roles')
      .select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle()
    const isAdmin = !!adminRow

    // Authorization + persistence. For new lessons, create the module/lesson on
    // the backend first so the upload flow never depends on a browser temp ID.
    let creatorId: string | null = null
    if (isTemporaryLesson) {
      if (!isUuid(courseId)) {
        console.error('[bunny-create-video] temporary lesson missing course context', { lessonId, courseId })
        return json({
          error: 'Missing course context',
          detail: 'No se pudo identificar el curso para guardar la lección antes de subir el video.',
        })
      }

      const { data: course, error: courseErr } = await admin.from('courses')
        .select('id, creator_id').eq('id', courseId).maybeSingle()
      if (courseErr || !course) {
        console.error('[bunny-create-video] course not found', courseErr?.message)
        return json({ error: 'Course not found' }, 200)
      }
      creatorId = course.creator_id as string

      if (creatorId !== userId && !isAdmin) {
        console.error('[bunny-create-video] forbidden course', { userId, creatorId })
        return json({ error: 'Forbidden' }, 200)
      }

      if (isTemporaryModule) {
        const { data: createdModule, error: moduleErr } = await admin.from('course_modules')
          .insert({
            course_id: courseId,
            title: moduleTitle,
            order_index: moduleOrderIndex,
          })
          .select('id')
          .single()
        if (moduleErr || !createdModule?.id) {
          console.error('[bunny-create-video] module insert failed', moduleErr?.message)
          return json({ error: 'Module insert failed', detail: moduleErr?.message }, 200)
        }
        moduleId = createdModule.id as string
      } else if (isUuid(moduleId)) {
        const { data: existingModule, error: moduleErr } = await admin.from('course_modules')
          .select('id, course_id').eq('id', moduleId).maybeSingle()
        if (moduleErr || !existingModule || existingModule.course_id !== courseId) {
          console.error('[bunny-create-video] module mismatch', {
            moduleErr: moduleErr?.message,
            moduleId,
            courseId,
          })
          return json({ error: 'Module not found for course' }, 200)
        }
      } else {
        return json({ error: 'Invalid moduleId', detail: moduleId }, 200)
      }

      const { data: createdLesson, error: lessonErr } = await admin.from('lessons')
        .insert({
          module_id: moduleId,
          title: lessonTitle,
          type: lessonType,
          video_url: null,
          content_text: lessonType === 'text' ? '' : null,
          description: null,
          order_index: lessonOrderIndex,
        })
        .select('id')
        .single()
      if (lessonErr || !createdLesson?.id) {
        console.error('[bunny-create-video] lesson insert failed', lessonErr?.message)
        return json({ error: 'Lesson insert failed', detail: lessonErr?.message }, 200)
      }
      lessonId = createdLesson.id as string
    } else {
      // Existing lesson: user must be creator of the lesson's course or admin.
      const { data: lesson } = await admin.from('lessons')
        .select('id, module_id').eq('id', lessonId).maybeSingle()
      if (!lesson) return json({ error: 'Lesson not found' }, 200)
      moduleId = lesson.module_id as string
      const { data: mod } = await admin.from('course_modules')
        .select('course_id, courses(creator_id)').eq('id', lesson.module_id).maybeSingle()
      creatorId = (mod as any)?.courses?.creator_id ?? null
    }

    if (creatorId !== userId && !adminRow) {
      console.error('[bunny-create-video] forbidden', { userId, creatorId })
      return json({ error: 'Forbidden' }, 200)
    }

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
    const createBodyText = await createRes.text()
    console.log('[bunny-create-video] bunny create response', {
      status: createRes.status,
      ok: createRes.ok,
      libraryId: BUNNY_LIBRARY_ID,
      apiKeyLength: BUNNY_API_KEY.length,
      apiKeyPreview: BUNNY_API_KEY.slice(0, 4) + '…',
      bodyPreview: createBodyText.slice(0, 500),
    })
    if (!createRes.ok) {
      console.error('[bunny-create-video] bunny error body', createBodyText)
      return json({
        error: `Bunny create failed (${createRes.status})`,
        detail: createBodyText,
      }, 200)
    }
    let created: any
    try {
      created = JSON.parse(createBodyText)
    } catch {
      console.error('[bunny-create-video] bunny returned non-json', createBodyText)
      return json({ error: 'Bunny returned non-JSON', detail: createBodyText }, 200)
    }
    const videoId = created.guid as string
    if (!videoId) {
      console.error('[bunny-create-video] no guid in response', created)
      return json({ error: 'Bunny returned no guid', detail: createBodyText }, 200)
    }

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
    if (updErr) {
      console.error('[bunny-create-video] lesson update failed', updErr.message)
      return json({ error: updErr.message }, 200)
    }

    console.log('[bunny-create-video] success', { videoId, expiration })

    return json({
      lessonId,
      moduleId,
      videoId,
      libraryId: BUNNY_LIBRARY_ID,
      endpoint: 'https://video.bunnycdn.com/tusupload',
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expiration),
        VideoId: videoId,
        LibraryId: BUNNY_LIBRARY_ID,
      },
      // legacy fields kept for backwards compat with older clients
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
      authorizationSignature: signature,
      authorizationExpire: expiration,
    })
  } catch (e) {
    console.error('[bunny-create-video] unhandled error', e)
    return json({ error: 'Internal error', detail: String((e as any)?.message ?? e) }, 200)
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function toSafeOrderIndex(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

function cleanTitle(value: unknown, fallback: string) {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, 255) : fallback
}
