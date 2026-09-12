
  if (section === 'assign') {
    const uniItems = (bookings || []).map((b: any) => ({ ...b, kind: 'bookings', label: `${b.subject} — ${b.day} ${b.time}` }))
    const hsItems = (subs || []).map((s: any) => ({ ...s, kind: 'hs_subscriptions', label: `${s.month} — High School` }))
    const renderItem = (r: any) => (
      <div className="panel" key={r.id}>
        <h4>{r.label}</h4>
        <div className="meta">{r.profiles?.full_name} · currently: {r.tutor_id ? (partners.find((p: any) => p.id === r.tutor_id)?.full_name || 'a partner') : 'unassigned'}</div>
        <form action={async (formData: FormData) => { await assignTutor(r.kind, r.id, formData.get('tutorId') as string) }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select name="tutorId" defaultValue={r.tutor_id || ''} style={{ flex: 1, padding: 8, border: '1px solid var(--line)', borderRadius: 100 }}>
            <option value="">Unassigned</option>
            {partners.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}{p.available ? '' : ' (not available)'}</option>)}
          </select>
          <button className="btn btn-primary">Save</button>
        </form>
      </div>
    )
    return (
      <div>
        <Back />
        <h3>University</h3>
        {uniItems.length === 0 && <p className="meta">Nothing to assign.</p>}
        {uniItems.map(renderItem)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsItems.length === 0 && <p className="meta">Nothing to assign.</p>}
        {hsItems.map(renderItem)}
      </div>
    )
  }

  if (section === 'packs') {
    return (
      <div>
        <Back />
        <h3>Study pack orders</h3>
        {(orders || []).map((o: any) => (
          <div className="panel" key={o.id}>
            <h4>{o.pack_name}</h4>
            <div className="meta">{o.profiles?.full_name} · {o.profiles?.email} · R{o.price}</div>
            <StatusPill status={o.status} />
            {o.status !== 'confirmed' && (
              <form action={async () => { await confirmPayment('pack_orders', o.id) }} style={{ marginTop: 8 }}>
                <button className="btn btn-gold">Mark paid</button>
              </form>
            )}
            {o.status === 'confirmed' && <PackUpload orderId={o.id} studentId={o.student_id} />}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'sessions') {
    return (
      <div>
        <Back />
        <h3>Sessions log</h3>
        {(attendanceRows || []).length === 0 && <p className="meta">No sessions logged yet.</p>}
        {(attendanceRows || []).map((a: any) => (
          <div className="panel" key={a.id}>
            <h4>{a.student?.full_name || 'Student'}</h4>
            <div className="meta">{a.session_date} — {a.status} · logged by {a.tutor?.full_name || 'you'}</div>
          </div>
        ))}
      </div>
    )
  }

  if (section === 'chat') {
    if (selectedStudentId) {
      const thread = threadsByStudent[selectedStudentId]
      return (
        <div>
          <Back onClick={() => setSelectedStudentId(null)} />
          <h3>{thread.name}</h3>
          <div className="meta" style={{ marginBottom: 10 }}>{thread.email}</div>
          <ChatThread studentId={selectedStudentId} thread={thread} actions={actions} />
        </div>
      )
    }

    const entries = Object.entries(threadsByStudent)
    const uniEntries = entries.filter(([, t]: any) => t.tier !== 'highschool')
    const hsEntries = entries.filter(([, t]: any) => t.tier === 'highschool')

    const renderRow = ([sid, t]: any) => (
      <div key={sid} className="panel" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedStudentId(sid)}>
        <div>
          <h4 style={{ margin: 0 }}>{t.name}</h4>
          <div className="meta" style={{ marginBottom: 0 }}>{t.email}</div>
        </div>
        <ChevronRight size={18} color="var(--purple-dark)" />
      </div>
    )

    return (
      <div>
        <Back />
        <h3>University</h3>
        {uniEntries.length === 0 && <p className="meta">No students yet.</p>}
        {uniEntries.map(renderRow)}
        <h3 style={{ marginTop: 20 }}>High School</h3>
        {hsEntries.length === 0 && <p className="meta">No students yet.</p>}
        {hsEntries.map(renderRow)}
      </div>
    )
  }

  return null
}
