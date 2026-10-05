export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 14 }}>
      <div style={{ width: 36, height: 36, border: '4px solid #E4DDF5', borderTopColor: '#6E4FC7', borderRadius: '50%', animation: 'aa-spin 0.8s linear infinite' }} />
      <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.7 }}>Loading…</p>
      <style>{`@keyframes aa-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
