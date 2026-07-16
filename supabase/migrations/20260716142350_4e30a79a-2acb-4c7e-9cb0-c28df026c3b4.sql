
REVOKE ALL ON public.mv_company_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mv_company_stats TO service_role;
