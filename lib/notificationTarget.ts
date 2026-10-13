// Works out which screen a notification should open, from its message text.
export type NotifTarget = { home: string; section: string; tab: string; studentId?: string }

export function notificationTarget(n: { message: string; student_id?: string | null }, home: '/portal' | '/tutor' | '/partner'): NotifTarget {
  const m = (n.message || '').toLowerCase()
  const has = (...w: string[]) => w.some(x => m.includes(x))

  if (home === '/portal') {
    if (has('new message', 'from your tutor', 'from lufuno')) return { home, section: 'chat', tab: 'chat' }
    if (has('study pack')) return { home, section: 'packs', tab: 'learn' }
    if (has('video')) return { home, section: 'video', tab: 'learn' }
    if (has('homework')) return { home, section: 'homework', tab: 'learn' }
    if (has('referr')) return { home, section: 'referral', tab: 'more' }
    if (has('tutor is available', 'request tutoring', "don't have a")) return { home, section: 'book', tab: 'tutoring' }
    return { home, section: 'menu', tab: 'home' } // assigned tutor, meeting link, sessions
  }

  if (home === '/tutor') {
    if (has('new message')) return { home, section: 'chat', tab: 'chat', studentId: n.student_id || undefined }
    if (has('study pack')) return { home, section: 'packs', tab: 'more' }
    if (has('video topic')) return { home, section: 'videoreq', tab: 'more' }
    if (has('video access')) return { home, section: 'videos', tab: 'more' }
    if (has('disputed')) return { home, section: 'sessions', tab: 'more' }
    if (has('referr')) return { home, section: 'referrals', tab: 'more' }
    return { home, section: 'pending', tab: 'requests' } // requests, payments, homework
  }

  // tutor (partner)
  if (has('new message')) return { home, section: 'students', tab: 'students' }
  if (has('request', 'payment')) return { home, section: 'requests', tab: 'requests' }
  return { home, section: 'menu', tab: 'home' }
}

export function applyTarget(t: NotifTarget) {
  const k = t.home === '/portal' ? 'portal' : t.home === '/tutor' ? 'tutor' : 'partner'
  try {
    sessionStorage.setItem(k + 'Section', t.section)
    sessionStorage.setItem(k + 'Tab', t.tab)
    if (t.studentId) sessionStorage.setItem('tutorOpenStudent', t.studentId)
  } catch (e) {}
}
