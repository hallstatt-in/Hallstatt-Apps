import React, { useMemo, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sticker } from './components/Sticker';
import { StickerData, DEFAULT_STICKER } from './types';

const SIZE_OPTIONS = {
  tops: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
  bottoms: ['30', '32', '34', '36', '38', '40'],
} as const;

type ApparelType = keyof typeof SIZE_OPTIONS;

export default function App() {
  const [stickers, setStickers] = useState<StickerData[]>([
    { ...DEFAULT_STICKER, id: crypto.randomUUID() }
  ]);
  const [apparelType, setApparelType] = useState<ApparelType>('tops');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['S']);
  const [isPrinting, setIsPrinting] = useState(false);

  const availableSizes = SIZE_OPTIONS[apparelType];
  const generatedStickers = useMemo(
    () =>
      stickers.flatMap((sticker) =>
        selectedSizes.map((size) => ({
          ...sticker,
          id: `${sticker.id}-${size}`,
          size,
        }))
      ),
    [selectedSizes, stickers]
  );

  const updateSticker = (id: string, field: keyof StickerData, value: string) => {
    setStickers(stickers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((currentSizes) =>
      currentSizes.includes(size)
        ? currentSizes.filter((currentSize) => currentSize !== size)
        : [...currentSizes, size]
    );
  };

  const changeApparelType = (nextType: ApparelType) => {
    setApparelType(nextType);
    setSelectedSizes([SIZE_OPTIONS[nextType][0]]);
  };

  const printStickerImages = async () => {
    if (generatedStickers.length === 0) {
      return;
    }
    const printRoot = document.getElementById('print-root');
    if (!printRoot) {
      return;
    }

    const printModeClass = 'printing-stickers';
    const finishPrint = () => {
      document.body.classList.remove(printModeClass);
      setIsPrinting(false);
    };

    setIsPrinting(true);
    try {
      if ('fonts' in document) {
        await document.fonts.ready;
      }

      const waitForImages = Promise.all(
        Array.from(printRoot.querySelectorAll('img')).map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            image.onload = () => resolve(undefined);
            image.onerror = () => resolve(undefined);
          });
        })
      );
      await waitForImages;

      document.body.classList.add(printModeClass);

      const handleAfterPrint = () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        finishPrint();
      };
      window.addEventListener('afterprint', handleAfterPrint);

      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

      window.focus();
      window.print();
    } catch (error) {
      console.error('Print error:', error);
      finishPrint();
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <style>{`
        @media print {
          @page {
            size: 40mm 60mm;
            margin: 0;
          }
          body.printing-stickers {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body.printing-stickers .print-hide {
            display: none !important;
          }
          body.printing-stickers #print-root {
            display: block !important;
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 40mm !important;
            pointer-events: none !important;
          }
          body.printing-stickers #print-root .print-page {
            width: 40mm !important;
            height: 60mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            break-after: page;
            page-break-after: always;
            background: #ffffff !important;
          }
          body.printing-stickers #print-root .print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          body.printing-stickers #print-root .print-page > div {
            width: 40mm !important;
            height: 60mm !important;
            min-width: 40mm !important;
            min-height: 60mm !important;
            max-width: 40mm !important;
            max-height: 60mm !important;
          }
          body.printing-stickers #print-root p {
            margin: 0 !important;
          }
        }
      `}</style>
      {/* Header */}
      <header className="print-hide bg-white border-b border-[#e4e4e7] px-4 py-4 sticky top-0 z-10 shadow-sm sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-[#18181b] rounded-lg flex items-center justify-center">
              <Printer className="text-white w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">Hallstatt Sticker Creator</h1>
              <p className="text-xs text-[#71717a] font-medium leading-snug">Professional Label Management System</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={printStickerImages}
              disabled={isPrinting || generatedStickers.length === 0}
              className="flex w-full items-center justify-center gap-2 px-6 py-2 bg-[#18181b] text-white rounded-lg text-sm font-semibold hover:bg-[#27272a] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
            >
              {isPrinting ? <RefreshCw size={18} className="animate-spin" /> : <Printer size={18} />}
              {isPrinting ? 'Preparing...' : 'Print'}
            </button>
          </div>
        </div>
      </header>

      <main className="print-hide flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Editor List */}
        <div className="space-y-6">
          <div className="bg-white border border-[#e4e4e7] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#71717a]">Tops & Bottoms</h2>
              <p className="text-sm text-[#71717a]">
                Select the category and sizes to generate one sticker per selected size.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => changeApparelType('tops')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  apparelType === 'tops'
                    ? 'bg-[#18181b] text-white border-[#18181b]'
                    : 'bg-[#fafafa] text-[#3f3f46] border-[#e4e4e7] hover:bg-white'
                }`}
              >
                Tops
              </button>
              <button
                type="button"
                onClick={() => changeApparelType('bottoms')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  apparelType === 'bottoms'
                    ? 'bg-[#18181b] text-white border-[#18181b]'
                    : 'bg-[#fafafa] text-[#3f3f46] border-[#e4e4e7] hover:bg-white'
                }`}
              >
                Bottoms
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a]">Select Sizes</p>
              <div className="flex flex-wrap gap-3">
                {availableSizes.map((size) => {
                  const isSelected = selectedSizes.includes(size);

                  return (
                    <label
                      key={size}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#18181b] text-white border-[#18181b]'
                          : 'bg-white text-[#3f3f46] border-[#e4e4e7] hover:bg-[#fafafa]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSize(size)}
                        className="h-4 w-4 rounded border-[#d4d4d8]"
                      />
                      <span>{size}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-[#71717a]">
                {generatedStickers.length === 0
                  ? 'Select at least one size to generate stickers.'
                  : `${selectedSizes.length} size${selectedSizes.length > 1 ? 's' : ''} selected. ${generatedStickers.length} sticker${generatedStickers.length > 1 ? 's' : ''} will be generated.`}
              </p>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {stickers.map((sticker, index) => (
              <motion.div
                key={sticker.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-[#e4e4e7] rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="bg-[#fafafa] px-6 py-3 border-b border-[#e4e4e7] flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#a1a1aa]">Template #{index + 1}</span>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#71717a] mb-1.5">Price (₹)</label>
                      <input 
                        type="text" 
                        value={sticker.price}
                        onChange={(e) => updateSticker(sticker.id, 'price', e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-sm focus:ring-2 focus:ring-[#18181b] focus:border-transparent outline-none transition-all"
                        placeholder="1499"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#71717a] mb-1.5">Colour</label>
                      <input 
                        type="text" 
                        value={sticker.colour}
                        onChange={(e) => updateSticker(sticker.id, 'colour', e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-sm focus:ring-2 focus:ring-[#18181b] focus:border-transparent outline-none transition-all"
                        placeholder="Nautical Blue"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#71717a] mb-1.5">Style ID</label>
                      <input 
                        type="text" 
                        value={sticker.style}
                        onChange={(e) => updateSticker(sticker.id, 'style', e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-sm focus:ring-2 focus:ring-[#18181b] focus:border-transparent outline-none transition-all"
                        placeholder="HL-PL-26-004"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#71717a] mb-1.5">Generated Sizes</label>
                      <div className="w-full px-4 py-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-sm text-[#3f3f46] min-h-[44px] flex items-center">
                        {selectedSizes.length > 0 ? selectedSizes.join(', ') : 'No size selected'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-[#71717a] mb-1.5">Barcode Override</label>
                      <input 
                        type="text" 
                        value={sticker.barcode}
                        onChange={(e) => updateSticker(sticker.id, 'barcode', e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xl text-sm focus:ring-2 focus:ring-[#18181b] focus:border-transparent outline-none transition-all"
                        placeholder="Leave blank to use Style ID"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Live Preview Sidebar */}
        <div className="relative">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#a1a1aa]">Live Preview</h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Real-time</span>
            </div>
            
            <div className="bg-[#e4e4e7] rounded-2xl p-4 flex justify-center min-h-[700px] overflow-auto shadow-inner border border-[#d4d4d8]">
              <div className="flex flex-col items-center gap-3 py-4">
                {generatedStickers.map(sticker => (
                  <div key={sticker.id} className="relative flex flex-col items-center">
                    <div
                      className="relative overflow-hidden"
                      style={{ width: '80mm', height: '120mm' }}
                    >
                      <div
                        className="origin-top-left transition-transform"
                        style={{ transform: 'scale(2)' }}
                      >
                        <Sticker data={sticker} id={`sticker-${sticker.id}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-[#e4e4e7] shadow-sm">
              <p className="text-[10px] text-[#71717a] leading-relaxed">
                <span className="font-bold text-[#18181b]">Pro Tip:</span> Each selected size creates its own sticker and uses that size value in the sticker artwork.
              </p>
            </div>
          </div>
        </div>
      </main>

      <div id="print-root" aria-hidden="true" className="pointer-events-none fixed -left-[9999px] top-0">
        {generatedStickers.map((sticker) => (
          <div key={sticker.id} className="print-page bg-white">
            <Sticker data={sticker} id={`export-sticker-${sticker.id}`} />
          </div>
        ))}
      </div>

      <footer className="print-hide bg-white border-t border-[#e4e4e7] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <p className="text-xs text-[#a1a1aa]">© 2024 Hallstatt Apparel. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4d4d8]">Precision</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4d4d8]">Quality</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#d4d4d8]">Style</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
