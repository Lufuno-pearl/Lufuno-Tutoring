// Meeting links must be Meet, Teams, Zoom or any other normal web call link. WhatsApp is not allowed,
// because it would put students' phone numbers in front of each other and can't tell us who joined.
export function checkMeetingLink(raw: string): { ok: true; url: string } | { ok: false; message: string } {
  const url = String(raw || '').trim()
  if (!url) return { ok: true, url: '' }
  let u: URL
  try { u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`) } catch { return { ok: false, message: 'That does not look like a link.' } }
  const host = u.hostname.toLowerCase()
  if (host === 'wa.me' || host.endsWith('whatsapp.com') || host.endsWith('whatsapp.net')) {
    return { ok: false, message: 'WhatsApp links are not allowed. Use a Google Meet, Teams or Zoom link.' }
  }
  return { ok: true, url: u.toString() }
}
