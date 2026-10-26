'use client'
import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

const GRADS = ['linear-gradient(135deg,#B6A3F0,#7555DC)', 'linear-gradient(135deg,#F3A4B7,#D96F8B)', 'linear-gradient(135deg,#8ED2AE,#3E9B6D)', 'linear-gradient(135deg,#F3CB59,#E39B2E)']

export default function StudentVideoPlayer({ subject }: { subject: string }) {
  const [videos, setVideos] = useState<any[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('videos').select('*').eq('subject', subject).order('created_at', { ascending: false }).then(({ data }) => {
      setVideos(data || [])
    })
  }, [subject])

  async function handlePlay(video: any) {
    setPlayingId(video.id)
    setSignedUrl(null)
    const { data, error } = await supabase.storage.from('videos').createSignedUrl(video.storage_path, 3600)
    if (!error && data) setSignedUrl(data.signedUrl)
  }

  if (videos.length === 0) return <p className="meta">No videos uploaded for {subject} yet — check back soon.</p>

  return (
    <div>
      {videos.map((v, i) => (
        <div key={v.id} className="vcard">
          {playingId === v.id ? (
            signedUrl ? (
              <video
                src={signedUrl}
                controls
                autoPlay
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={e => e.preventDefault()}
                style={{ width: '100%', display: 'block', background: '#000' }}
              />
            ) : (
              <div className="vthumb" style={{ background: GRADS[i % GRADS.length] }}><span className="meta" style={{ color: '#fff', margin: 0 }}>Loading...</span></div>
            )
          ) : (
            <div className="vthumb" style={{ background: GRADS[i % GRADS.length], cursor: 'pointer' }} onClick={() => handlePlay(v)}>
              <div className="vplay"><Play size={22} color="#5B3FC4" fill="#5B3FC4" /></div>
            </div>
          )}
          <div className="vbody"><b>{v.title}</b><div className="meta" style={{ margin: 0 }}>{subject}</div></div>
        </div>
      ))}
    </div>
  )
}
