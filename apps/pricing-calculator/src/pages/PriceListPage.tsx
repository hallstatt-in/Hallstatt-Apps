import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, List, Search, Loader2, Package, Tag, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculatePlatformResults, ShopifyConfig } from '../lib/calculations';

interface Product {
  sku: string;
  cogs: number;
}

export default function PriceListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Default calculation params (could be made adjustable)
  const [targetProfit, setTargetProfit] = useState(200);
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

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setLoading(false);
      });
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f3f0ea] p-5 font-sans text-[#171a16] md:p-8">
      <header className="mx-auto mb-12 flex max-w-[1500px] flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="rounded-md border border-black/10 bg-white/70 p-2 text-[#4f4f4f] shadow-sm transition-colors hover:bg-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-black uppercase tracking-[0.2em] text-[#3a3a3a]">
              Hallstatt
            </div>
            <div className="h-4 w-px bg-black/15" />
            <h1 className="text-base font-black uppercase tracking-[0.18em] text-[#746e64]">Price List</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 flex-grow w-full">
          <div className="relative lg:col-span-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search SKUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-black/10 bg-[#fffdf8] py-3 pl-12 pr-4 font-medium text-[#171a16] shadow-sm outline-none transition-all focus:border-[#a83e59] focus:ring-4 focus:ring-[#a83e59]/10"
            />
          </div>

          <div className="relative w-full md:w-36">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3a3a3a]">
              <span className="text-base font-black uppercase">#</span>
            </div>
            <input
              type="number"
              placeholder="Orders"
              value={shopifyConfig.shopifyMonthlyOrders}
              onChange={(e) => setShopifyConfig(prev => ({ ...prev, shopifyMonthlyOrders: Number(e.target.value) }))}
              className="w-full rounded-md border border-[#d9d9d9] bg-[#ffffff] py-3 pl-10 pr-4 font-bold text-[#3a3a3a] shadow-sm outline-none transition-all focus:border-[#3a3a3a] focus:ring-4 focus:ring-[#3a3a3a]/10"
            />
            <div className="absolute top-0 -translate-y-1/2 left-4 bg-[#f7f7f7] px-1">
               <span className="text-xs font-black uppercase tracking-widest text-gray-500">Monthly Orders</span>
            </div>
          </div>

          <div className="relative w-full md:w-48">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3a3a3a]">
              <span className="text-base font-black uppercase">₹</span>
            </div>
            <input
              type="number"
              placeholder="Target Profit"
              value={targetProfit}
              onChange={(e) => setTargetProfit(Number(e.target.value))}
              className="w-full rounded-md border border-[#d9d9d9] bg-[#ffffff] py-3 pl-10 pr-4 font-bold text-[#3a3a3a] shadow-sm outline-none transition-all focus:border-[#3a3a3a] focus:ring-4 focus:ring-[#3a3a3a]/10"
            />
            <div className="absolute top-0 -translate-y-1/2 left-4 bg-[#f7f7f7] px-1">
               <span className="text-xs font-black uppercase tracking-widest text-gray-500">Target Profit</span>
            </div>
          </div>
          <div className="relative w-full md:w-32">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3a3a3a]">
              <span className="text-base font-black uppercase">₹</span>
            </div>
            <input
              type="number"
              placeholder="Shipping"
              value={shopifyConfig.shopifyShipping}
              onChange={(e) => setShopifyConfig(prev => ({ ...prev, shopifyShipping: Number(e.target.value) }))}
              className="w-full rounded-md border border-[#d9d9d9] bg-[#ffffff] py-3 pl-10 pr-4 font-bold text-[#3a3a3a] shadow-sm outline-none transition-all focus:border-[#3a3a3a] focus:ring-4 focus:ring-[#3a3a3a]/10"
            />
            <div className="absolute top-0 -translate-y-1/2 left-4 bg-[#f7f7f7] px-1">
               <span className="text-xs font-black uppercase tracking-widest text-gray-500">Shipping</span>
            </div>
          </div>

          <div className="relative w-full md:w-32">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3a3a3a]">
              <span className="text-base font-black uppercase">₹</span>
            </div>
            <input
              type="number"
              placeholder="CAC"
              value={shopifyConfig.shopifyCac}
              onChange={(e) => setShopifyConfig(prev => ({ ...prev, shopifyCac: Number(e.target.value) }))}
              className="w-full rounded-md border border-[#d9d9d9] bg-[#ffffff] py-3 pl-10 pr-4 font-bold text-[#3a3a3a] shadow-sm outline-none transition-all focus:border-[#3a3a3a] focus:ring-4 focus:ring-[#3a3a3a]/10"
            />
            <div className="absolute top-0 -translate-y-1/2 left-4 bg-[#f7f7f7] px-1">
               <span className="text-xs font-black uppercase tracking-widest text-gray-500">CAC</span>
            </div>
          </div>

          <div className="relative w-full md:w-32">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3a3a3a]">
              <span className="text-base font-black uppercase">#</span>
            </div>
            <input
              type="number"
              placeholder="RTO"
              value={shopifyConfig.shopifyRtoOrders}
              onChange={(e) => setShopifyConfig(prev => ({ ...prev, shopifyRtoOrders: Number(e.target.value) }))}
              className="w-full rounded-md border border-[#d9d9d9] bg-[#ffffff] py-3 pl-10 pr-4 font-bold text-[#3a3a3a] shadow-sm outline-none transition-all focus:border-[#3a3a3a] focus:ring-4 focus:ring-[#3a3a3a]/10"
            />
            <div className="absolute top-0 -translate-y-1/2 left-4 bg-[#f7f7f7] px-1">
               <span className="text-xs font-black uppercase tracking-widest text-gray-500">RTO Orders</span>
            </div>
          </div>

          <div className="relative w-full md:w-32">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3a3a3a]">
              <span className="text-base font-black uppercase">#</span>
            </div>
            <input
              type="number"
              placeholder="Return"
              value={shopifyConfig.shopifyReturnOrders}
              onChange={(e) => setShopifyConfig(prev => ({ ...prev, shopifyReturnOrders: Number(e.target.value) }))}
              className="w-full rounded-md border border-[#d9d9d9] bg-[#ffffff] py-3 pl-10 pr-4 font-bold text-[#3a3a3a] shadow-sm outline-none transition-all focus:border-[#3a3a3a] focus:ring-4 focus:ring-[#3a3a3a]/10"
            />
            <div className="absolute top-0 -translate-y-1/2 left-4 bg-[#f7f7f7] px-1">
               <span className="text-xs font-black uppercase tracking-widest text-gray-500">Return Orders</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="text-[#3a3a3a] animate-spin mb-4" />
            <p className="text-base font-bold uppercase tracking-widest text-gray-500">Loading Price Matrix...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-[#fffdf8] p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-md bg-[#3a3a3a] text-white">
              <Package size={40} />
            </div>
            <h2 className="mb-4 text-3xl font-black text-[#3a3a3a]">No products found</h2>
            <p className="mx-auto max-w-md font-medium leading-relaxed text-[#4f4f4f]">
              No uploaded SKU data is available yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const calculations = calculatePlatformResults(product.cogs, targetProfit, shopifyConfig);
                return (
                  <div key={product.sku} className="group relative overflow-hidden rounded-lg border border-black/10 bg-[#fffdf8] p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/25 hover:shadow-xl">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="break-all text-2xl font-black text-[#3a3a3a]">{product.sku}</h3>
                      </div>
                        <div className="rounded-md bg-[#a83e59] p-2 text-white transition-colors">
                        <Tag size={20} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-md border border-black/10 bg-[#f3f0ea] p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-black uppercase tracking-widest text-[#5f5f5f]">Platform Pricing</span>
                          <span className="text-sm font-bold text-[#5f5f5f]">Target: ₹{targetProfit}</span>
                        </div>
                        <div className="space-y-3">
                          {calculations.map(calc => (
                            <div key={calc.platformName} className="flex justify-between items-center group/calc">
                              <div className="flex flex-col">
                                <span className="text-base font-bold uppercase tracking-tight text-[#4f4f4f]">{calc.platformName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-[#3a3a3a]">₹{Math.round(calc.suggestedPrice).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1">
                         <div>
                            <span className="block text-sm font-black uppercase tracking-widest text-[#5f5f5f]">Unit COGS</span>
                            <span className="text-lg font-black text-[#3a3a3a]">₹{product.cogs}</span>
                         </div>
                         <button 
                          onClick={() => navigate('/calculator', { state: { cogs: product.cogs, from: 'price-list' } })}
                          className="flex items-center gap-1.5 rounded-md border border-[#d9d9d9] px-3 py-2 text-sm font-black uppercase tracking-widest text-[#3a3a3a] transition hover:border-[#3a3a3a]"
                         >
                           View Details
                           <ArrowUpRight size={12} />
                         </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 font-bold">No SKUs match your search.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
