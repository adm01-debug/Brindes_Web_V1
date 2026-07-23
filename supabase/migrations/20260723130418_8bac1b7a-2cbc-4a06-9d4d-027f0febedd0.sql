CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_notes_lead_created ON public.lead_notes(lead_id, created_at DESC);
CREATE INDEX idx_lead_notes_author ON public.lead_notes(author_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owner can view own lead notes"
ON public.lead_notes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.companies c ON c.id = l.company_id
    WHERE l.id = lead_notes.lead_id
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Company owner can insert own lead notes"
ON public.lead_notes FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.companies c ON c.id = l.company_id
    WHERE l.id = lead_notes.lead_id
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Author can update own note"
ON public.lead_notes FOR UPDATE TO authenticated
USING (author_user_id = auth.uid())
WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Author can delete own note"
ON public.lead_notes FOR DELETE TO authenticated
USING (author_user_id = auth.uid());

CREATE TRIGGER trg_lead_notes_updated_at
BEFORE UPDATE ON public.lead_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();