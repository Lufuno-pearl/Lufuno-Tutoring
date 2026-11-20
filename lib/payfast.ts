import crypto from 'crypto'

// PayFast online payments. PAYFAST_MODE: 'off' (default), 'sandbox' (fake money, owners only) or 'live'.
export type PayfastMode = 'off' | 'sandbox' | 'live'
export const payfastMode = (): PayfastMode => {
  const m = (process.env.PAYFAST_MODE || 'off').toLowerCase()
  return m === 'live' ? 'live' : m === 'sandbox' ? 'sandbox' : 'off'
}
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lufuno-tutoring.vercel.app'

export function payfastConfig() {
  const mode = payfastMode()
  const sandbox = mode !== 'live'
  return {
    mode,
    processUrl: sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process',
    validateUrl: sandbox ? 'https://sandbox.payfast.co.za/eng/query/validate' : 'https://www.payfast.co.za/eng/query/validate',
    // PayFast's public sandbox test account
    merchantId: process.env.PAYFAST_MERCHANT_ID || (sandbox ? '10000100' : ''),
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || (sandbox ? '46f0cd694581a' : ''),
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
  }
}

// PHP-style urlencode, which is what PayFast signs
const enc = (v: string) => encodeURIComponent(v.trim()).replace(/[!'()*~]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g, '+')

export function paramString(fields: [string, string][], passphrase = '') {
  const parts = fields.filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => `${k}=${enc(String(v))}`)
  if (passphrase) parts.push(`passphrase=${enc(passphrase)}`)
  return parts.join('&')
}
export const sign = (fields: [string, string][], passphrase = '') => crypto.createHash('md5').update(paramString(fields, passphrase)).digest('hex')
