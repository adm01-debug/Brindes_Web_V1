
-- product-images bucket policies
CREATE POLICY "Public can read product images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Company owners can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY "Company owners can update their product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY "Company owners can delete their product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

-- company-assets bucket policies
CREATE POLICY "Public can read company assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'company-assets');

CREATE POLICY "Company owners can upload their assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY "Company owners can update their assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY "Company owners can delete their assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );
