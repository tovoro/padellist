export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...init.headers },
  })
}

export function error(status: number, message: string): Response {
  return json({ error: message }, { status })
}
