
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_body_or_attachment_chk;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_body_or_attachment_chk
  CHECK (
    (body IS NOT NULL AND length(btrim(body)) > 0)
    OR attachment_url IS NOT NULL
  );

DROP POLICY IF EXISTS "chat_attach_read_participants" ON storage.objects;
DROP POLICY IF EXISTS "chat_attach_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "chat_attach_delete_owner" ON storage.objects;

CREATE POLICY "chat_attach_read_participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = split_part(name, '/', 1)
      AND (
        c.buyer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.companies co
          WHERE co.id = c.company_id AND co.owner_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "chat_attach_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND split_part(name, '/', 2) = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::text = split_part(name, '/', 1)
      AND (
        c.buyer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.companies co
          WHERE co.id = c.company_id AND co.owner_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "chat_attach_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND split_part(name, '/', 2) = auth.uid()::text
);
