import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  CheckCheck, 
  UploadCloud, 
  CheckCircle2, 
  HelpCircle,
  Settings,
  Lock,
  Unlock,
  ShieldAlert,
  RotateCcw,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  getSupabaseDiagnostics,
  pushLocalDataToSupabase,
  isSupabaseConfigured,
  TableDiagnostic
} from '../utils/supabase';
import { KasTransaction, AsetTabungan, DebtRecord } from '../types/finance';
import { exportTransactionsCSV, exportAsetCSV, exportDebtsCSV } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
  transactions: KasTransaction[];
  asetList: AsetTabungan[];
  debts: DebtRecord[];
  onResetData: () => void;
}

type SettingsTab = 'database' | 'data_backup' | 'panduan';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  transactions,
  asetList,
  debts,
  onResetData
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('database');
  
  // Supabase states
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [testing, setTesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<TableDiagnostic[]>([]);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.key);
      setTestResult(null);
      setUploadResult(null);
      setIsLocked(isSupabaseConfigured()); // Otomatis terkunci jika sudah terhubung agar aman

      if (isSupabaseConfigured()) {
        runDiagnostics(creds.url, creds.key);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const runDiagnostics = async (testUrl?: string, testKey?: string) => {
    setTesting(true);
    setTestResult(null);
    const result = await getSupabaseDiagnostics(testUrl, testKey);
    setTesting(false);
    setTestResult({ success: result.success, message: result.message });
    setDiagnostics(result.tables);
  };

  const handleTest = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Harap isi Project URL dan Anon Key terlebih dahulu.' });
      return;
    }
    await runDiagnostics(url.trim(), anonKey.trim());
  };

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) {
      alert('Harap isi Project URL dan Anon Key Supabase.');
      return;
    }
    saveSupabaseCredentials(url.trim(), anonKey.trim());
    setIsLocked(true);
    onConnected();
    runDiagnostics(url.trim(), anonKey.trim());
  };

  const handlePushData = async () => {
    if (!window.confirm(`Unggah ${transactions.length} transaksi kas, ${asetList.length} tabungan, dan ${debts.length} utang/piutang ke database Supabase sekarang?`)) {
      return;
    }
    setUploading(true);
    setUploadResult(null);
    const result = await pushLocalDataToSupabase(transactions, asetList, debts);
    setUploading(false);
    setUploadResult(result);
    if (result.success) {
      runDiagnostics();
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin memutuskan database Supabase? Aplikasi akan beralih ke penyimpanan lokal browser.')) {
      clearSupabaseCredentials();
      setUrl('');
      setAnonKey('');
      setTestResult(null);
      setDiagnostics([]);
      setUploadResult(null);
      setIsLocked(false);
      onConnected();
    }
  };

  const sqlKasTransactions = `-- Tabel kas_transactions untuk Buku Kas
CREATE TABLE IF NOT EXISTS public.kas_transactions (
  id text NOT NULL,
  tanggal text NOT NULL,
  jenis text NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
  kategori text NOT NULL,
  nominal numeric NOT NULL DEFAULT 0,
  keterangan text NULL,
  metode_kas text NULL,
  masuk_ke_aset_id text NULL,
  masuk_ke_aset_nama text NULL,
  terkait_debt_id text NULL,
  terkait_debt_tipe text NULL,
  terkait_debt_pihak text NULL,
  created_at bigint NOT NULL,
  CONSTRAINT kas_transactions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_kas_transactions_tanggal ON public.kas_transactions (tanggal);
CREATE INDEX IF NOT EXISTS idx_kas_transactions_created_at ON public.kas_transactions (created_at);

-- Izinkan akses anonim (atau sesuaikan dengan RLS Anda)
ALTER TABLE public.aset_tabungan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piutang_utang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piutang_utang_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all public for anon" ON public.aset_tabungan FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for anon" ON public.kas_transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for anon" ON public.piutang_utang FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public for anon" ON public.piutang_utang_payments FOR ALL TO anon USING (true) WITH CHECK (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlKasTransactions);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Pengaturan Sistem</span>
                {isConnected ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Database Cloud Aktif
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                    Penyimpanan Lokal
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Konfigurasi database cloud Supabase, pencadangan data, dan sistem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 shrink-0 mt-2">
          <button
            onClick={() => setActiveTab('database')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Supabase</span>
          </button>

          <button
            onClick={() => setActiveTab('data_backup')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'data_backup'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Cadangan & Ekspor</span>
          </button>

          <button
            onClick={() => setActiveTab('panduan')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'panduan'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Panduan & Tes</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          
          {/* TAB 1: DATABASE SUPABASE */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              
              {/* Box Kunci Pengaman (Security Lock) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isLocked ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isLocked ? 'Kredensial Database Terkunci' : 'Mode Ubah Kredensial Aktif'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isLocked 
                        ? 'Pengaturan dilindungi agar konfigurasi database tidak sengaja terubah.' 
                        : 'Silakan perbarui Project URL atau Anon Key Supabase.'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isLocked 
                      ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50' 
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{isLocked ? 'Buka Kunci' : 'Kunci Kembali'}</span>
                </button>
              </div>

              {/* Form Input Kredensial */}
              <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Project URL *
                  </label>
                  <input
                    type="text"
                    value={url}
                    disabled={isLocked}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklmnop.supabase.co"
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 ${
                      isLocked ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Ditemukan di: Dashboard Supabase &gt; Project Settings &gt; API &gt; Project URL
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    API Key (anon / public) *
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    disabled={isLocked}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 ${
                      isLocked ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Gunakan kunci <strong>anon public</strong> (kunci yang aman digunakan di browser).
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>{testing ? 'Menguji...' : 'Uji Koneksi & Status 4 Tabel'}</span>
                  </button>

                  {!isLocked && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan Database</span>
                    </button>
                  )}

                  {isConnected && !isLocked && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-auto flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Putuskan Koneksi</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Diagnostik 4 Tabel Database */}
              {testResult && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span className="font-semibold">{testResult.message}</span>
                  </div>

                  {diagnostics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {diagnostics.map((d) => (
                        <div key={d.table} className="bg-white/90 p-2.5 rounded-lg border border-slate-200/80 text-[11px] flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-800">{d.table}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              d.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {d.status === 'ok' ? 'SIAP' : 'ERROR'}
                            </span>
                          </div>
                          <div className="mt-1 text-slate-500 font-mono text-[11px]">
                            {d.status === 'ok' ? `Jumlah data: ${d.rowCount} baris` : `Gagal: ${d.message}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fitur Upload / Sync Awal Data Lokal ke Supabase */}
              {isConnected && (
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-indigo-950 block">
                        Unggah Seluruh Data Lokal ke Supabase
                      </span>
                      <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                        Kirim data lokal saat ini ({transactions.length} transaksi, {asetList.length} tabungan, {debts.length} utang piutang) ke cloud dalam sekali klik.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePushData}
                      disabled={uploading}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <UploadCloud className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} />
                      <span>{uploading ? 'Mengunggah...' : 'Upload Data'}</span>
                    </button>
                  </div>

                  {uploadResult && (
                    <div className={`p-2 rounded-lg text-[11px] border font-medium ${
                      uploadResult.success ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' : 'bg-rose-100/70 border-rose-300 text-rose-900'
                    }`}>
                      {uploadResult.message}
                    </div>
                  )}
                </div>
              )}

              {/* Skrip DDL & RLS */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Skrip SQL Tabel `kas_transactions` & Policy RLS
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {copiedSql ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-lg overflow-x-auto max-h-28">
                  {sqlKasTransactions}
                </pre>
              </div>

            </div>
          )}

          {/* TAB 2: DATA & CADANGAN */}
          {activeTab === 'data_backup' && (
            <div className="space-y-4">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <h3 className="text-xs font-bold text-slate-800">
                  Ekspor Cadangan Data (CSV / Excel)
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Unduh seluruh pembukuan Anda ke format spreadsheet kapan saja sebagai arsip offline.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => exportTransactionsCSV(transactions)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Ekspor Buku Kas ({transactions.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportAsetCSV(asetList)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>Ekspor Tabungan ({asetList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportDebtsCSV(debts)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-rose-600" />
                    <span>Ekspor Utang Piutang ({debts.length})</span>
                  </button>
                </div>
              </div>

              {/* Reset Data Default */}
              <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <h3 className="text-xs font-bold text-rose-900">
                  Muat Ulang Contoh Data Awal
                </h3>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Mengembalikan contoh data simulasi awal pembukuan keluarga untuk latihan atau demonstrasi.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    onClose();
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Muat Ulang Data Awal</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: PANDUAN & CARA TES */}
          {activeTab === 'panduan' && (
            <div className="space-y-3 text-xs text-slate-600">
              
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">1</span>
                  <span>Periksa Status Database Cloud</span>
                </div>
                <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
                  Pada tab <strong>Database Supabase</strong> di atas, jalankan tombol <strong>"Uji Koneksi & Status 4 Tabel"</strong>. Jika semua tabel bertanda hijau (SIAP), artinya database cloud Anda siap bekerja.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
                  <span>Uji Tambah 1 Transaksi di Aplikasi</span>
                </div>
                <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
                  Tutup jendela ini, klik tombol <strong>+ Pemasukan</strong> atau <strong>+ Pengeluaran</strong>. Masukkan nominal uji coba (misal: <code>Rp 15.000</code> dengan keterangan <em>"Tes Sinkronisasi Cloud"</em>), lalu simpan.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">3</span>
                  <span>Periksa di Dashboard Supabase</span>
                </div>
                <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
                  Buka tab browser Supabase Anda &gt; menu <strong>Table Editor</strong> di sebelah kiri &gt; pilih tabel <code>kas_transactions</code>. Transaksi Rp 15.000 tadi akan langsung tersimpan di database cloud.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">4</span>
                  <span>Uji Hapus (Delete)</span>
                </div>
                <p className="text-slate-600 pl-7 leading-relaxed text-[11px]">
                  Hapus transaksi tes tadi di aplikasi. Refresh kembali tabel di Supabase, dan data tersebut akan otomatis terhapus dari server.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Kredensial disimpan aman & terenkripsi di browser Anda.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
