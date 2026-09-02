import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const PRODUCT_TYPES = new Set(['course', 'ebook', 'event', 'session', 'community'])
const PRODUCT_LABELS: Record<string, string> = {
  course: 'curso', ebook: 'e-book', event: 'evento', session: 'agendamiento', community: 'comunidad',
}
const PUBLIC_SITE_URL = 'https://soynovu.cl'

type Recipient = { email: string; name?: string | null }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255 ? email : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'Debes iniciar sesión como creador' }, 401)

  let callerId = ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
    if (payload?.role !== 'authenticated' || typeof payload?.sub !== 'string') return json({ error: 'No autorizado' }, 403)
    callerId = payload.sub
  } catch {
    return json({ error: 'No autorizado' }, 403)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Configuración del servidor incompleta' }, 500)
  const admin = createClient(supabaseUrl, serviceKey)

  let body: { product_type?: unknown; product_id?: unknown }
  try { body = await req.json() } catch { return json({ error: 'Solicitud inválida' }, 400) }
  const productType = body.product_type
  const productId = body.product_id
  if (typeof productType !== 'string' || !PRODUCT_TYPES.has(productType) || !isUuid(productId)) {
    return json({ error: 'Producto inválido' }, 400)
  }

  let productTitle = ''
  let ownerId = ''
  const table = productType === 'course' ? 'courses' : productType === 'ebook' ? 'ebooks' : productType === 'event' ? 'events' : productType === 'session' ? 'one_on_one_sessions' : 'communities'
  const titleColumn = productType === 'community' ? 'name' : 'title'
  const { data: product, error: productError } = await admin.from(table).select(`creator_id, ${titleColumn}`).eq('id', productId).maybeSingle()
  if (productError || !product) return json({ error: 'Producto no encontrado' }, 404)
  ownerId = product.creator_id
  if (ownerId !== callerId) return json({ error: 'No puedes solicitar evaluaciones de este producto' }, 403)
  productTitle = product[titleColumn] ?? 'Producto'

  const recipientMap = new Map<string, Recipient>()
  if (productType === 'session') {
    const { data: bookings } = await admin.from('session_bookings').select('user_id, guest_email, guest_name').eq('session_id', productId).in('status', ['confirmed', 'completed'])
    for (const booking of bookings ?? []) {
      const email = normalizeEmail(booking.guest_email)
      if (email) recipientMap.set(email, { email, name: booking.guest_name })
      if (!email && booking.user_id) {
        const { data: userData } = await admin.auth.admin.getUserById(booking.user_id)
        const userEmail = normalizeEmail(userData.user?.email)
        if (userEmail) recipientMap.set(userEmail, { email: userEmail, name: booking.guest_name })
      }
    }
  } else {
    const { data: orders } = await admin.from('orders').select('user_id, guest_email, guest_name, bump_product_type, bump_product_id').eq('creator_id', callerId).eq('status', 'paid')
    for (const order of orders ?? []) {
      const isMain = order.product_type === productType && order.product_id === productId
      const isBump = order.bump_product_type === productType && order.bump_product_id === productId
      if (!isMain && !isBump) continue
      const email = normalizeEmail(order.guest_email)
      if (email) recipientMap.set(email, { email, name: order.guest_name })
      if (!email && order.user_id) {
        const { data: userData } = await admin.auth.admin.getUserById(order.user_id)
        const userEmail = normalizeEmail(userData.user?.email)
        if (userEmail) recipientMap.set(userEmail, { email: userEmail, name: order.guest_name })
      }
    }
  }

  const recipients = Array.from(recipientMap.values())
  if (recipients.length === 0) return json({ sent: 0, skipped: 0, message: 'No encontramos compradores para este producto.' })

  let sent = 0
  let skipped = 0
  const label = PRODUCT_LABELS[productType]
  for (const recipient of recipients) {
    const { data: existing } = await admin.from('review_requests').select('id, token, submitted_at').eq('creator_id', callerId).eq('product_type', productType).eq('product_id', productId).ilike('recipient_email', recipient.email).maybeSingle()
    if (existing?.submitted_at) { skipped++; continue }
    let request = existing
    if (!request) {
      const { data: created, error } = await admin.from('review_requests').insert({ creator_id: callerId, product_type: productType, product_id: productId, product_title: productTitle, recipient_email: recipient.email, recipient_name: recipient.name ?? null }).select('id, token').single()
      if (error || !created) { skipped++; continue }
      request = created
    }
    const reviewUrl = `${PUBLIC_SITE_URL}/evaluar/${request.token}`
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
        body: JSON.stringify({
          templateName: 'review-request', recipientEmail: recipient.email,
          idempotencyKey: `review-${request.id}-${new Date().toISOString().slice(0, 10)}`,
          templateData: { recipientName: recipient.name ?? '', productLabel: label, creatorName: productTitle ? (await admin.from('profiles').select('name').eq('id', callerId).maybeSingle()).data?.name ?? '' : '', reviewUrl },
        }),
      })
      if (!response.ok) { skipped++; continue }
      await admin.from('review_requests').update({ sent_at: new Date().toISOString() }).eq('id', request.id)
      sent++
    } catch { skipped++ }
  }

  return json({ sent, skipped, total: recipients.length })
})
