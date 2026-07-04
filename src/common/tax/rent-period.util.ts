import { BadRequestException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';

export interface RentPeriodForValidation {
  month: string;
  status: string;
  rentAmount: Prisma.Decimal | number;
}

export interface RentTaxBreakdown {
  vatAmount: number;
  withholdingAmount: number;
  totalAmount: number;
}

/**
 * Computes the base rent amount from the payment periods a rent payment
 * claims to cover. Every selected month must have a period on the lease and
 * none may be already paid.
 */
export function computeRentBaseAmount(
  periods: RentPeriodForValidation[],
  monthsCovered: string[],
): number {
  const months = [...new Set(monthsCovered)];
  const byMonth = new Map(periods.map((p) => [p.month, p]));

  const missing = months.filter((m) => !byMonth.has(m));
  if (missing.length > 0) {
    throw new BadRequestException(
      `No payment period found for: ${missing.join(', ')}`,
    );
  }

  const alreadyPaid = months.filter((m) => byMonth.get(m)?.status === 'paid');
  if (alreadyPaid.length > 0) {
    throw new BadRequestException(
      `These periods are already paid: ${alreadyPaid.join(', ')}`,
    );
  }

  return (
    Math.round(
      months.reduce((sum, m) => sum + Number(byMonth.get(m)?.rentAmount), 0) *
        100,
    ) / 100
  );
}

/**
 * Canonical rent tax formula:
 *   vat         = base × vatRate%
 *   withholding = (base + vat) × withholdingRate%  (only if the lease opted in)
 *   total       = base + vat − withholding
 */
export function computeRentTaxBreakdown(
  baseAmount: number,
  vatRate: number,
  withholdingRate: number,
  applyWithholding: boolean,
): RentTaxBreakdown {
  const vatAmount =
    vatRate > 0 ? Math.round(baseAmount * (vatRate / 100) * 100) / 100 : 0;
  const withholdingAmount =
    applyWithholding && withholdingRate > 0
      ? Math.round((baseAmount + vatAmount) * (withholdingRate / 100) * 100) /
        100
      : 0;
  const totalAmount =
    Math.round((baseAmount + vatAmount - withholdingAmount) * 100) / 100;
  return { vatAmount, withholdingAmount, totalAmount };
}

/**
 * Rejects a client-sent rent amount that does not match the server-computed
 * total (base + VAT − withholding) for the selected periods.
 */
export function assertRentAmountMatchesTotal(
  clientAmount: number,
  totalAmount: number,
): void {
  if (Math.abs(clientAmount - totalAmount) > 0.01) {
    throw new BadRequestException(
      `Amount does not match the computed total for the selected periods. Expected ${totalAmount.toFixed(2)}.`,
    );
  }
}
