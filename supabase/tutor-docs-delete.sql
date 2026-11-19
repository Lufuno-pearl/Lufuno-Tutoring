-- Lets the owners delete an applicant's uploaded documents (selfie, proof of registration, results) once they are accepted.
drop policy if exists "tutor docs owner delete" on storage.objects;
create policy "tutor docs owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'tutor-docs' and is_owner());
notify pgrst, 'reload schema';
