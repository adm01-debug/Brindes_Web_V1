-- Etapa 48: Carrinho de Orçamento Persistente
CREATE TABLE public.quote_cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity integer CHECK (quantity > 0),
    notes text,
    added_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, product_id)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_cart_items TO authenticated;
GRANT ALL ON public.quote_cart_items TO service_role;

-- RLS
ALTER TABLE public.quote_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own quote cart items"
ON public.quote_cart_items
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_quote_cart_user_id ON public.quote_cart_items(user_id);
CREATE INDEX idx_quote_cart_added_at ON public.quote_cart_items(added_at);
