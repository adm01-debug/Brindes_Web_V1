
CREATE OR REPLACE FUNCTION public.submit_quote_cart(
  _customer jsonb,
  _items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_name  text;
  v_email text;
  v_phone text;
  v_msg   text;
  v_item  jsonb;
  v_product_id uuid;
  v_quantity   int;
  v_notes      text;
  v_company_id uuid;
  v_product_name text;
  v_full_msg text;
  v_lead_id uuid;
  v_lead_ids uuid[] := ARRAY[]::uuid[];
  v_companies uuid[] := ARRAY[]::uuid[];
BEGIN
  IF _customer IS NULL OR jsonb_typeof(_customer) <> 'object' THEN
    RAISE EXCEPTION 'Dados do solicitante inválidos.' USING ERRCODE = '22023';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um produto ao orçamento.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(_items) > 50 THEN
    RAISE EXCEPTION 'Máximo de 50 itens por orçamento.' USING ERRCODE = '22023';
  END IF;

  v_name  := NULLIF(trim(_customer->>'name'), '');
  v_email := NULLIF(lower(trim(_customer->>'email')), '');
  v_phone := NULLIF(trim(_customer->>'phone'), '');
  v_msg   := COALESCE(NULLIF(trim(_customer->>'message'), ''), 'Solicitação de orçamento via carrinho.');

  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Nome inválido.' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 255 THEN
    RAISE EXCEPTION 'Email inválido.' USING ERRCODE = '22023';
  END IF;
  IF length(v_msg) > 2000 THEN
    RAISE EXCEPTION 'Mensagem muito longa (máx. 2000 caracteres).' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity   := NULLIF(v_item->>'quantity', '')::int;
    v_notes      := NULLIF(trim(v_item->>'notes'), '');

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Item sem produto.' USING ERRCODE = '22023';
    END IF;
    IF v_quantity IS NOT NULL AND (v_quantity <= 0 OR v_quantity > 1000000) THEN
      RAISE EXCEPTION 'Quantidade inválida no item.' USING ERRCODE = '22023';
    END IF;
    IF v_notes IS NOT NULL AND length(v_notes) > 500 THEN
      RAISE EXCEPTION 'Observação muito longa em um item (máx. 500).' USING ERRCODE = '22023';
    END IF;

    SELECT p.company_id, p.name
      INTO v_company_id, v_product_name
      FROM public.products p
      JOIN public.companies c ON c.id = p.company_id
     WHERE p.id = v_product_id
       AND p.is_active = true
       AND p.deleted_at IS NULL
       AND p.moderation_status = 'approved'
       AND c.status = 'approved';

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'Produto indisponível no orçamento.' USING ERRCODE = '22023';
    END IF;

    v_full_msg := v_msg
      || E'\n\n— Item: ' || v_product_name
      || CASE WHEN v_quantity IS NOT NULL THEN ' (qtd: ' || v_quantity || ')' ELSE '' END
      || CASE WHEN v_notes IS NOT NULL THEN E'\nObs: ' || v_notes ELSE '' END;

    INSERT INTO public.leads (company_id, product_id, name, email, phone, quantity, message)
    VALUES (v_company_id, v_product_id, v_name, v_email, v_phone, v_quantity, v_full_msg)
    RETURNING id INTO v_lead_id;

    v_lead_ids := v_lead_ids || v_lead_id;
    IF NOT (v_company_id = ANY(v_companies)) THEN
      v_companies := v_companies || v_company_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'leads_created', array_length(v_lead_ids, 1),
    'companies_notified', array_length(v_companies, 1),
    'lead_ids', to_jsonb(v_lead_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quote_cart(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quote_cart(jsonb, jsonb) TO anon, authenticated;
