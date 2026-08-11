const COOKIE_NAME = 'padel_session'
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60

const encoder = new TextEncoder()

function base64urlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(value: string): Uint8Array {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalised.length % 4 === 0 ? '' : '='.repeat(4 - (normalised.length % 4))
  const binary = atob(normalised + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

/**
 * Vergleicht ueber die Hashes statt der Rohwerte: konstante Laenge, damit weder
 * Inhalt noch Laenge des Passworts ueber die Laufzeit ableitbar sind.
 */
export async function secretsMatch(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([sha256(a), sha256(b)])
  let diff = 0
  for (let i = 0; i < hashA.length; i++) diff |= (hashA[i] ?? 0) ^ (hashB[i] ?? 0)
  return diff === 0
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.split('=')
    if (rawKey?.trim() === name) return rest.join('=').trim()
  }
  return null
}

export async function createSessionCookie(secret: string, secure: boolean): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
  const payload = base64urlEncode(encoder.encode(JSON.stringify({ exp })))
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload))
  const token = `${payload}.${base64urlEncode(new Uint8Array(signature))}`
  const attributes = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ]
  if (secure) attributes.push('Secure')
  return attributes.join('; ')
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

export async function verifySession(secret: string, cookieHeader: string | null): Promise<boolean> {
  const token = readCookie(cookieHeader, COOKIE_NAME)
  if (!token) return false

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  let valid: boolean
  try {
    valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64urlDecode(signature),
      encoder.encode(payload),
    )
  } catch {
    return false
  }
  if (!valid) return false

  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64urlDecode(payload))) as { exp?: unknown }
    return typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
