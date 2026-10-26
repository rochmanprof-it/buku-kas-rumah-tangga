import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Tag,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { AsetTabungan, isCashSavings } from '../types/finance';
import { formatRupiah, getTodayDateString } from '../utils/formatters';

export interface JualAsetSubmitPayload {
  aset: AsetTabungan;
  hargaJual: number;
  nilaiBukuDijual: number;
  selisihUntungRugi: number;
  persentaseUntungRugi: number;
  tujuanHasil: 'kas' | 'tabungan';
  targetTabunganId?: string;
  targetTabunganNama?: string;
  tanggal: string;
  metodeKas: string;
  keteranganTambahan?: string;
  isJualSebagian: boolean;
  sisaNilaiBukuAset: number;
}

interface JualAsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmJual: (payload: JualAsetSubmitPayload) => void;
  aset: AsetTabungan | null;
  cashSavingsList: AsetTabungan[];
}

export const JualAsetModal: React.FC<JualAsetModalProps> = ({
  isOpen,
  onClose,
  onConfirmJual,
  aset,
  cashSavingsList,
}) => {
  if (!isOpen || !aset) return null;

  const [isJualSebagian, setIsJualSebagian] = useState<boolean>(false);
  const [porsiModalDijual, setPorsiModalDijual] = useState<string>(aset.nominal.toString());
  const [hargaJual, setHargaJual] = useState<string>(aset.nominal.toString());
  const [tujuanHasil, setTujuanHasil] = useState<'kas' | 'tabungan'>('kas');
  const [targetTabunganId, setTargetTabunganId] = useState<string>(
    cashSavingsList[0]?.id || ''
  );
  const [tanggal, setTanggal] = useState<string>(getTodayDateString());
  const [metodeKas, setMetodeKas] = useState<string>('Bank Transfer');
  const [keteranganTambahan, setKeteranganTambahan] = useState<string>('');

  useEffect(() => {
    if (aset) {
      setIsJualSebagian(false);
      setPorsiModalDijual(aset.nominal.toString());
      setHargaJual(aset.nominal.toString());
      setTujuanHasil('kas');
      setTargetTabunganId(cashSavingsList[0]?.id || '');
      setTanggal(getTodayDateString());
      setMetodeKas('Bank Transfer');
      setKeteranganTambahan('');
    }
  }, [aset, isOpen, cashSavingsList]);

  // Clean calculations
  const parsedModal = isJualSebagian
    ? parseFloat(porsiModalDijual.replace(/[^0-9]/g, '')) || 0
    : aset.nominal;

  const parsedHargaJual = parseFloat(hargaJual.replace(/[^0-9]/g, '')) || 0;

  const selisih = parsedHargaJual - parsedModal;
  const persentase = parsedModal > 0 ? (selisih / parsedModal) * 100 : 0;
  const sisaModal = Math.max(0, aset.nominal - parsedModal);

  const isUntung = selisih > 0;
  const isRugi = selisih < 0;
  const isImpas = selisih === 0;

  const targetTabunganObj = cashSavingsList.find(c => c.id === targetTabunganId);

  const handleQuickPreset = (tipe: 'modal' | 'plus500k' | 'plus1m' | 'plus10pct' | 'plus20pct') => {
    switch (tipe) {
      case 'modal':
        setHargaJual(parsedModal.toString());
        break;
      case 'plus500k':
        setHargaJual((parsedHargaJual + 500000).toString());
        break;
      case 'plus1m':
        setHargaJual((parsedHargaJual + 1000000).toString());
        break;
      case 'plus10pct':
        setHargaJual(Math.round(parsedModal * 1.1).toString());
        break;
      case 'plus20pct':
        setHargaJual(Math.round(parsedModal * 1.2).toString());
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedHargaJual <= 0) {
      alert('Silakan masukkan harga jual yang valid lebih dari 0.');
      return;
    }

    if (isJualSebagian && (parsedModal <= 0 || parsedModal > aset.nominal)) {
      alert(`Porsi modal yang dijual harus antara Rp 1 sampai ${formatRupiah(aset.nominal)}.`);
      return;
    }

    if (tujuanHasil === 'tabungan' && !targetTabunganId && cashSavingsList.length > 0) {
      alert('Silakan pilih pos tabungan cash penerima.');
      return;
    }

    const payload: JualAsetSubmitPayload = {
      aset,
      hargaJual: parsedHargaJual,
      nilaiBukuDijual: parsedModal,
      selisihUntungRugi: selisih,
      persentaseUntungRugi: persentase,
      tujuanHasil,
      targetTabunganId: tujuanHasil === 'tabungan' ? targetTabunganId : undefined,
      targetTabunganNama: tujuanHasil === 'tabungan' ? targetTabunganObj?.nama : undefined,
      tanggal,
      metodeKas,
      keteranganTambahan: keteranganTambahan.trim() || undefined,
      isJualSebagian,
      sisaNilaiBukuAset: sisaModal,
    };

    onConfirmJual(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Jual Aset / Realisasi Keuntungan
              </h2>
              <p className="text-xs text-slate-500">
                Pelepasan aset, hitung untung/rugi, dan masukkan hasil ke kas/tabungan
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

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
          
          {/* Card Info Aset Saat Ini */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Aset yang Dijual
                </span>
                <h4 className="text-sm font-bold text-slate-900">{aset.nama}</h4>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {aset.institusi || aset.kategori}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-500">Nilai Modal Buku Saat Ini:</span>
              <strong className="font-mono text-slate-800 text-sm">
                {formatRupiah(aset.nominal)}
              </strong>
            </div>
          </div>

          {/* Opsi Jual Seluruhnya vs Sebagian */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Porsi Penjualan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsJualSebagian(false);
                  setPorsiModalDijual(aset.nominal.toString());
                }}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  !isJualSebagian
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Jual Seluruhnya (100%)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Aset dilepas penuh dari portofolio
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsJualSebagian(true)}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  isJualSebagian
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Jual Sebagian (Parsial)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Hanya jual sebagian gram/porsi
                </div>
              </button>
            </div>

            {/* Input Porsi Modal Jika Jual Sebagian */}
            {isJualSebagian && (
              <div className="mt-2 p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1.5">
                <label className="block text-[11px] font-semibold text-amber-950">
                  Modal Buku yang Dilepas (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-amber-600 text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={porsiModalDijual}
                    onChange={(e) => setPorsiModalDijual(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-1.5 text-sm font-mono font-bold bg-white border border-amber-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-800">
                  <span>Sisa modal aset: <strong>{formatRupiah(sisaModal)}</strong></span>
                  <span>Maksimal: {formatRupiah(aset.nominal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Harga Jual */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Harga Jual Diterima (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-base">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                required
                className="w-full pl-12 pr-4 py-2 text-xl font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
              />
            </div>

            {/* Terbaca */}
            {parsedHargaJual > 0 && (
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Terbaca: <strong className="text-slate-800">{formatRupiah(parsedHargaJual)}</strong>
              </div>
            )}

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => handleQuickPreset('modal')}
                className="px-2 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer shrink-0"
              >
                = Modal
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('plus10pct')}
                className="px-2 py-1 text-[11px] font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition-colors cursor-pointer shrink-0"
              >
                +10% Laba
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('plus20pct')}
                className="px-2 py-1 text-[11px] font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition-colors cursor-pointer shrink-0"
              >
                +20% Laba
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('plus500k')}
                className="px-2 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer shrink-0"
              >
                +500rb
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('plus1m')}
                className="px-2 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer shrink-0"
              >
                +1jt
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* KALKULATOR UNTUNG / RUGI REAL-TIME                       */}
          {/* ========================================================= */}
          {parsedHargaJual > 0 && (
            <div
              className={`rounded-xl p-3.5 border transition-all ${
                isUntung
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : isRugi
                  ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isUntung
                        ? 'bg-emerald-200 text-emerald-800'
                        : isRugi
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isUntung ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : isRugi ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider block">
                      {isUntung && 'HASIL JUAL: UNTUNG (LABA)'}
                      {isRugi && 'HASIL JUAL: RUGI'}
                      {isImpas && 'HASIL JUAL: IMPAS (MODAL BALIK)'}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Modal: {formatRupiah(parsedModal)} → Jual: {formatRupiah(parsedHargaJual)}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div
                    className={`text-base font-bold ${
                      isUntung
                        ? 'text-emerald-700'
                        : isRugi
                        ? 'text-rose-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {isUntung && `+${formatRupiah(selisih)}`}
                    {isRugi && `-${formatRupiah(Math.abs(selisih))}`}
                    {isImpas && 'Rp 0'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    ({selisih >= 0 ? '+' : ''}{persentase.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pilihan Hasil Jual Masuk ke mana (Kas vs Tabungan) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Hasil Penjualan Masuk ke: *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTujuanHasil('kas')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                  tujuanHasil === 'kas'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg mt-0.5">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Kas Operasional</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Uang kas harian siap dibelanjakan
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTujuanHasil('tabungan')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                  tujuanHasil === 'tabungan'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg mt-0.5">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Tabungan Cash</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    Rekening bank / deposito simpanan
                  </div>
                </div>
              </button>
            </div>

            {/* Dropdown Pos Tabungan Cash Penerima */}
            {tujuanHasil === 'tabungan' && (
              <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-1.5">
                <label className="block text-[11px] font-semibold text-indigo-950">
                  Pilih Rekening / Pos Tabungan Penerima:
                </label>
                {cashSavingsList.length === 0 ? (
                  <p className="text-[11px] text-rose-600">
                    Belum ada pos tabungan cash. Uang akan dialokasikan ke kas operasional.
                  </p>
                ) : (
                  <select
                    value={targetTabunganId}
                    onChange={(e) => setTargetTabunganId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {cashSavingsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} (Saldo: {formatRupiah(c.nominal)}) · {c.institusi || 'Bank'}
                      </option>
                    ))}
                  </select>
                )}

                {targetTabunganObj && parsedHargaJual > 0 && (
                  <div className="text-[10px] text-indigo-800 bg-white p-2 rounded-md border border-indigo-100 mt-1">
                    Saldo <strong>{targetTabunganObj.nama}</strong> akan bertambah dari{' '}
                    {formatRupiah(targetTabunganObj.nominal)} menjadi{' '}
                    <strong className="font-mono text-indigo-950">
                      {formatRupiah(targetTabunganObj.nominal + parsedHargaJual)}
                    </strong>
                    .
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tanggal & Metode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Penjualan *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Metode Penerimaan
              </label>
              <select
                value={metodeKas}
                onChange={(e) => setMetodeKas(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 cursor-pointer"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Kas Tunai">Kas Tunai</option>
                <option value="e-Wallet">e-Wallet</option>
              </select>
            </div>
          </div>

          {/* Keterangan Tambahan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Catatan Penjualan (Opsional)
            </label>
            <input
              type="text"
              value={keteranganTambahan}
              onChange={(e) => setKeteranganTambahan(e.target.value)}
              placeholder="Contoh: Jual ke Butik Emas Antam / Butuh dana renovasi rumah"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Tag className="w-4 h-4" />
              <span>Konfirmasi & Jual Aset</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
