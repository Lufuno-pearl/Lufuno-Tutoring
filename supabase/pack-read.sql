-- Lets a student see and download the files in their own pack orders (and staff see all)
drop policy if exists "study packs read own or staff" on storage.objects;
create policy "study packs read own or staff" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'study-packs'
    and (
      is_staff()
      or exists (
        select 1 from public.pack_orders o
        where o.id::text = (storage.foldername(name))[1]
          and o.student_id = auth.uid()
      )
    )
  );
