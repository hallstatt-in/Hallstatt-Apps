export type DeductionType = 'percentage' | 'fixed';

export interface FeeComponent {
  name: string;
  type: DeductionType;
  value: number;
  description?: string;
  isGstApplicable: boolean;
}

export interface PlatformConfig {
  id: string;
  name: string;
  logoColor: string;
  logoUrl?: string;
  fees: FeeComponent[];
}

export interface CalculationResult {
  platformName: string;
  logoUrl?: string;
  sellingPrice: number;
  cogs: number;
  shippingCost: number;
  totalFees: number;
  gstOnFees: number;
  profit: number;
  margin: number;
  cac?: number;
  suggestedPrice?: number;
  feeBreakdown: { name: string; amount: number }[];
  // Advanced metrics for Shopify/Detailed
  rtoRate?: number;
  returnRate?: number;
  netSales?: number;
  expectedRTOLoss?: number;
  expectedReturnLoss?: number;
}
