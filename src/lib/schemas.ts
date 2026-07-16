import { z } from "zod";

const trimmedString = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} deve ter no mínimo ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

export const leadSchema = z.object({
  name: trimmedString(2, 120, "Nome"),
  email: z.string().trim().email("Email inválido.").max(255, "Email muito longo."),
  phone: z
    .string()
    .trim()
    .max(30, "Telefone muito longo.")
    .optional()
    .or(z.literal("")),
  quantity: z
    .number()
    .int("Quantidade deve ser um número inteiro.")
    .positive("Quantidade deve ser maior que zero.")
    .optional()
    .nullable(),
  message: trimmedString(10, 2000, "Mensagem"),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const productSchema = z.object({
  name: trimmedString(2, 200, "Nome"),
  category_id: z.string().uuid().nullable(),
  short_description: z.string().trim().max(300).nullable(),
  description: z.string().trim().max(10000).nullable(),
  price: z.number().min(0, "Preço não pode ser negativo.").nullable(),
  price_on_request: z.boolean(),
  material: z.string().trim().max(200).nullable(),
  dimensions: z.string().trim().max(200).nullable(),
  colors: z.array(z.string().trim().min(1).max(50)).max(30).nullable(),
  min_order_quantity: z.number().int().positive().max(1_000_000).nullable(),
  production_time_days: z.number().int().positive().max(365).nullable(),
  customization_options: z.string().trim().max(2000).nullable(),
  is_active: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const companySchema = z.object({
  name: trimmedString(2, 150, "Nome da empresa"),
  tagline: z.string().trim().max(200).nullable(),
  description: z.string().trim().max(5000).nullable(),
  email: z.string().trim().email("Email inválido.").max(255),
  phone: z.string().trim().max(30).nullable(),
  city: z.string().trim().max(120).nullable(),
  state: z.string().trim().max(2).nullable(),
});

export type CompanyInput = z.infer<typeof companySchema>;
