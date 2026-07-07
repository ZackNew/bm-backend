import { Prisma } from 'generated/prisma/client';

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

/**
 * Parses the `items` JSON column of an Invoice into renderable line items
 * (e.g. Base Rent / VAT / Withholding). Falls back to the provided single
 * line when the column is empty or malformed (legacy invoices).
 */
export function parseInvoiceItems(
  items: Prisma.JsonValue | null | undefined,
  fallback: InvoiceLineItem,
): InvoiceLineItem[] {
  if (Array.isArray(items)) {
    const parsed = items.filter(
      (item): item is { description: string; amount: number } =>
        typeof item === 'object' &&
        item !== null &&
        'description' in item &&
        'amount' in item &&
        typeof (item as Record<string, unknown>).description === 'string' &&
        typeof (item as Record<string, unknown>).amount === 'number',
    );
    if (parsed.length > 0) {
      return parsed.map((i) => ({
        description: i.description,
        amount: i.amount,
      }));
    }
  }
  return [fallback];
}
