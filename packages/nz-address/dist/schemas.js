/**
 * NZ Address Zod Schemas
 * Validation schemas matching the Python types
 */
import { z } from 'zod';
export const ParsedAddressSchema = z.object({
    unit: z.string().optional(),
    number: z.string().min(1),
    street: z.string().min(1),
    suburb: z.string().min(1),
    city: z.string().optional(),
    region: z.string().optional(),
    postcode: z.string().optional(),
    complete: z.boolean(),
    confidence: z.number().min(0).max(1),
    linz_address_id: z.string().optional(),
    raw: z.string().min(1),
});
export const ParsedAddressInternalSchema = ParsedAddressSchema.extend({
    _parsed: z.object({
        unit: z.string().optional(),
        number: z.string(),
        suffix: z.string().optional(),
        street_name: z.string(),
        street_type: z.string(),
        suburb_raw: z.string(),
    }),
});
//# sourceMappingURL=schemas.js.map