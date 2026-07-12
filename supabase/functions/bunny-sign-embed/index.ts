// Signs Bunny Stream embed URLs on the server so BUNNY_SECURITY_KEY is never
// exposed to the browser. Returns a URL valid for 1 hour.
//
// Signature: token = sha256Hex(BUNNY_SECURITY_KEY + videoId + expires)
//   - hex lowercase
//   - expires: Unix seconds (NOT milliseconds)
//   - videoId: bare GUID (no URL)
// URL: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token={token}&expires={expires}

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const LIBRARY_ID = (Deno.env.get('BUNNY_LIBRARY_ID') ?? '').trim()
const SECURITY_KEY = (Deno.env.get('BUNNY_SECURITY_KEY') ?? '').trim()

function toHex(buf: ArrayBuffer): string {
  // Uint8Array -> lowercase hex string
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!LIBRARY_ID || !SECURITY_KEY) {
      console.error('[bunny-sign-embed] missing env', {
        hasLibraryId: !!LIBRARY_ID,
        hasSecurityKey: !!SECURITY_KEY,
      })
      return new Response(
        JSON.stringify({ error: 'Bunny env vars missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json().catch(() => ({}))
    const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : ''
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'videoId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const expires = Math.floor(Date.now() / 1000) + 3600
    const signaturePayload = SECURITY_KEY + videoId + expires
    const hash = await sha256Hex(signaturePayload)
    const url = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?token=${hash}&expires=${expires}`

    // Diagnostic logs (Edge Function logs only — never returned to the client).
    // We never log the raw BUNNY_SECURITY_KEY; we only log its length + a short
    // prefix so you can confirm the env var is populated with the expected value.
    console.log(
      '[bunny-sign-embed]',
      JSON.stringify({
        videoId,
        expires,
        libraryId: LIBRARY_ID,
        securityKeyLength: SECURITY_KEY.length,
        securityKeyPreview: SECURITY_KEY.slice(0, 4) + '…',
        hash,
        url,
      }),
    )

    return new Response(JSON.stringify({ url, expires }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[bunny-sign-embed] error', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
