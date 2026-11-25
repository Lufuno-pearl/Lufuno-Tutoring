import nodemailer from 'nodemailer'

// Sends email through Gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set in Vercel.
// Returns false (and sends nothing) when they are not set, so callers can fall back.
export async function sendEmailDetailed(to: string, subject: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return { ok: false, error: 'GMAIL_USER or GMAIL_APP_PASSWORD is not set on this deployment' }
  if (!to) return { ok: false, error: 'no address' }
  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await t.sendMail({ from: `Aid & Ace Tutoring <${user}>`, to, subject, text })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: String(e?.response || e?.message || e).slice(0, 200) }
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  return (await sendEmailDetailed(to, subject, text)).ok
}
