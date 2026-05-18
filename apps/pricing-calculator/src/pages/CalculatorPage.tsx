import React, { useState, useMemo } from 'react';
import { Calculator, ShoppingCart, DollarSign, Package, Truck, Info, ChevronRight, LayoutDashboard, Settings2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PLATFORMS } from '../constants';
import { calculatePlatformResults, ShopifyConfig, FIXED_PACKAGING } from '../lib/calculations';
import { CalculationResult, PlatformConfig } from '../types';

export default function CalculatorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from === 'price-list' ? '/price-list' : '/';
  const [cogs, setCogs] = useState<number>(location.state?.cogs || 400);

  // Shopify Detailed State
  const [shopifyConfig, setShopifyConfig] = useState<ShopifyConfig>({
    shopifyMonthlyOrders: 100,
    shopifyShipping: 90,
    shopifyCac: 500,
    shopifyDiscount: 79,
    shopifyDiscountType: 'fixed',
    shopifyPrepaidDiscount: 10,
    shopifyRtoOrders: 15,
    shopifyReturnOrders: 5,
  });
  
  const [targetProfit, setTargetProfit] = useState<number>(200);
  const [platformConfigs, setPlatformConfigs] = useState<PlatformConfig[]>(PLATFORMS);

  const results = useMemo(() => {
    return calculatePlatformResults(cogs, targetProfit, shopifyConfig, platformConfigs);
  }, [cogs, targetProfit, shopifyConfig, platformConfigs]);

  const updatePlatformFee = (platformId: string, feeName: string, value: number) => {
    setPlatformConfigs((current) =>
      current.map((platform) =>
        platform.id === platformId
          ? {
              ...platform,
              fees: platform.fees.map((fee) => (fee.name === feeName ? { ...fee, value } : fee)),
            }
          : platform,
      ),
    );
  };


  return (
    <div className="min-h-screen bg-[#f3f0ea] text-[#171a16] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fffaf1]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(backPath)}
              className="rounded-md border border-black/10 bg-white/70 p-2 text-[#4f4f4f] transition-colors hover:bg-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-black uppercase tracking-[0.2em] text-[#3a3a3a]">
                Hallstatt
              </div>
              <div className="h-4 w-px bg-black/15" />
              <h1 className="text-base font-black uppercase tracking-[0.18em] text-[#746e64]">Pricing Module</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar / Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <section className="rounded-lg border border-black/10 bg-[#fffdf8] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[#3a3a3a]">
                  <Settings2 size={18} />
                  <h2 className="text-lg font-bold uppercase tracking-wider">Cost Parameters</h2>
                </div>
              </div>

              <div className="space-y-5">
                <InputGroup
                  label={`Target Profit (₹${targetProfit})`}
                  value={targetProfit}
                  onChange={setTargetProfit}
                  icon={<DollarSign size={16} />}
                  prefix="₹"
                  description="Desired absolute profit per unit"
                  highlight
                />
                
                <InputGroup
                  label={`Product Cost (₹${cogs})`}
                  value={cogs}
                  onChange={setCogs}
                  icon={<Package size={16} />}
                  prefix="₹"
                  description="Manufacturing or procurement cost"
                />

                <div className="pt-4 border-t border-gray-100 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-500 uppercase tracking-widest">Base Packaging</span>
                    <span className="text-lg font-black text-gray-900 font-mono">₹{FIXED_PACKAGING}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-500">Applied per order where marketplace packaging is required.</p>
                </div>


                <div className="pt-6 border-t border-black/10 mt-6 space-y-6">
                  <div className="flex items-center gap-2 text-[#3a3a3a] mb-4">
                    <ShoppingCart size={16} />
                    <h3 className="text-lg font-black uppercase tracking-widest">Marketplace Model</h3>
                  </div>

                  <div className="space-y-4">
                    <InputGroup
                      label={`Monthly Orders (${shopifyConfig.shopifyMonthlyOrders})`}
                      value={shopifyConfig.shopifyMonthlyOrders}
                      onChange={(val) => setShopifyConfig(prev => ({ ...prev, shopifyMonthlyOrders: val }))}
                      icon={<ShoppingCart size={12} />}
                      description="Used for RTO and return provisions on every marketplace except Stylezen"
                    />

                    <div className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-black uppercase tracking-widest text-gray-500">
                          Shopify Discount ({shopifyConfig.shopifyDiscount}{shopifyConfig.shopifyDiscountType === 'percentage' ? '%' : '₹'})
                        </label>
                        <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                          <button 
                            onClick={() => setShopifyConfig(prev => ({ ...prev, shopifyDiscountType: 'percentage' }))}
                            className={`px-3 py-1 rounded-md text-base font-black ${shopifyConfig.shopifyDiscountType === 'percentage' ? 'bg-white text-[#3a3a3a] shadow-sm' : 'text-gray-500'}`}
                          >
                            %
                          </button>
                          <button 
                            onClick={() => setShopifyConfig(prev => ({ ...prev, shopifyDiscountType: 'fixed' }))}
                            className={`px-3 py-1 rounded-md text-base font-black ${shopifyConfig.shopifyDiscountType === 'fixed' ? 'bg-white text-[#3a3a3a] shadow-sm' : 'text-gray-500'}`}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        value={shopifyConfig.shopifyDiscount || ''}
                        onChange={(e) => setShopifyConfig(prev => ({ ...prev, shopifyDiscount: e.target.value === '' ? 0 : Number(e.target.value) }))}
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-lg font-bold outline-none transition-all focus:border-[#3a3a3a] focus:ring-2 focus:ring-[#3a3a3a]/10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup
                        label={`Shipping (₹${shopifyConfig.shopifyShipping})`}
                        value={shopifyConfig.shopifyShipping}
                        onChange={(val) => setShopifyConfig(prev => ({ ...prev, shopifyShipping: val }))}
                        icon={<Truck size={12} />}
                        prefix="₹"
                      />
                      <InputGroup
                        label={`CAC (₹${shopifyConfig.shopifyCac})`}
                        value={shopifyConfig.shopifyCac}
                        onChange={(val) => setShopifyConfig(prev => ({ ...prev, shopifyCac: val }))}
                        icon={<ShoppingCart size={12} />}
                        prefix="₹"
                        highlight
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup
                        label={`Prepaid Disc. (${shopifyConfig.shopifyPrepaidDiscount}%)`}
                        value={shopifyConfig.shopifyPrepaidDiscount}
                        onChange={(val) => setShopifyConfig(prev => ({ ...prev, shopifyPrepaidDiscount: val }))}
                        icon={<ChevronRight size={12} />}
                        prefix="%"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup
                        label={`RTO Orders (${shopifyConfig.shopifyRtoOrders}/mo)`}
                        value={shopifyConfig.shopifyRtoOrders}
                        onChange={(val) => setShopifyConfig(prev => ({ ...prev, shopifyRtoOrders: val }))}
                        icon={<Truck size={12} />}
                        prefix="#"
                      />
                      <InputGroup
                        label={`Return Orders (${shopifyConfig.shopifyReturnOrders}/mo)`}
                        value={shopifyConfig.shopifyReturnOrders}
                        onChange={(val) => setShopifyConfig(prev => ({ ...prev, shopifyReturnOrders: val }))}
                        icon={<ShoppingCart size={12} />}
                        prefix="#"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-6">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-black text-gray-500 uppercase tracking-widest">Commission GST</span>
                    <span className="rounded bg-[#3a3a3a]/5 px-2 py-1 text-base font-bold text-[#3a3a3a]">18% AUTO-APPLIED</span>
                  </div>
                </div>

                <MarketplaceParameterAccordion
                  platformConfigs={platformConfigs}
                  onFeeChange={updatePlatformFee}
                />
              </div>
            </section>

            <section className="rounded-lg border border-[#171a16] bg-[#171a16] p-6 text-white shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                  <Info size={18} />
                </div>
                <div>
                  <h3 className="mb-1 text-xl font-bold">
                    Reverse pricing active
                  </h3>
                  <p className="text-base leading-relaxed text-white/80">
                    Enter your target profit and CAC. We'll tell you the exact selling price needed for each platform.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <LayoutDashboard size={20} className="text-[#a83e59]" />
                <h2 className="text-2xl font-bold tracking-tight">
                  Smart Pricing Suggestions
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-2 text-sm font-black tracking-widest text-[#4f4f4f] shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-600" />
                DASHBOARD
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <AnimatePresence mode="popLayout">
                {results.map((result, idx) => (
                  <PlatformCard 
                    key={result.platformName} 
                    result={result} 
                    index={idx} 
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MarketplaceParameterAccordion({
  platformConfigs,
  onFeeChange,
}: {
  platformConfigs: PlatformConfig[];
  onFeeChange: (platformId: string, feeName: string, value: number) => void;
}) {
  const [openPlatformId, setOpenPlatformId] = useState(platformConfigs[0]?.id ?? '');

  return (
    <div className="mt-6 border-t border-black/10 pt-6">
      <div className="mb-4 flex items-center gap-2 text-[#3a3a3a]">
        <Settings2 size={16} />
        <h3 className="text-lg font-black uppercase tracking-widest">Marketplace Parameters</h3>
      </div>

      <div className="space-y-3">
        {platformConfigs.map((platform) => {
          const isOpen = openPlatformId === platform.id;
          const isShopify = platform.id === 'shopify';

          return (
            <div key={platform.id} className="overflow-hidden rounded-lg border border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setOpenPlatformId(isOpen ? '' : platform.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f7f0f2]"
              >
                <span>
                  <span className="block text-base font-black text-[#171a16]">{platform.name}</span>
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#746e64]">
                    {isShopify ? 'Detailed controls above' : `${platform.fees.length} fee fields`}
                  </span>
                </span>
                <ChevronRight
                  size={17}
                  className={`shrink-0 text-[#746e64] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-black/10 bg-[#fffdf8] p-4">
                  {isShopify && (
                    <p className="rounded-md bg-[#f3f0ea] p-3 text-sm font-semibold leading-5 text-[#746e64]">
                      Shopify uses the detailed shipping, CAC, discount, prepaid discount, RTO, and return controls above.
                      These fee rows are listed for reference and can be used if you want me to wire them into the Shopify formula.
                    </p>
                  )}

                  {platform.fees.map((fee) => (
                    <label key={fee.name} className="block">
                      <span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-black uppercase tracking-widest text-[#746e64]">
                        <span>{fee.name}</span>
                        <span>{fee.type === 'percentage' ? '%' : '₹'}</span>
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={fee.value}
                        onChange={(event) => onFeeChange(platform.id, fee.name, Number(event.target.value))}
                        disabled={isShopify}
                        className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-base font-black text-[#171a16] outline-none transition focus:border-[#a83e59] focus:ring-4 focus:ring-[#a83e59]/10 disabled:cursor-not-allowed disabled:bg-[#f3f0ea] disabled:text-[#8a8378]"
                      />
                      <span className="mt-1 block text-xs font-semibold text-[#746e64]">
                        {fee.isGstApplicable ? '18% commission GST is applied on this fee.' : 'No extra commission GST is applied on this fee.'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InputGroup({
  label,
  value,
  onChange,
  icon,
  prefix,
  description,
  highlight
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon: React.ReactNode;
  prefix?: string;
  description?: string;
  highlight?: boolean;
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <label className={`text-sm font-black uppercase tracking-widest transition-colors ${highlight ? 'text-[#171a16]' : 'text-[#746e64] group-focus-within:text-[#171a16]'}`}>
          {label}
        </label>
      </div>
      <div className="relative">
        <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${highlight ? 'text-[#a83e59]' : 'text-[#8a8378] group-focus-within:text-[#a83e59]'}`}>
          {icon}
        </div>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={`w-full rounded-md border py-3 pl-11 pr-4 text-lg font-bold text-[#171a16] outline-none transition-all focus:ring-4 ${
            highlight 
              ? 'border-[#a83e59]/30 bg-[#f7f0f2] focus:border-[#a83e59] focus:ring-[#a83e59]/10' 
              : 'border-black/10 bg-white focus:border-[#a83e59] focus:ring-[#a83e59]/10'
          }`}
        />
        {prefix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-base font-black text-[#8a8378]">{prefix}</span>
          </div>
        )}
      </div>
      {description && (
        <p className="mt-1.5 px-1 text-sm font-medium leading-tight text-[#746e64]">{description}</p>
      )}
    </div>
  );
}

function PlatformCard({ result, index }: { result: CalculationResult; index: number, key?: React.Key }) {
  const isProfit = result.profit > 0;
  const profitGstLabel = 'Our Profit GST';
  const totalDeductions = result.feeBreakdown.reduce((sum, fee) => sum + fee.amount, 0) + result.gstOnFees;
  const profitGstFee = result.feeBreakdown.find((fee) => fee.name.startsWith(profitGstLabel));
  const standardFees = result.feeBreakdown.filter((fee) => !fee.name.startsWith(profitGstLabel));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className="group relative overflow-hidden rounded-lg border border-black/10 bg-[#fffdf8] p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/25 hover:shadow-xl"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-black/10 bg-white p-2 shadow-sm transition-all group-hover:border-black/25">
            {result.logoUrl ? (
              <img src={result.logoUrl} alt={result.platformName} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xl font-black text-gray-900">{result.platformName[0]}</span>
            )}
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-900">{result.platformName}</h3>
            <p className="text-sm font-black uppercase tracking-widest text-[#746e64]">Marketplace</p>
          </div>
        </div>
        <div className="text-right">
           <div className="text-2xl font-black tracking-tight text-[#a83e59]">
             ₹{Math.round(result.sellingPrice).toLocaleString('en-IN')}
           </div>
           <div className="text-sm font-black uppercase tracking-widest text-[#746e64]">
             Sug. Selling Price
           </div>
        </div>
      </div>

      <div className="space-y-4 pt-5 border-t border-black/10">
        <div>
           <div className="rounded-lg border border-black/10 bg-[#f3f0ea] p-3">
              <div className="mb-1 text-sm font-black uppercase tracking-widest text-[#746e64]">Margin</div>
              <div className={`text-xl font-black ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.margin.toFixed(1)}%
              </div>
           </div>
        </div>

        <div className="space-y-2">
          {standardFees.map((fee) => (
            <div key={fee.name} className="flex items-center justify-between gap-4 text-base">
              <span className="font-bold text-[#746e64] uppercase tracking-tighter">{fee.name}</span>
              <span className="font-black text-gray-900">₹{fee.amount.toFixed(0)}</span>
            </div>
          ))}
          {result.gstOnFees > 0 && (
            <div className="flex items-center justify-between gap-4 text-base">
              <span className="font-bold text-[#746e64] uppercase tracking-tighter">GST on Commission (18%)</span>
              <span className="font-black text-gray-900">₹{result.gstOnFees.toFixed(0)}</span>
            </div>
          )}
          {profitGstFee && (
            <div className="flex items-center justify-between gap-4 text-base">
              <span className="font-bold text-[#746e64] uppercase tracking-tighter">{profitGstFee.name}</span>
              <span className="font-black text-gray-900">₹{profitGstFee.amount.toFixed(0)}</span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-black/10 pt-3 text-lg">
            <span className="font-black uppercase tracking-widest text-[#3a3a3a]">Total Deductions</span>
            <span className="font-black text-[#3a3a3a]">₹{Math.round(totalDeductions).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
