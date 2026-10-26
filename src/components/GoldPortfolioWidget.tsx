import React, { useState } from 'react';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Sparkles, 
  SlidersHorizontal, 
  Info, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { GoldPriceData, GoldPortfolioSummary, saveCustomGoldPrice, resetToLiveGoldPrice } from '../utils/goldPrice';
import { formatRupiah } from '../utils/formatters';

interface GoldPortfolioWidgetProps {
  goldPrice: GoldPriceData;
  summary: GoldPortfolioSummary;
  evalMode: 'pasar' | 'buyback';
  onEvalModeChange: (mode: 'pasar' | 'buyback') => void;
  onRefreshPrice: () => Promise<void>;
  isLoadingPrice: boolean;
  onPriceUpdated: () => void;
}

export const GoldPortfolioWidget: React.FC<GoldPortfolioWidgetProps> = ({
  goldPrice,
  summary,
  evalMode,
  onEvalModeChange,
  onRefreshPrice,
  isLoadingPrice,
  onPriceUpdated
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState(goldPrice.pricePerGram.toString());
  const [customBuybackInput, setCustomBuybackInput] = useState(goldPrice.buybackPerGram.toString());

  const isUntung = summary.totalUntungRugiNominal >= 0;
  const activeRate = evalMode === 'buyback' ? goldPrice.buybackPerGram : goldPrice.pricePerGram;

  const handleOpenEdit = () => {
    setCustomPriceInput(goldPrice.pricePerGram.toString());
    setCustomBuybackInput(goldPrice.buybackPerGram.toString());
    setIsEditModalOpen(true);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(customPriceInput.replace(/[^0-9]/g, ''));
    const b = parseFloat(customBuybackInput.replace(/[^0-9]/g, ''));

    if (isNaN(p) || p <= 0) {
      alert('Masukkan harga emas per gram yang valid.');
      return;
    }

    saveCustomGoldPrice(p, b > 0 ? b : undefined);
    setIsEditModalOpen(false);
    onPriceUpdated();
  };

  const handleResetToAuto = () => {
    resetToLiveGoldPrice();
    setIsEditModalOpen(false);
    onPriceUpdated();
  };

  return (
    <>
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/70 to-yellow-500/5 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Top bar: Realtime Ticker & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60 relative z-10">
          
          {/* Realtime Live Price Banner */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Harga Emas Realtime (Spot & Antam)
                </span>
                
                {/* Live Badge */}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {goldPrice.isCustom ? 'Kustom' : 'Live'}
                </span>
              </div>

              {/* Price Display */}
              <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-950 tracking-tight">
                  {formatRupiah(activeRate)}
                  <span className="text-xs font-normal text-amber-800/80"> / gram</span>
                </span>

                {goldPrice.change24h !== 0 && (
                  <span className={`inline-flex items-center text-xs font-bold font-mono px-1.5 py-0.2 rounded ${
                    goldPrice.change24h > 0 
                      ? 'text-emerald-700 bg-emerald-100/70' 
                      : 'text-rose-700 bg-rose-100/70'
                  }`}>
                    {goldPrice.change24h > 0 ? '+' : ''}{goldPrice.change24h}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Controls: Mode Switch, Refresh, Custom */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Toggle Mode: Harga Pasar vs Buyback */}
            <div className="flex items-center p-0.5 bg-amber-100/80 rounded-lg border border-amber-200 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => onEvalModeChange('pasar')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  evalMode === 'pasar' 
                    ? 'bg-white text-amber-950 font-bold shadow-2xs' 
                    : 'text-amber-800 hover:text-amber-950'
                }`}
                title="Menggunakan harga pasar spot saat ini"
              >
                Harga Jual Pasar
              </button>
              <button
                type="button"
                onClick={() => onEvalModeChange('buyback')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  evalMode === 'buyback' 
                    ? 'bg-white text-amber-950 font-bold shadow-2xs' 
                    : 'text-amber-800 hover:text-amber-950'
                }`}
                title="Menggunakan harga beli kembali (buyback) jika dijual hari ini"
              >
                Harga Buyback
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefreshPrice}
              disabled={isLoadingPrice}
              title="Perbarui harga emas ke harga pasar terkini"
              className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrice ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            {/* Custom Benchmark Price */}
            <button
              type="button"
              onClick={handleOpenEdit}
              title="Atur harga acuan manual / harga butik Antam hari ini"
              className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Bottom Section: Gold Portfolio Performance (Untung / Rugi) */}
        {summary.totalGrams > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 relative z-10">
            
            {/* 1. Total Emas Dimiliki */}
            <div className="bg-white/80 backdrop-blur-xs border border-amber-200/60 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Simpanan Emas
              </span>
              <div className="text-lg font-bold font-mono text-amber-900 mt-0.5">
                {summary.totalGrams.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} g
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                dari {summary.jumlahKeping} keping/pos aset
              </span>
            </div>

            {/* 2. Total Modal Saat Beli */}
            <div className="bg-white/80 backdrop-blur-xs border border-amber-200/60 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Modal Beli
              </span>
              <div className="text-lg font-bold font-mono text-slate-800 mt-0.5">
                {formatRupiah(summary.totalModal)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Rata-rata: {summary.totalGrams > 0 ? formatRupiah(Math.round(summary.totalModal / summary.totalGrams)) : '0'}/g
              </span>
            </div>

            {/* 3. Estimasi Nilai Emas Saat Ini */}
            <div className="bg-white/80 backdrop-blur-xs border border-amber-200/60 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Nilai Emas Sekarang
              </span>
              <div className="text-lg font-bold font-mono text-amber-950 mt-0.5">
                {formatRupiah(summary.totalNilaiSekarang)}
              </div>
              <span className="text-[10px] text-amber-700 block mt-0.5">
                {evalMode === 'buyback' ? 'Berdasarkan harga buyback' : 'Berdasarkan harga pasar'}
              </span>
            </div>

            {/* 4. Keuntungan / Kerugian Bersih (Profit / Loss) */}
            <div className={`backdrop-blur-xs border rounded-xl p-3 ${
              isUntung 
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {isUntung ? 'Untung (Capital Gain)' : 'Rugi (Capital Loss)'}
                </span>
                {isUntung ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>

              <div className={`text-lg font-bold font-mono mt-0.5 ${isUntung ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isUntung ? '+' : ''}{formatRupiah(summary.totalUntungRugiNominal)}
              </div>

              <div className="flex items-center gap-1 text-[11px] font-semibold mt-0.5">
                <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] ${
                  isUntung ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}>
                  {isUntung ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{isUntung ? '+' : ''}{summary.totalUntungRugiPersen.toFixed(1)}%</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">sejak dibeli</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="pt-3 text-xs text-amber-900/80 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                Tambahkan pos tabungan berkategori <strong>"Emas / Logam Mulia"</strong> dengan mengisi berat gram untuk menghitung untung/rugi otomatis.
              </span>
            </span>
          </div>
        )}

      </div>

      {/* Modal Kustomisasi Harga Acuan Emas */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <Coins className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold">Atur Harga Acuan Emas</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Anda dapat memasukkan harga resmi butik Antam hari ini atau harga toko emas langganan Anda secara manual.
            </p>

            <form onSubmit={handleSaveCustom} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Jual Pasar per Gram (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="1495000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Buyback / Beli Kembali per Gram (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customBuybackInput}
                    onChange={(e) => setCustomBuybackInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="1380000"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Kosongkan untuk otomatis ~92.5% dari harga jual.
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {goldPrice.isCustom ? (
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="text-xs text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
                  >
                    Kembali ke Auto Live
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Terapkan</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
};
