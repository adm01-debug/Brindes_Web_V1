
-- products: tamanhos
ALTER TABLE public.products
  ADD CONSTRAINT products_name_len CHECK (char_length(name) BETWEEN 2 AND 200) NOT VALID;
ALTER TABLE public.products
  ADD CONSTRAINT products_short_desc_len CHECK (short_description IS NULL OR char_length(short_description) <= 500) NOT VALID;
ALTER TABLE public.products
  ADD CONSTRAINT products_desc_len CHECK (description IS NULL OR char_length(description) <= 20000) NOT VALID;

ALTER TABLE public.products VALIDATE CONSTRAINT products_name_len;
ALTER TABLE public.products VALIDATE CONSTRAINT products_short_desc_len;
ALTER TABLE public.products VALIDATE CONSTRAINT products_desc_len;

-- companies: tamanhos
ALTER TABLE public.companies
  ADD CONSTRAINT companies_name_len CHECK (char_length(name) BETWEEN 2 AND 150) NOT VALID;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_tagline_len CHECK (tagline IS NULL OR char_length(tagline) <= 200) NOT VALID;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_desc_len CHECK (description IS NULL OR char_length(description) <= 20000) NOT VALID;

ALTER TABLE public.companies VALIDATE CONSTRAINT companies_name_len;
ALTER TABLE public.companies VALIDATE CONSTRAINT companies_tagline_len;
ALTER TABLE public.companies VALIDATE CONSTRAINT companies_desc_len;

-- URLs (https:// obrigatório em prod, http:// aceito para dev)
ALTER TABLE public.companies
  ADD CONSTRAINT companies_website_url
    CHECK (website IS NULL OR website ~* '^https?://[^\s]{3,500}$') NOT VALID;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_logo_url
    CHECK (logo_url IS NULL OR logo_url ~* '^https?://[^\s]{3,500}$') NOT VALID;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_banner_url
    CHECK (banner_url IS NULL OR banner_url ~* '^https?://[^\s]{3,500}$') NOT VALID;

-- Social: URL completa OU @handle
ALTER TABLE public.companies
  ADD CONSTRAINT companies_instagram_fmt
    CHECK (instagram IS NULL OR instagram ~* '^(https?://[^\s]{3,500}|@?[a-zA-Z0-9._]{1,50})$') NOT VALID;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_facebook_fmt
    CHECK (facebook IS NULL OR facebook ~* '^(https?://[^\s]{3,500}|@?[a-zA-Z0-9._-]{1,100})$') NOT VALID;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_linkedin_fmt
    CHECK (linkedin IS NULL OR linkedin ~* '^(https?://[^\s]{3,500}|@?[a-zA-Z0-9._-]{1,100})$') NOT VALID;
