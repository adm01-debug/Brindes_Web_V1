
-- Restrict sensitive company columns from anonymous scrapers.
-- Contact fields (email, phone, whatsapp) remain public because the marketplace
-- CTAs (WhatsApp/email) require them for unauthenticated visitors.
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, slug, name, tagline, description,
  logo_url, banner_url,
  email, phone, whatsapp, website, instagram, facebook, linkedin,
  city, state, status, created_at, updated_at
) ON public.companies TO anon;
