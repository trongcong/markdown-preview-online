import { deflateSync, inflateSync } from 'fflate'
import { decompressFromEncodedURIComponent } from 'lz-string'

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function compressContent(content: string): string {
  const bytes = new TextEncoder().encode(content)
  const compressed = deflateSync(bytes, { level: 9 })
  return toBase64Url(compressed)
}

export function decompressContent(encoded: string): string | null {
  // Try fflate first (new links), fall back to lz-string (old links)
  try {
    return new TextDecoder().decode(inflateSync(fromBase64Url(encoded)))
  } catch {
    return decompressFromEncodedURIComponent(encoded) ?? null
  }
}
