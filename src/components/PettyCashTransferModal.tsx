import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Banknote, Landmark, Check } from 'lucide-react';
import {
  KasTransaction,
  KATEGORI_ISI_PETTY_CASH,
  KATEGORI_SETOR_PETTY_CASH,
} from '../types/finance';
import { getTodayDateString, formatRupiah } from '../utils/formatters';

export type PettyCashTransferMode = 'isi' | 'setor';

interface PettyCashTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: KasTransaction) => void;
  initialMode?: PettyCashTransferMode;
  initialData?: KasTransaction | null;
  saldoKasBank: number;
  saldoPettyCash: number;
}

const SUMBER_REKENING_LIST = ['Bank Transfer', 'e-Wallet'];

export const PettyCashTransferModal: React.FC<PettyCashTransferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMode = 'isi',
  initialData,
  saldoKasBank,
  saldoPettyCash,
}) => {
  const isEditing = !!initialData;

  const [mode, setMode] = useState<PettyCashTransferMode>(initialMode);
  const [nominal, setNominal] = useState<string>('500000');
  const [tanggal, setTanggal] = useState<string>(getTodayDateString());
  const [rekeningMetode, setRekeningMetode] = useState<string>('Bank Transfer');
  const [keterangan, setKeterangan] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const editMode: PettyCashTransferMode =
        initialData.kategori === KATEGORI_SETOR_PETTY_CASH ? 'setor' : 'isi';
      setMode(editMode);
      setNominal(initialData.nominal.toString());
      setTanggal(initialData.tanggal);
      setRekeningMetode(
        SUMBER_REKENING_LIST.includes(initialData.metodeKas)
          ? initialData.metodeKas
          : 'Bank Transfer'
      );
      setKeterangan(initialData.keterangan || '');
    } else {
      setMode(initialMode);
      setNominal(initialMode === 'isi' ? '500000' : '');
      setTanggal(getTodayDateString());
      setRekeningMetode('Bank Transfer');
      setKeterangan(
        initialMode === 'isi'
          ? 'Tarik tunai mingguan untuk Petty Cash'
          : 'Setor sisa Petty Cash ke rekening bank'
      );
    }
  }, [isOpen, initialMode, initialData]);

  if (!isOpen) return null;

  const handleModeChange = (nextMode: PettyCashTransferMode) => {
    setMode(nextMode);
    if (!isEditing) {
      if (nextMode === 'isi') {
        if (!nominal) setNominal('500000');
        setKeterangan('Tarik tunai mingguan untuk Petty Cash');
      } else {
        setKeterangan('Setor sisa Petty Cash ke rekening bank');
      }
    }
  };

  const parsedNominal = parseInt(nominal.replace(/[^0-9]/g, ''), 10) || 0;

  const previewBankAfter =
    mode === 'isi' ? saldoKasBank - parsedNominal : saldoKasBank + parsedNominal;
  const previewPettyAfter =
    mode === 'isi' ? saldoPettyCash + parsedNominal : saldoPettyCash - parsedNominal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedNominal || parsedNominal <= 0) {
      alert('Silakan masukkan nominal transfer angka yang valid (lebih dari 0).');
      return;
    }

    const tx: KasTransaction = {
      id: initialData ? initialData.id : `tx-pc-${Date.now()}`,
      tanggal,
      jenis: mode === 'isi' ? 'pengeluaran' : 'pemasukan',
      kategori: mode === 'isi' ? KATEGORI_ISI_PETTY_CASH : KATEGORI_SETOR_PETTY_CASH,
      nominal: parsedNominal,
      keterangan:
        keterangan.trim() ||
        (mode === 'isi'
          ? 'Tarik tunai dari rekening ke Petty Cash'
          : 'Setor sisa Petty Cash ke rekening bank'),
      metodeKas: rekeningMetode,
      createdAt: initialData ? initialData.createdAt : Date.now(),
    };

    onSave(tx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/70">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Ubah Mutasi Petty Cash' : 'Mutasi Kas Rekening ↔ Petty Cash'}
              </h2>
              <p className="text-xs text-slate-500">
                Pindah dana tanpa mengacaukan total pengeluaran bulanan
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
          {/* Toggle Mode: Isi Petty Cash (Tarik Tunai) vs Setor ke Bank */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleModeChange('isi')}
              className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'isi'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Isi Petty Cash</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('setor')}
              className={`py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'setor'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Setor ke Rekening</span>
            </button>
          </div>

          {/* Nominal */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {mode === 'isi' ? 'Nominal Tarik Tunai (Rp) *' : 'Nominal Setor ke Bank (Rp) *'}
              </label>
              {mode === 'setor' && saldoPettyCash > 0 && (
                <button
                  type="button"
                  onClick={() => setNominal(saldoPettyCash.toString())}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  Setor Semua ({formatRupiah(saldoPettyCash)})
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={nominal}
                onChange={(e) => setNominal(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="500000"
                autoFocus
                className="w-full pl-11 pr-4 py-2 text-lg font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {[100000, 200000, 300000, 500000, 1000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setNominal(val.toString())}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer shrink-0 ${
                    parsedNominal === val
                      ? 'bg-teal-600 text-white font-semibold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Dampak Saldo Real-Time */}
          <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-[11px] text-slate-500 block">Kas Rekening (Bank)</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">
                {formatRupiah(saldoKasBank)}
              </span>
              {parsedNominal > 0 && (
                <span
                  className={`block text-[11px] font-mono font-semibold mt-0.5 tabular-nums ${
                    mode === 'isi' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  → {formatRupiah(previewBankAfter)}
                </span>
              )}
            </div>

            <div className="border-l border-slate-200 pl-3">
              <span className="text-[11px] text-teal-700 font-medium block">
                Petty Cash (Cash di Tangan)
              </span>
              <span className="font-mono font-bold text-teal-900 tabular-nums">
                {formatRupiah(saldoPettyCash)}
              </span>
              {parsedNominal > 0 && (
                <span
                  className={`block text-[11px] font-mono font-semibold mt-0.5 tabular-nums ${
                    mode === 'isi' ? 'text-teal-700' : 'text-rose-600'
                  }`}
                >
                  → {formatRupiah(previewPettyAfter)}
                </span>
              )}
            </div>
          </div>

          {/* Tanggal & Sumber Rekening */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {mode === 'isi' ? 'Sumber Rekening' : 'Rekening Tujuan'}
              </label>
              <select
                value={rekeningMetode}
                onChange={(e) => setRekeningMetode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900 cursor-pointer"
              >
                {SUMBER_REKENING_LIST.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Keterangan / Catatan
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={
                mode === 'isi'
                  ? 'Contoh: Tarik tunai ATM BCA minggu ke-1'
                  : 'Contoh: Setor sisa uang tunai akhir bulan'
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {isEditing
                  ? 'Simpan Perubahan'
                  : mode === 'isi'
                  ? 'Simpan Tarik Tunai'
                  : 'Simpan Setoran'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
