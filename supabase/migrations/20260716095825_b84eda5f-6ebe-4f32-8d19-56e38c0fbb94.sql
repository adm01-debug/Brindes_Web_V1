
DROP POLICY IF EXISTS "Company owners can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can delete their product images" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can upload their assets" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can update their assets" ON storage.objects;
DROP POLICY IF EXISTS "Company owners can delete their assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage storage objects" ON storage.objects;

CREATE POLICY "Owner upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.owner_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = c.id::text
  )
);

CREATE POLICY "Owner update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.owner_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = c.id::text
  )
);

CREATE POLICY "Owner delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.owner_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = c.id::text
  )
);

CREATE POLICY "Owner upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.owner_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = c.id::text
  )
);

CREATE POLICY "Owner update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.owner_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = c.id::text
  )
);

CREATE POLICY "Owner delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.owner_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = c.id::text
  )
);

CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Public read company assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'company-assets');

CREATE POLICY "Admins manage storage objects"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id IN ('product-images','company-assets')
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id IN ('product-images','company-assets')
  AND public.has_role(auth.uid(), 'admin')
);
