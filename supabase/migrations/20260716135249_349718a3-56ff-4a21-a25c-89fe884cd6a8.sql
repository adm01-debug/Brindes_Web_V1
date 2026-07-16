
CREATE INDEX IF NOT EXISTS idx_categories_root_sort
  ON public.categories (sort_order, name)
  WHERE parent_id IS NULL;
