// Public endpoint returning the Bunny library id. The library id is public
// (it appears in every embed URL) so we don't gate this behind auth. This lets
// the frontend build the `iframe.mediadelivery.net/embed/{libraryId}/{videoId}`
// URL without hardcoding the id in a client-side env var.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const libraryId = Deno.env.get('BUNNY_LIBRARY_ID') ?? ''
  const cdnHostname = Deno.env.get('BUNNY_CDN_HOSTNAME') ?? ''
  return new Response(JSON.stringify({ libraryId, cdnHostname }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
