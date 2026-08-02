import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const QuoteCartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).nullable(),
  notes: z.string().max(500).nullable(),
});

export const getQuoteCart = createServerFn({ method: "GET" })
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    if (!userId) return [];

    const { data, error } = await supabase
      .from("quote_cart_items")
      .select("product_id, quantity, notes, added_at")
      .order("added_at", { ascending: true });

    if (error) throw error;
    return data;
  });

export const syncQuoteCart = createServerFn({ method: "POST" })
  .inputValidator((data) => z.array(QuoteCartItemSchema).parse(data))
  .handler(async ({ data: items, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) return { success: false, error: "Unauthorized" };

    // Upsert items for the user
    const toUpsert = items.map(item => ({
      user_id: userId,
      ...item,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("quote_cart_items")
      .upsert(toUpsert, { onConflict: "user_id, product_id" });

    if (error) throw error;
    return { success: true };
  });

export const clearQuoteCart = createServerFn({ method: "POST" })
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    if (!userId) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("quote_cart_items")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  });

export const removeFromQuoteCart = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ product_id: z.string().uuid() }).parse(data))
  .handler(async ({ data: { product_id }, context }) => {
    const { supabase, userId } = context as any;
    if (!userId) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("quote_cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", product_id);

    if (error) throw error;
    return { success: true };
  });
