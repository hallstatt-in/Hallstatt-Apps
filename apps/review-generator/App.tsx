
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ReviewGeneratorService, LanguageMode, AIProvider } from './geminiService';
import { ReviewData } from './types';
import { 
  getRandomDate, 
  getRandomItem, 
  generateTargetedRatings, 
  generateBalancedVerifiedValues,
  formatForExcelTSV, 
  formatForExcelHTML,
  generateEmail
} from './utils';
import { INDIAN_MALE_NAMES, INDIAN_STATES, INDIAN_CITIES } from './constants';

type LocationMode = 'states' | 'cities' | 'both';

const App: React.FC = () => {
  const [urlsInput, setUrlsInput] = useState('');
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [totalInQueue, setTotalInQueue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Configuration settings
  const [minReviews, setMinReviews] = useState(25);
  const [maxReviews, setMaxReviews] = useState(50);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('hinglish');
  const [provider, setProvider] = useState<AIProvider>('openrouter');
  
  // Defaulting to 80% English and 20% Hindi as requested
  const [englishPercent, setEnglishPercent] = useState(80);
  
  const [locationMode, setLocationMode] = useState<LocationMode>('states');
  const [generateVerified, setGenerateVerified] = useState(true);
  const [generateEmailOpt, setGenerateEmailOpt] = useState(true);

  const stopRequested = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wakeLockRef = useRef<any>(null);
  const reviewService = useMemo(() => new ReviewGeneratorService(), []);

  const acquireWakeLock = async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<any> };
      };
      if (!nav.wakeLock || wakeLockRef.current) return;
      wakeLockRef.current = await nav.wakeLock.request('screen');
    } catch {
      // Wake Lock is best-effort and not supported everywhere.
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && isGenerating) {
        void acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isGenerating]);

  const handleStartOrResume = async () => {
    let urlsToProcess = [...pendingUrls];
    
    if (urlsToProcess.length === 0) {
      const lines = urlsInput.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length === 0) {
        setError("Please enter at least one product URL.");
        return;
      }
      urlsToProcess = lines;
      setTotalInQueue(lines.length);
      setPendingUrls(lines);
    }

    if (minReviews > maxReviews) {
      setError("Min count cannot be greater than Max count.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCopySuccess(false);
    stopRequested.current = false;
    abortControllerRef.current = new AbortController();
    void acquireWakeLock();

    const workingQueue = [...urlsToProcess];
    try {
      while (workingQueue.length > 0) {
        if (stopRequested.current) break;

        const url = workingQueue[0];
        setCurrentUrl(url);
        
        const count = Math.floor(Math.random() * (maxReviews - minReviews + 1)) + minReviews; 
        const ratings = generateTargetedRatings(count);
        const verifiedValues = generateVerified ? generateBalancedVerifiedValues(count) : [];
        
        try {
          let totalGeneratedCount = 0;
          const emittedIndexes = new Set<number>();
          await reviewService.generateReviews({
            url,
            count,
            languageMode,
            englishPercentage: languageMode === 'hinglish' ? englishPercent : 100,
            provider,
            signal: abortControllerRef.current?.signal,
            onChunk: (chunkTexts, startIndex) => {
              if (stopRequested.current || abortControllerRef.current?.signal.aborted) return;

              const newReviews: ReviewData[] = [];
              chunkTexts.forEach((text, localIndex) => {
                const globalIndex = startIndex + localIndex;
                if (globalIndex >= count || emittedIndexes.has(globalIndex)) return;

                emittedIndexes.add(globalIndex);
                const state = getRandomItem(INDIAN_STATES);
                const city = getRandomItem(INDIAN_CITIES);
                const name = getRandomItem(INDIAN_MALE_NAMES);
                let location = "";

                if (locationMode === 'both') location = `${city}, ${state}`;
                else if (locationMode === 'cities') location = city;
                else location = state;

                newReviews.push({
                  url,
                  review: text,
                  starRating: ratings[globalIndex] || 5,
                  name: name,
                  email: generateEmailOpt ? generateEmail(name) : '',
                  location,
                  date: getRandomDate(),
                  isVerified: generateVerified ? (verifiedValues[globalIndex] || 'FALSE') : ''
                });
              });

              if (newReviews.length > 0) {
                totalGeneratedCount += newReviews.length;
                setReviews(prev => [...prev, ...newReviews]);
              }
            }
          });
          
          if (stopRequested.current) break;
          if (abortControllerRef.current?.signal.aborted) break;

          if (totalGeneratedCount === 0) {
            setError(`Skipped one URL: model did not return valid reviews.`);
            workingQueue.shift();
            setPendingUrls([...workingQueue]);
            continue;
          }
          
          workingQueue.shift();
          setPendingUrls([...workingQueue]);
        } catch (apiErr) {
          if (abortControllerRef.current?.signal.aborted || stopRequested.current) {
            break;
          }
          console.error("Skipping URL after unexpected failure:", url, apiErr);
          setError(`Skipped one URL due to an unexpected error. Continuing remaining queue.`);
          workingQueue.shift();
          setPendingUrls([...workingQueue]);
          continue; 
        }
      }

      if (workingQueue.length === 0 && !stopRequested.current) {
        setUrlsInput('');
        setTotalInQueue(0);
        setPendingUrls([]);
      }
    } finally {
      setIsGenerating(false);
      setCurrentUrl(null);
      stopRequested.current = false;
      abortControllerRef.current = null;
      void releaseWakeLock();
    }
  };

  const handleStop = () => {
    stopRequested.current = true;
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (reviews.length === 0) return;
    const tsvData = formatForExcelTSV(reviews);
    const htmlData = formatForExcelHTML(reviews);
    try {
      const blobText = new Blob([tsvData], { type: 'text/plain' });
      const blobHtml = new Blob([htmlData], { type: 'text/html' });
      const clipboardData = [new ClipboardItem({ 'text/plain': blobText, 'text/html': blobHtml })];
      await navigator.clipboard.write(clipboardData);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      await navigator.clipboard.writeText(tsvData);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const stats = useMemo(() => {
    if (reviews.length === 0) return null;
    const avg = reviews.reduce((acc, r) => acc + r.starRating, 0) / reviews.length;
    return { total: reviews.length, average: avg.toFixed(1) };
  }, [reviews]);

  const isResumable = pendingUrls.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 bg-slate-50 min-h-screen">
      <header className="mb-12 text-center">
        <h1 className="text-6xl font-black text-slate-900 mb-3 tracking-tighter">
          <span className="text-indigo-600">SMART</span> REVIEWER
        </h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.25em] text-[10px]">
          Batch Processing • Romanized Hinglish Mix • Verified Context
        </p>
      </header>

      <div className="flex flex-col gap-6 mb-12">
        
        {/* URL Input */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target URLs</label>
            {isResumable && !isGenerating && (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                <i className="fa-solid fa-hourglass-half"></i>
                {pendingUrls.length} Remaining in queue
              </div>
            )}
          </div>
          <textarea
            className={`block w-full px-8 py-6 border-2 rounded-[2rem] leading-relaxed bg-slate-50 placeholder-slate-300 focus:outline-none transition-all min-h-[140px] text-xl font-bold text-slate-700 ${isResumable ? 'border-amber-200 focus:border-amber-400' : 'border-slate-100 focus:border-indigo-500'}`}
            placeholder="Paste your product links (one per line)..."
            value={urlsInput}
            onChange={(e) => {
              setUrlsInput(e.target.value);
              if (pendingUrls.length > 0) setPendingUrls([]); 
            }}
            disabled={isGenerating}
          />
        </div>

        {/* Config Panel */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-10 border-b border-slate-50 pb-6">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-sliders text-xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Generation Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-12">
            
            {/* Quantity */}
            <div className="space-y-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Review Quantity</label>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div className="flex-1 text-center">
                  <span className="block text-[8px] text-slate-400 font-black mb-1">MIN</span>
                  <input 
                    type="number" value={minReviews}
                    onChange={(e) => setMinReviews(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent font-black text-xl text-slate-800 focus:outline-none text-center"
                    disabled={isGenerating}
                  />
                </div>
                <div className="h-8 w-[2px] bg-slate-200"></div>
                <div className="flex-1 text-center">
                  <span className="block text-[8px] text-slate-400 font-black mb-1">MAX</span>
                  <input 
                    type="number" value={maxReviews}
                    onChange={(e) => setMaxReviews(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent font-black text-xl text-slate-800 focus:outline-none text-center"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            {/* Language Logic */}
            <div className="space-y-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Language Mode</label>
              <div className="flex flex-col gap-4">
                {[
                  { id: 'english', label: '100% English' },
                  { id: 'hinglish', label: 'Hinglish (Mix)' }
                ].map((l) => (
                  <label key={l.id} className="flex items-center gap-4 cursor-pointer group">
                    <input 
                      type="radio" name="lang" value={l.id}
                      checked={languageMode === l.id}
                      onChange={() => setLanguageMode(l.id as LanguageMode)}
                      disabled={isGenerating}
                      className="w-6 h-6 border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 rounded-full"
                    />
                    <span className="text-sm font-black text-slate-600 group-hover:text-indigo-600 transition-colors">{l.label}</span>
                  </label>
                ))}
              </div>
              
              {languageMode === 'hinglish' && (
                <div className="mt-6 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between text-[10px] font-black uppercase text-indigo-500">
                    <span>English {englishPercent}%</span>
                    <span>Hindi {100 - englishPercent}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="5"
                    value={englishPercent}
                    onChange={(e) => setEnglishPercent(parseInt(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-indigo-200 rounded-full"
                    disabled={isGenerating}
                  />
                </div>
              )}
            </div>

            {/* AI Provider */}
            <div className="space-y-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">AI Provider</label>
              <div className="flex flex-col gap-4">
                {[
                  { id: 'openai', label: 'OpenAI (ChatGPT API)' },
                  { id: 'openrouter', label: 'OpenRouter (Free Route)' }
                ].map((p) => (
                  <label key={p.id} className="flex items-center gap-4 cursor-pointer group">
                    <input
                      type="radio"
                      name="provider"
                      value={p.id}
                      checked={provider === p.id}
                      onChange={() => setProvider(p.id as AIProvider)}
                      disabled={isGenerating}
                      className="w-6 h-6 border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 rounded-full"
                    />
                    <span className="text-sm font-black text-slate-600 group-hover:text-indigo-600 transition-colors">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Advanced Field Toggles */}
            <div className="space-y-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Optional Fields</label>
              <div className="flex flex-col gap-6">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={generateVerified}
                      onChange={(e) => setGenerateVerified(e.target.checked)}
                      disabled={isGenerating}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                  <span className="text-sm font-black text-slate-600 group-hover:text-indigo-600 transition-colors">Verified Badge</span>
                </label>

                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={generateEmailOpt}
                      onChange={(e) => setGenerateEmailOpt(e.target.checked)}
                      disabled={isGenerating}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
                  <span className="text-sm font-black text-slate-600 group-hover:text-indigo-600 transition-colors">Customer Email</span>
                </label>

                <div className="pt-4 border-t border-slate-50">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-4">Location Detail</label>
                  <div className="flex flex-col gap-3">
                    {[
                      { id: 'states', label: 'States' },
                      { id: 'cities', label: 'Cities' },
                      { id: 'both', label: 'City, State' }
                    ].map((loc) => (
                      <label key={loc.id} className="flex items-center gap-4 cursor-pointer group">
                        <input 
                          type="radio" name="loc" value={loc.id}
                          checked={locationMode === loc.id}
                          onChange={() => setLocationMode(loc.id as LocationMode)}
                          disabled={isGenerating}
                          className="w-4 h-4 border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 rounded-full"
                        />
                        <span className="text-[11px] font-black text-slate-500 group-hover:text-indigo-600 transition-colors">{loc.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-end gap-4">
              {!isGenerating ? (
                <button
                  onClick={handleStartOrResume}
                  className={`w-full py-6 rounded-[1.5rem] font-black shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 ${isResumable ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'}`}
                >
                  <i className={`fa-solid ${isResumable ? 'fa-play' : 'fa-bolt-lightning'} text-lg`}></i>
                  <span className="text-lg uppercase tracking-tight">{isResumable ? 'RESUME BATCH' : 'LAUNCH BATCH'}</span>
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="w-full py-6 bg-rose-500 hover:bg-rose-600 text-white rounded-[1.5rem] font-black shadow-2xl shadow-rose-100 transition-all flex items-center justify-center gap-4"
                >
                  <i className="fa-solid fa-stop-circle text-xl animate-pulse"></i>
                  <span className="text-lg uppercase tracking-tight">HALT BATCH</span>
                </button>
              )}
              {reviews.length > 0 && !isGenerating && (
                <button
                  onClick={() => { setReviews([]); setPendingUrls([]); setTotalInQueue(0); setUrlsInput(''); }}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {isGenerating && (
            <div className="mt-12 flex items-center gap-8 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl">
              <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white">
                <i className="fa-solid fa-sync animate-spin text-3xl"></i>
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Processing</span>
                  <span className="text-white font-black text-sm">
                    {totalInQueue - pendingUrls.length + 1} / {totalInQueue}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-700" 
                    style={{ width: `${((totalInQueue - pendingUrls.length) / totalInQueue) * 100}%` }}
                  ></div>
                </div>
                <div className="mt-3 text-[10px] text-slate-500 font-bold truncate">
                  Active: {currentUrl}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Dashboard */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Total Generated</span>
            <span className="text-5xl font-black text-slate-900 tracking-tighter">{stats?.total}</span>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Avg Rating</span>
            <div className="flex items-center gap-4">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">{stats?.average}</span>
              <i className="fa-solid fa-star text-amber-400 text-3xl"></i>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className={`p-8 rounded-[2.5rem] font-black flex flex-col items-center justify-center gap-2 transition-all transform hover:-translate-y-2 shadow-2xl
              ${copySuccess ? 'bg-green-50 text-white' : 'bg-slate-900 text-white'}`}
          >
            <i className={`fa-solid ${copySuccess ? 'fa-check-double' : 'fa-copy'} text-3xl mb-1`}></i>
            <span className="text-xl uppercase tracking-tight">{copySuccess ? 'COPIED FOR EXCEL' : 'EXPORT DATA'}</span>
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200 mb-20">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                <th className="px-6 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Feedback</th>
                <th className="px-6 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Stars</th>
                <th className="px-6 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Verified</th>
                <th className="px-6 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-8 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-40 text-center text-slate-300">
                    <div className="flex flex-col items-center opacity-20 grayscale">
                       <i className="fa-solid fa-database text-9xl mb-8"></i>
                       <p className="text-2xl font-black uppercase tracking-widest">No Data Generated</p>
                    </div>
                  </td>
                </tr>
              ) : (
                [...reviews].reverse().map((item, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="px-6 py-8 whitespace-nowrap">
                      <div className="text-[9px] text-indigo-400 font-black truncate max-w-[100px] opacity-30 group-hover:opacity-100 transition-opacity" title={item.url}>
                        {item.url}
                      </div>
                    </td>
                    <td className="px-6 py-8">
                      <div className="text-base text-slate-700 leading-relaxed min-w-[300px] font-bold">
                        {item.review}
                      </div>
                    </td>
                    <td className="px-6 py-8 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center text-slate-900 font-black text-xl gap-2">
                        {item.starRating} <i className="fa-solid fa-star text-amber-400 text-[10px]"></i>
                      </div>
                    </td>
                    <td className="px-6 py-8 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{item.name}</span>
                        {item.email && <span className="text-[10px] text-slate-400 font-mono lowercase">{item.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-8 whitespace-nowrap text-center">
                      {item.isVerified ? (
                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${item.isVerified === 'TRUE' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {item.isVerified === 'TRUE' ? 'TRUE' : 'FALSE'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-200">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-8 whitespace-nowrap text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {item.location}
                    </td>
                    <td className="px-6 py-8 whitespace-nowrap text-[10px] text-slate-300 font-black font-mono">
                      {item.date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <footer className="mt-32 text-center pb-24 opacity-20 grayscale">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[1.5em] leading-loose">
          INTEL BATCH REVIEW SYSTEM &bull; ROMANIZED HINDI OUTPUT
        </p>
      </footer>
    </div>
  );
};

export default App;
