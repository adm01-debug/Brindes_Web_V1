DROP POLICY IF EXISTS "commemorative_dates_public_read" ON public.commemorative_dates;

CREATE POLICY "commemorative_dates_public_read"
  ON public.commemorative_dates FOR SELECT
  USING (is_active = true);

CREATE POLICY "commemorative_dates_admin_read"
  ON public.commemorative_dates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));