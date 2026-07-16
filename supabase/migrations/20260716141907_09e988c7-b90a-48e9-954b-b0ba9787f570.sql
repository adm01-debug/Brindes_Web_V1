
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
  company_name TEXT;
BEGIN
  BEGIN
    company_name := COALESCE(
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    );

    base_slug := lower(regexp_replace(unaccent_safe(company_name), '[^a-z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'empresa'; END IF;
    final_slug := base_slug;

    WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = final_slug) LOOP
      counter := counter + 1;
      IF counter > 1000 THEN
        final_slug := base_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
        EXIT;
      END IF;
      final_slug := base_slug || '-' || counter;
    END LOOP;

    INSERT INTO public.companies (owner_id, slug, name, email, status)
    VALUES (NEW.id, final_slug, company_name, NEW.email, 'pending');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'company_owner')
    ON CONFLICT DO NOTHING;

  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.audit_log (actor_id, entity_type, entity_id, action, new_value, reason)
      VALUES (
        NEW.id,
        'user',
        NEW.id,
        'handle_new_user_error',
        jsonb_build_object('email', NEW.email, 'sqlstate', SQLSTATE),
        SQLERRM
      );
    EXCEPTION WHEN OTHERS THEN
      -- último recurso: nunca bloqueia signup
      NULL;
    END;
  END;

  RETURN NEW;
END;
$$;
