import React, { useEffect, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, LockKeyhole, Pencil, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  sku: string;
  cogs: number;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingSku, setEditingSku] = useState('');
  const [draftCogs, setDraftCogs] = useState('');
  const [savingSku, setSavingSku] = useState('');

  const readJsonResponse = async (response: Response) => {
    const text = await response.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  };

  useEffect(() => {
    fetch('/api/admin/session')
      .then(readJsonResponse)
      .then((data) => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingSession(false));
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);

    try {
      const response = await fetch('/api/products');
      const data = await readJsonResponse(response);

      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to load product costs' });
        return;
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Failed to load product costs' });
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchProducts();
    }
  }, [authenticated]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        setLoginError(data.error || `Login failed (${response.status})`);
        return;
      }

      setAuthenticated(true);
    } catch (error: any) {
      setLoginError(error?.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-cogs', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      if (response.ok) {
        setStatus({ type: 'success', message: data.message });
        await fetchProducts();
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to upload' });
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Network error occurred' });
    } finally {
      setUploading(false);
    }
  };

  const startEditing = (product: Product) => {
    setEditingSku(product.sku);
    setDraftCogs(String(product.cogs));
    setStatus(null);
  };

  const cancelEditing = () => {
    setEditingSku('');
    setDraftCogs('');
  };

  const saveCogs = async (sku: string) => {
    const nextCogs = Number(draftCogs);

    if (!Number.isFinite(nextCogs) || nextCogs < 0) {
      setStatus({ type: 'error', message: 'Enter a valid COGS value.' });
      return;
    }

    setSavingSku(sku);
    setStatus(null);

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(sku)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cogs: nextCogs }),
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to update COGS' });
        return;
      }

      setProducts((current) => current.map((product) => (product.sku === sku ? data.product : product)));
      setStatus({ type: 'success', message: `Updated ${sku}` });
      cancelEditing();
    } catch (error: any) {
      setStatus({ type: 'error', message: error?.message || 'Failed to update COGS' });
    } finally {
      setSavingSku('');
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#171a16] text-white">
        <Loader2 className="animate-spin" size={26} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#171a16] px-5 text-white">
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg border border-white/10 bg-[#fffdf8] p-6 text-[#171a16] shadow-2xl"
        >
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-md bg-[#f7f0f2] text-[#a83e59]">
            <LockKeyhole size={22} />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Admin login</h1>
          <p className="mt-2 text-base font-medium leading-6 text-[#6b6b6b]">Restricted SKU upload workspace.</p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="text-base font-black uppercase tracking-[0.18em] text-[#6b6b6b]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#d9d9d9] bg-white px-3 py-3 text-lg font-bold text-[#3a3a3a] outline-none transition focus:border-[#3a3a3a]"
                autoComplete="current-password"
                autoFocus
              />
            </label>
          </div>

          {loginError && <div className="mt-4 rounded-md bg-red-500/10 p-3 text-base font-bold text-red-700">{loginError}</div>}

          <button
            type="submit"
            disabled={loggingIn}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[#3a3a3a] px-4 py-3 text-base font-black uppercase tracking-[0.16em] text-white transition hover:bg-black disabled:opacity-60"
          >
            {loggingIn && <Loader2 size={16} className="animate-spin" />}
            Login
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171a16] px-5 py-8 text-[#fffaf1]">
      <main className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-white/10 pb-6">
          <div className="text-base font-black uppercase tracking-[0.22em] text-white/70">Hallstatt Admin</div>
          <h1 className="mt-2 text-4xl font-black tracking-tight">COGS upload desk</h1>
        </header>

        <section className="rounded-lg border border-white/10 bg-[#fffdf8] p-6 text-[#171a16] md:p-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#f7f7f7] text-[#3a3a3a]">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-black">Upload product costs</h2>
              <p className="text-base font-medium text-[#6b6b6b]">CSV columns required: sku, cogs.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`rounded-lg border border-dashed p-10 text-center transition ${file ? 'border-[#3a3a3a] bg-gray-50' : 'border-[#d9d9d9] hover:border-[#3a3a3a]'}`}>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="flex cursor-pointer flex-col items-center gap-3">
                <FileText size={38} className={file ? 'text-[#3a3a3a]' : 'text-[#6b6b6b]'} />
                <span className="text-base font-black">{file ? file.name : 'Choose CSV file'}</span>
                <span className="text-base font-bold uppercase tracking-[0.16em] text-[#6b6b6b]">
                  {file ? `${(file.size / 1024).toFixed(2)} KB` : '.csv only'}
                </span>
              </label>
            </div>

            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-3 rounded-md p-4 text-base font-bold ${
                    status.type === 'success' ? 'bg-emerald-400/10 text-emerald-700' : 'bg-red-400/10 text-red-700'
                  }`}
                >
                  {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {status.message}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#3a3a3a] px-4 py-4 text-base font-black uppercase tracking-[0.16em] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? 'Processing' : 'Start upload'}
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-white/10 bg-[#fffdf8] p-6 text-[#171a16] md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black">Edit uploaded costs</h2>
              <p className="text-base font-medium text-[#6b6b6b]">Update COGS values for SKUs already synced from CSV.</p>
            </div>
            <button
              type="button"
              onClick={fetchProducts}
              disabled={loadingProducts}
              className="flex items-center justify-center gap-2 rounded-md border border-[#d9d9d9] px-4 py-3 text-base font-black uppercase tracking-[0.14em] text-[#3a3a3a] transition hover:border-[#3a3a3a] disabled:opacity-50"
            >
              {loadingProducts && <Loader2 size={16} className="animate-spin" />}
              Refresh
            </button>
          </div>

          {loadingProducts ? (
            <div className="flex items-center justify-center gap-3 rounded-md border border-[#d9d9d9] p-8 text-base font-bold text-[#6b6b6b]">
              <Loader2 size={18} className="animate-spin" />
              Loading uploaded SKUs
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-md border border-[#d9d9d9] p-8 text-center text-base font-bold text-[#6b6b6b]">
              No uploaded SKU data found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-[#d9d9d9]">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead className="bg-[#f7f7f7] text-sm font-black uppercase tracking-[0.16em] text-[#6b6b6b]">
                  <tr>
                    <th className="border-b border-[#d9d9d9] px-4 py-3">SKU</th>
                    <th className="border-b border-[#d9d9d9] px-4 py-3">COGS</th>
                    <th className="border-b border-[#d9d9d9] px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isEditing = editingSku === product.sku;
                    const isSaving = savingSku === product.sku;

                    return (
                      <tr key={product.sku} className="border-b border-[#ececec] last:border-b-0">
                        <td className="max-w-[360px] break-all px-4 py-3 text-base font-black">{product.sku}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draftCogs}
                              onChange={(event) => setDraftCogs(event.target.value)}
                              className="w-40 rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-base font-black text-[#3a3a3a] outline-none transition focus:border-[#3a3a3a]"
                            />
                          ) : (
                            <span className="text-base font-black">₹{product.cogs}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveCogs(product.sku)}
                                  disabled={isSaving}
                                  className="flex h-10 w-10 items-center justify-center rounded-md bg-[#3a3a3a] text-white transition hover:bg-black disabled:opacity-50"
                                  aria-label={`Save ${product.sku}`}
                                >
                                  {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  disabled={isSaving}
                                  className="flex h-10 w-10 items-center justify-center rounded-md border border-[#d9d9d9] text-[#3a3a3a] transition hover:border-[#3a3a3a] disabled:opacity-50"
                                  aria-label={`Cancel editing ${product.sku}`}
                                >
                                  <X size={17} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditing(product)}
                                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#d9d9d9] text-[#3a3a3a] transition hover:border-[#3a3a3a]"
                                aria-label={`Edit ${product.sku}`}
                              >
                                <Pencil size={17} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
