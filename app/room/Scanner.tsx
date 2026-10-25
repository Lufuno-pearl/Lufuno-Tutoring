'use client'
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { scanStudent } from './actions'

// Opens the camera inside the app and reads student QR codes one after another.
export default function Scanner({ onClose, onScanned }: { onClose: () => void; onScanned: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [last, setLast] = useState<{ ok: boolean; text: string } | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    let busy = false
    let lastToken = ''
    let lastAt = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null

    async function begin() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        tick()
      } catch {
        setError('The camera could not open. Allow camera access for this site in your phone settings, then try again.')
      }
    }

    function tick() {
      if (stopped) return
      const v = videoRef.current
      if (v && ctx && v.readyState === v.HAVE_ENOUGH_DATA && !busy) {
        canvas.width = v.videoWidth; canvas.height = v.videoHeight
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        const now = Date.now()
        if (code && code.data && (code.data !== lastToken || now - lastAt > 4000)) {
          lastToken = code.data; lastAt = now; busy = true
          scanStudent(code.data).then(r => {
            if (r.ok) {
              setLast({ ok: true, text: r.already ? `${r.name} was already marked present` : `${r.name} marked present ✅` })
              if (!r.already) { setCount(c => c + 1); onScanned() }
              if (navigator.vibrate) navigator.vibrate(80)
            } else {
              setLast({ ok: false, text: r.message || 'Could not scan that code.' })
            }
          }).catch(() => setLast({ ok: false, text: 'Could not scan. Please try again.' })).finally(() => { setTimeout(() => { busy = false }, 1200) })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    begin()
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
        <b>Scan a student's code</b>
        <button type="button" className="btn" onClick={onClose} style={{ padding: '6px 14px' }}>Done{count > 0 ? ` (${count})` : ''}</button>
      </div>
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', width: 220, height: 220, border: '3px solid #F2B84B', borderRadius: 18, pointerEvents: 'none' }} />
      </div>
      <div style={{ padding: 16, minHeight: 86, color: '#fff', textAlign: 'center' }}>
        {error && <div style={{ color: '#ffb4ab' }}>{error}</div>}
        {!error && !last && <div>Point the camera at the student's QR code.</div>}
        {last && <div style={{ fontWeight: 700, color: last.ok ? '#9be3b0' : '#ffb4ab' }}>{last.text}</div>}
      </div>
    </div>
  )
}
