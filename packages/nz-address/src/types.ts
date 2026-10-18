/**
 * NZ Address Types
 * Matches the Python ParsedAddress structure
 */

export interface ParsedAddress {
  unit?: string;
  number: string;
  street: string;
  suburb: string;
  city?: string;
  region?: string;
  postcode?: string;
  complete: boolean;
  confidence: number;
  linz_address_id?: string;
  raw: string;
}

export interface ParsedAddressInternal extends ParsedAddress {
  _parsed: {
    unit?: string;
    number: string;
    suffix?: string;
    street_name: string;
    street_type: string;
    suburb_raw: string;
  };
}