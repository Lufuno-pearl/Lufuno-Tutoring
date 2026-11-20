// What a payment should be, read from our own database (never trusted from the browser).
export async function expectedAmount(supabase: any, table: string, id: string): Promise<number> {
  if (table === 'pack_orders') {
    const { data: first } = await supabase.from('pack_orders').select('price, bundle_id').eq('id', id).single()
    if (!first) return 0
    if (!first.bundle_id) return Number(first.price) || 0
    const { data: all } = await supabase.from('pack_orders').select('price').eq('bundle_id', first.bundle_id)
    return (all || []).reduce((a: number, r: any) => a + Number(r.price || 0), 0)
  }
  const { data } = await supabase.from(table).select('price').eq('id', id).single()
  return Number(data?.price) || 0
}
