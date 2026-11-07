// Adds each student's character, boy/girl and feeling to the chat threads. Read in its own query so
// the pages keep working before funi-style.sql has been run (the query just returns nothing).
export async function attachLooks(supabase: any, threads: Record<string, any>) {
  const ids = Object.keys(threads || {})
  if (ids.length === 0) return
  try {
    const { data } = await supabase.from('profiles').select('id, avatar_look, sex, feeling').in('id', ids)
    ;(data || []).forEach((p: any) => { if (threads[p.id]) { threads[p.id].look = p.avatar_look || null; threads[p.id].sex = p.sex || null; threads[p.id].feeling = p.feeling || null } })
  } catch (e) { /* not set up yet */ }
}
