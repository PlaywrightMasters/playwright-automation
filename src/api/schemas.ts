import { z } from 'zod';

/**
 * Response contracts for the Toolshop API, written from its OpenAPI document
 * and checked against live responses. `z.object` ignores unknown keys, so new
 * fields don't break the suite, but a missing or wrongly typed field does.
 */

export const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const CategoryRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const CategorySchema = CategoryRefSchema.extend({
  slug: z.string(),
});

export const CategoryTreeSchema: z.ZodType<CategoryTree> = z.lazy(() =>
  CategorySchema.extend({
    parent_id: z.string().nullable().optional(),
    sub_categories: z.array(CategoryTreeSchema).optional(),
  }),
);
export interface CategoryTree extends z.infer<typeof CategorySchema> {
  parent_id?: string | null | undefined;
  sub_categories?: CategoryTree[] | undefined;
}

export const ProductImageSchema = z.object({
  id: z.string(),
  file_name: z.string(),
  title: z.string(),
});

/**
 * Each endpoint embeds a different representation of a product, so each gets
 * its own contract:
 *   /products, /products/{id}  → ProductSchema (brand, category with slug, image)
 *   /products/search           → SearchProductSchema (category without slug)
 *   /carts/{id} line items     → ProductCoreSchema (no relations)
 */
export const ProductCoreSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative(),
  is_location_offer: z.boolean(),
  is_rental: z.boolean(),
  in_stock: z.boolean(),
  co2_rating: z.enum(['A', 'B', 'C', 'D', 'E']),
  is_eco_friendly: z.boolean(),
});

export const ProductSchema = ProductCoreSchema.extend({
  brand: BrandSchema,
  category: CategorySchema,
  product_image: ProductImageSchema,
});
export type Product = z.infer<typeof ProductSchema>;

export const SearchProductSchema = ProductCoreSchema.extend({
  brand: BrandSchema,
  category: CategoryRefSchema,
  product_image: ProductImageSchema,
});

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    current_page: z.number().int().positive(),
    data: z.array(item),
    from: z.number().int().nullable(),
    to: z.number().int().nullable(),
    last_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  });
}
export const ProductPageSchema = paginated(ProductSchema);
export type ProductPage = z.infer<typeof ProductPageSchema>;
export const SearchPageSchema = paginated(SearchProductSchema);

export const AddressSchema = z.object({
  street: z.string(),
  house_number: z.string().nullable().optional(),
  city: z.string(),
  state: z.string().nullable().optional(),
  country: z.string(),
  postal_code: z.string().nullable().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  phone: z.string().nullable().optional(),
  dob: z.string().nullable().optional(),
  address: AddressSchema,
});
export type User = z.infer<typeof UserSchema>;

export const TokenSchema = z.object({
  access_token: z.string().min(20),
  token_type: z.string(),
  expires_in: z.number().positive(),
});

export const ValidationErrorSchema = z.record(z.string(), z.array(z.string()));
export const MessageSchema = z.object({ message: z.string() });

export const CartCreatedSchema = z.object({ id: z.string() });

export const CartItemSchema = z.object({
  id: z.string(),
  quantity: z.number().int().positive(),
  discount_percentage: z.number().nullable(),
  cart_id: z.string(),
  product_id: z.string(),
  product: ProductCoreSchema,
});

export const CartSchema = z.object({
  id: z.string(),
  additional_discount_percentage: z.number().nullable(),
  cart_items: z.array(CartItemSchema),
});
export type Cart = z.infer<typeof CartSchema>;

export const LookupAddressSchema = z.object({
  street: z.string(),
  house_number: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postcode: z.string(),
});
export type LookupAddress = z.infer<typeof LookupAddressSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string().regex(/^INV-\d+$/),
  invoice_date: z.string(),
  user_id: z.string(),
  billing_street: z.string(),
  billing_city: z.string(),
  billing_state: z.string().nullable(),
  billing_country: z.string(),
  billing_postal_code: z.string().nullable(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;
export const InvoicePageSchema = paginated(InvoiceSchema);

export const PaymentResultSchema = z.object({ message: z.string() });
