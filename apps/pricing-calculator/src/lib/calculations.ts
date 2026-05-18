import { PLATFORMS, DEFAULT_GST_RATE } from '../constants';
import { CalculationResult, PlatformConfig } from '../types';

export const FIXED_PACKAGING = 10;
export const PRODUCT_GST_RATE = 5;
const PROFIT_GST_LABEL = `Our Profit GST (${PRODUCT_GST_RATE}%)`;
const RISK_EXCLUDED_PLATFORM_IDS = new Set(['stylezen']);

export interface ShopifyConfig {
  shopifyMonthlyOrders: number;
  shopifyShipping: number;
  shopifyCac: number;
  shopifyDiscount: number;
  shopifyDiscountType: 'fixed' | 'percentage';
  shopifyPrepaidDiscount: number;
  shopifyRtoOrders: number;
  shopifyReturnOrders: number;
}

function getRiskProvision(
  platformId: string,
  monthlyOrdersInput: number,
  monthlyRtoOrdersInput: number,
  monthlyReturnOrdersInput: number,
  rtoCostPerOrder: number,
  returnCostPerOrder: number
) {
  if (RISK_EXCLUDED_PLATFORM_IDS.has(platformId)) {
    return {
      monthlyOrders: Math.max(monthlyOrdersInput, 1),
      monthlyRtoOrders: 0,
      monthlyReturnOrders: 0,
      rtoRate: 0,
      returnRate: 0,
      expectedRTOLoss: 0,
      expectedReturnLoss: 0,
      feeBreakdown: [],
    };
  }

  const monthlyOrders = Math.max(monthlyOrdersInput, 1);
  const monthlyRtoOrders = Math.max(monthlyRtoOrdersInput, 0);
  const monthlyReturnOrders = Math.max(monthlyReturnOrdersInput, 0);
  const rtoRate = (monthlyRtoOrders / monthlyOrders) * 100;
  const returnRate = (monthlyReturnOrders / monthlyOrders) * 100;
  const expectedRTOLoss = (monthlyRtoOrders * rtoCostPerOrder) / monthlyOrders;
  const expectedReturnLoss = (monthlyReturnOrders * returnCostPerOrder) / monthlyOrders;

  return {
    monthlyOrders,
    monthlyRtoOrders,
    monthlyReturnOrders,
    rtoRate,
    returnRate,
    expectedRTOLoss,
    expectedReturnLoss,
    feeBreakdown: [
      { name: `RTO Provision (${monthlyRtoOrders} of ${monthlyOrders}/mo, ${rtoRate.toFixed(1)}%)`, amount: expectedRTOLoss },
      { name: `Return Provision (${monthlyReturnOrders} of ${monthlyOrders}/mo, ${returnRate.toFixed(1)}%)`, amount: expectedReturnLoss },
    ],
  };
}

function getMarketplaceShippingProvision(platform: typeof PLATFORMS[number]) {
  return platform.fees.reduce((sum, fee) => {
    const isLogisticsFee = /shipping|delivery|logistic/i.test(fee.name);
    return isLogisticsFee && fee.type === 'fixed' ? sum + fee.value : sum;
  }, 0);
}

export function calculatePlatformResults(
  cogs: number,
  targetProfit: number,
  shopifyConfig: ShopifyConfig,
  platformConfigs: PlatformConfig[] = PLATFORMS
): CalculationResult[] {
  return platformConfigs.map((platform) => {
    const isShopify = platform.id === 'shopify';
    const gstMultiplier = (1 + DEFAULT_GST_RATE / 100);

    if (isShopify) {
      const { 
        shopifyMonthlyOrders, shopifyShipping, shopifyCac, shopifyDiscount, 
        shopifyDiscountType, shopifyPrepaidDiscount, 
        shopifyRtoOrders, shopifyReturnOrders
      } = shopifyConfig;

      const calculateShopifyForS = (S: number) => {
        const monthlyOrders = Math.max(shopifyMonthlyOrders, 1);
        const discount = shopifyDiscountType === 'fixed' ? shopifyDiscount : (S * shopifyDiscount) / 100;
        const netSAfterDiscount = S - discount;
        const prepaidDiscount = (netSAfterDiscount * shopifyPrepaidDiscount) / 100;
        const netSales = netSAfterDiscount - prepaidDiscount;
        const pgCharges = netSales * 0.025;
        const shipping = shopifyShipping;
        const packaging = FIXED_PACKAGING;
        const netPaymentGst = (S - cogs) * (PRODUCT_GST_RATE / (100 + PRODUCT_GST_RATE));
        
        const feeBreakdown = [
          { name: 'Discount', amount: discount },
          { name: 'Prepaid Discount', amount: prepaidDiscount },
          { name: 'PG Charges (2.5%)', amount: pgCharges },
          { name: 'Shipping Cost', amount: shipping },
          { name: 'Packaging', amount: packaging },
        ];

        const risk = getRiskProvision(
          platform.id,
          monthlyOrders,
          shopifyRtoOrders,
          shopifyReturnOrders,
          shipping + packaging + shopifyCac,
          shipping + packaging + shopifyCac + cogs
        );

        const averageProfit = netSales - pgCharges - shipping - packaging - netPaymentGst - cogs - shopifyCac - risk.expectedRTOLoss - risk.expectedReturnLoss;

        const extendedFeeBreakdown = [
          ...feeBreakdown,
          { name: `CAC`, amount: shopifyCac },
          ...risk.feeBreakdown,
          { name: PROFIT_GST_LABEL, amount: netPaymentGst },
        ];
        
        return {
          averageProfit,
          netSales,
          totalFees: discount + prepaidDiscount + pgCharges + shipping + packaging + netPaymentGst + shopifyCac + risk.expectedRTOLoss + risk.expectedReturnLoss,
          feeBreakdown: extendedFeeBreakdown,
          margin: S > 0 ? (averageProfit / S) * 100 : 0,
          expectedRTOLoss: risk.expectedRTOLoss,
          expectedReturnLoss: risk.expectedReturnLoss,
        };
      };

      let low = cogs;
      let high = cogs * 20;
      let suggestedS = low;
      
      for(let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        const res = calculateShopifyForS(mid);
        if (res.averageProfit < targetProfit) {
          low = mid;
        } else {
          high = mid;
          suggestedS = mid;
        }
      }

      const final = calculateShopifyForS(suggestedS);
      return {
        platformName: platform.name,
        logoUrl: platform.logoUrl,
        sellingPrice: suggestedS,
        suggestedPrice: suggestedS,
        cogs,
        shippingCost: shopifyShipping + FIXED_PACKAGING,
        totalFees: final.totalFees,
        gstOnFees: 0,
        profit: final.averageProfit,
        margin: final.margin,
        cac: shopifyCac,
        netSales: final.netSales,
        feeBreakdown: final.feeBreakdown,
        expectedRTOLoss: final.expectedRTOLoss,
        expectedReturnLoss: final.expectedReturnLoss,
      } as CalculationResult;
    }

    if (platform.id === 'amazon') {
      const getAmazonClosingFee = (price: number) => {
        if (price <= 300) return 1;
        if (price <= 500) return 22;
        if (price <= 1000) return 45;
        return 76;
      };

      const calculateAmazonForS = (S: number) => {
        let totalFees = 0;
        let gstOnFees = 0;
        const feeBreakdown: { name: string; amount: number }[] = [];
        const currentClosingFee = getAmazonClosingFee(S);

        platform.fees.forEach(fee => {
          let val = fee.value;
          if (fee.name === 'Closing Fee') {
            val = currentClosingFee;
          }
          let feeAmount = fee.type === 'percentage' ? (S * val) / 100 : val;
          feeBreakdown.push({ name: fee.name, amount: feeAmount });
          totalFees += feeAmount;
          if (fee.isGstApplicable) {
            gstOnFees += (feeAmount * DEFAULT_GST_RATE) / 100;
          }
        });

        const netProductGst = (S - cogs) * (PRODUCT_GST_RATE / (100 + PRODUCT_GST_RATE));
        feeBreakdown.push({ name: 'Packaging', amount: FIXED_PACKAGING });
        const shippingProvision = getMarketplaceShippingProvision(platform);
        const risk = getRiskProvision(
          platform.id,
          shopifyConfig.shopifyMonthlyOrders,
          shopifyConfig.shopifyRtoOrders,
          shopifyConfig.shopifyReturnOrders,
          shippingProvision + FIXED_PACKAGING,
          shippingProvision + FIXED_PACKAGING + cogs
        );

        const profit = S - netProductGst - (cogs + FIXED_PACKAGING + totalFees + gstOnFees + risk.expectedRTOLoss + risk.expectedReturnLoss);
        return { profit, totalFees, gstOnFees, feeBreakdown, netProductGst, risk };
      };

      let low = cogs;
      let high = cogs * 20;
      let suggestedS = low;
      for(let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        const res = calculateAmazonForS(mid);
        if (res.profit < targetProfit) {
          low = mid;
        } else {
          high = mid;
          suggestedS = mid;
        }
      }
      const final = calculateAmazonForS(suggestedS);
      const feeBreakdown = [
        ...final.feeBreakdown,
        ...final.risk.feeBreakdown,
        { name: PROFIT_GST_LABEL, amount: final.netProductGst },
      ];
      return {
        platformName: platform.name,
        logoUrl: platform.logoUrl,
        sellingPrice: suggestedS,
        suggestedPrice: suggestedS,
        cogs,
        shippingCost: FIXED_PACKAGING,
        totalFees: final.totalFees + FIXED_PACKAGING + final.risk.expectedRTOLoss + final.risk.expectedReturnLoss,
        gstOnFees: final.gstOnFees,
        profit: final.profit,
        margin: suggestedS > 0 ? (final.profit / suggestedS) * 100 : 0,
        feeBreakdown,
        expectedRTOLoss: final.risk.expectedRTOLoss,
        expectedReturnLoss: final.risk.expectedReturnLoss,
      } as CalculationResult;
    }

    let fixedFeesSum = 0;
    let percFeesSum = 0;
    const packaging = FIXED_PACKAGING;
    const shippingProvision = getMarketplaceShippingProvision(platform);
    const risk = getRiskProvision(
      platform.id,
      shopifyConfig.shopifyMonthlyOrders,
      shopifyConfig.shopifyRtoOrders,
      shopifyConfig.shopifyReturnOrders,
      shippingProvision + packaging,
      shippingProvision + packaging + cogs
    );

    platform.fees.forEach(fee => {
      const multiplier = fee.isGstApplicable ? gstMultiplier : 1;
      if (fee.type === 'fixed') {
        fixedFeesSum += fee.value * multiplier;
      } else {
        percFeesSum += (fee.value / 100) * multiplier;
      }
    });

    const denominator = (1 - percFeesSum);
    const suggestedS = denominator > (PRODUCT_GST_RATE / (100 + PRODUCT_GST_RATE))
      ? (targetProfit + (cogs + packaging + fixedFeesSum + risk.expectedRTOLoss + risk.expectedReturnLoss) - (cogs * (PRODUCT_GST_RATE / (100 + PRODUCT_GST_RATE)))) / (denominator - (PRODUCT_GST_RATE / (100 + PRODUCT_GST_RATE)))
      : 0;

    let totalFees = 0;
    let gstOnFees = 0;
    const feeBreakdown: { name: string; amount: number }[] = [];

    const netProductGst = (suggestedS - cogs) * (PRODUCT_GST_RATE / (100 + PRODUCT_GST_RATE));
    feeBreakdown.push({ name: 'Packaging', amount: packaging });

    platform.fees.forEach((fee) => {
      let feeAmount = fee.type === 'percentage' ? (suggestedS * fee.value) / 100 : fee.value;
      feeBreakdown.push({ name: fee.name, amount: feeAmount });
      totalFees += feeAmount;
      if (fee.isGstApplicable) {
        gstOnFees += (feeAmount * DEFAULT_GST_RATE) / 100;
      }
    });

    feeBreakdown.push(...risk.feeBreakdown);
    feeBreakdown.push({ name: PROFIT_GST_LABEL, amount: netProductGst });

    return {
      platformName: platform.name,
      logoUrl: platform.logoUrl,
      sellingPrice: suggestedS,
      suggestedPrice: suggestedS,
      cogs,
      shippingCost: packaging,
      totalFees: totalFees + packaging + risk.expectedRTOLoss + risk.expectedReturnLoss,
      gstOnFees,
      profit: targetProfit,
      margin: suggestedS > 0 ? (targetProfit / suggestedS) * 100 : 0,
      feeBreakdown,
      expectedRTOLoss: risk.expectedRTOLoss,
      expectedReturnLoss: risk.expectedReturnLoss,
    } as CalculationResult;
  });
}
