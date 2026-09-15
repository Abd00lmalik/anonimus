export const config = {
  matcher: '/api/:path*',
}

export default async function handler(req) {
  const url = new URL(req.url)
  const target = `http://43.157.12.242:3001${url.pathname}${url.search}`

  const headers = new Headers()
  for (const [key, value] of req.headers) {
    if (key !== 'host') headers.set(key, value)
  }

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  })

  const resHeaders = new Headers(res.headers)
  resHeaders.set('Access-Control-Allow-Origin', '*')
  resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  resHeaders.set('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: resHeaders })
  }

  return new Response(res.body, {
    status: res.status,
    headers: resHeaders,
  })
}
