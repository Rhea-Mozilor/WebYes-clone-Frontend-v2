const BACKEND = 'http://webyes-alb-1392888365.ap-south-1.elb.amazonaws.com'

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const target = BACKEND + url.pathname + url.search

  const response = await fetch(target, {
    method: context.request.method,
    headers: context.request.headers,
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
