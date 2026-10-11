// The two owners of Aid & Ace. These accounts open the owner dashboard by default.
export const ADMIN_EMAILS = ['pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com']

export function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
