/**
 * NZ Address Zod Schemas
 * Validation schemas matching the Python types
 */
import { z } from 'zod';
export declare const ParsedAddressSchema: z.ZodObject<{
    unit: z.ZodOptional<z.ZodString>;
    number: z.ZodString;
    street: z.ZodString;
    suburb: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    postcode: z.ZodOptional<z.ZodString>;
    complete: z.ZodBoolean;
    confidence: z.ZodNumber;
    linz_address_id: z.ZodOptional<z.ZodString>;
    raw: z.ZodString;
}, "strip", z.ZodTypeAny, {
    number: string;
    street: string;
    suburb: string;
    confidence: number;
    complete: boolean;
    raw: string;
    unit?: string | undefined;
    linz_address_id?: string | undefined;
    city?: string | undefined;
    region?: string | undefined;
    postcode?: string | undefined;
}, {
    number: string;
    street: string;
    suburb: string;
    confidence: number;
    complete: boolean;
    raw: string;
    unit?: string | undefined;
    linz_address_id?: string | undefined;
    city?: string | undefined;
    region?: string | undefined;
    postcode?: string | undefined;
}>;
export declare const ParsedAddressInternalSchema: z.ZodObject<{
    unit: z.ZodOptional<z.ZodString>;
    number: z.ZodString;
    street: z.ZodString;
    suburb: z.ZodString;
    city: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    postcode: z.ZodOptional<z.ZodString>;
    complete: z.ZodBoolean;
    confidence: z.ZodNumber;
    linz_address_id: z.ZodOptional<z.ZodString>;
    raw: z.ZodString;
} & {
    _parsed: z.ZodObject<{
        unit: z.ZodOptional<z.ZodString>;
        number: z.ZodString;
        suffix: z.ZodOptional<z.ZodString>;
        street_name: z.ZodString;
        street_type: z.ZodString;
        suburb_raw: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        number: string;
        street_name: string;
        street_type: string;
        suburb_raw: string;
        unit?: string | undefined;
        suffix?: string | undefined;
    }, {
        number: string;
        street_name: string;
        street_type: string;
        suburb_raw: string;
        unit?: string | undefined;
        suffix?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    number: string;
    street: string;
    suburb: string;
    confidence: number;
    complete: boolean;
    raw: string;
    _parsed: {
        number: string;
        street_name: string;
        street_type: string;
        suburb_raw: string;
        unit?: string | undefined;
        suffix?: string | undefined;
    };
    unit?: string | undefined;
    linz_address_id?: string | undefined;
    city?: string | undefined;
    region?: string | undefined;
    postcode?: string | undefined;
}, {
    number: string;
    street: string;
    suburb: string;
    confidence: number;
    complete: boolean;
    raw: string;
    _parsed: {
        number: string;
        street_name: string;
        street_type: string;
        suburb_raw: string;
        unit?: string | undefined;
        suffix?: string | undefined;
    };
    unit?: string | undefined;
    linz_address_id?: string | undefined;
    city?: string | undefined;
    region?: string | undefined;
    postcode?: string | undefined;
}>;
export type ParsedAddress = z.infer<typeof ParsedAddressSchema>;
export type ParsedAddressInternal = z.infer<typeof ParsedAddressInternalSchema>;
//# sourceMappingURL=schemas.d.ts.map