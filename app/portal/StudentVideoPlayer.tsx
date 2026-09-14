'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

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
      {videos.map(v => (
        <div key={v.id} className="panel">
          <h4>{v.title}</h4>
          {playingId === v.id ? (
            signedUrl ? (
              <video
                src={signedUrl}
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={e => e.preventDefault()}
                style={{ width: '100%', borderRadius: 8, marginTop: 8 }}
              />
            ) : (
              <p className="meta">Loading...</p>
            )
          ) : (
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => handlePlay(v)}>Watch</button>
          )}
        </div>
      ))}
    </div>
  )
}
