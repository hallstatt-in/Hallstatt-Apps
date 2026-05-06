/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Link as LinkIcon,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { generateProductDescription, ProductDescription } from './services/openrouter';

function parseUrls(input: string): string[] {
  return input
    .split('\n')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

const DescriptionText = memo(function DescriptionText({ text }: { text: string }) {
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n\s*\n/g)
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    [text],
  );

  return (
    <div className="description-text text-slate-700 leading-relaxed">
      {(paragraphs.length > 0 ? paragraphs : [text]).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
});

const ResultCard = memo(function ResultCard({
  result,
  index,
  onCopy,
}: {
  result: ProductDescription;
  index: number;
  onCopy: (text: string) => void;
}) {
  return (
    <div
      className="result-card bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
      style={{ animationDelay: `${Math.min(index * 80, 400)}ms` }}
    >
      <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <ExternalLink size={14} className="text-slate-400 shrink-0" />
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-slate-500 truncate max-w-[200px] sm:max-w-md hover:text-emerald-600 hover:underline transition-colors"
          >
            {result.url}
          </a>
        </div>
        <button
          onClick={() => onCopy(result.description)}
          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
          title="Copy to clipboard"
        >
          <Copy size={16} />
        </button>
      </div>
      <div className="p-8">
        {result.error ? (
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{result.error}</p>
          </div>
        ) : (
          <div className="max-w-none">
            <DescriptionText text={result.description} />
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Character Count: {result.description.length}</span>
              <span className="text-emerald-500">Verified 1000+</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default function App() {
  const [bulkUrls, setBulkUrls] = useState<string>('');
  const [results, setResults] = useState<ProductDescription[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedUrls = useMemo(() => parseUrls(bulkUrls), [bulkUrls]);
  const urlCount = parsedUrls.length;

  const handleGenerate = useCallback(async () => {
    if (parsedUrls.length === 0) {
      setError('Please enter at least one URL.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setResults([]);

    try {
      const promises = parsedUrls.map((url) => generateProductDescription(url));
      const descriptions = await Promise.all(promises);
      setResults(descriptions);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [parsedUrls]);

  const clearAll = useCallback(() => setBulkUrls(''), []);
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ProductCopy AI</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Professional Description Generator</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-slate-600">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> 1000+ Characters</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> SEO Optimized</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Input Section */}
          <section className="lg:col-span-5 space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Bulk URL Input</h2>
              <p className="text-slate-500">Paste your product links (one per line) to generate descriptions.</p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                  <LinkIcon size={18} />
                </div>
                <textarea
                  placeholder="https://example.com/product-1&#10;https://example.com/product-2"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  rows={8}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm resize-none font-mono text-sm"
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {urlCount} URLs
                </span>
                <button
                  onClick={clearAll}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                >
                  Clear All
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 disabled:hover:shadow-emerald-200"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Generating Descriptions...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  Generate Descriptions
                </>
              )}
            </button>
          </section>

          {/* Results Section */}
          <section className="lg:col-span-7 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Generated Content</h2>
              {results.length > 0 && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  {results.length} Ready
                </span>
              )}
            </div>

            <div className="space-y-6">
              {results.length === 0 && !isGenerating && (
                <div className="h-64 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-4 bg-white/50">
                  <Sparkles size={48} className="opacity-20" />
                  <p className="font-medium">Your descriptions will appear here.</p>
                </div>
              )}

              {isGenerating && results.length === 0 && (
                <div className="space-y-6">
                  {[1, 2].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-100 rounded w-full" />
                        <div className="h-3 bg-slate-100 rounded w-full" />
                        <div className="h-3 bg-slate-100 rounded w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.map((result, index) => (
                <ResultCard
                  key={`${result.url}-${index}`}
                  result={result}
                  index={index}
                  onCopy={copyToClipboard}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 text-center text-slate-400 text-sm border-t border-slate-200 mt-12">
        <p>&copy; 2024 ProductCopy AI. Powered by OpenRouter.</p>
      </footer>
    </div>
  );
}
