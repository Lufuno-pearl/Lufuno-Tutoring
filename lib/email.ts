import nodemailer from 'nodemailer'

// Sends email through Gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set in Vercel.
// Returns false (and sends nothing) when they are not set, so callers can fall back.
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass || !to) return false
  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await t.sendMail({ from: `Aid & Ace Tutoring <${user}>`, to, subject, text })
    return true
  } catch {
    return false
  }
}
