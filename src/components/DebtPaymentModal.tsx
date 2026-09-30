import React, { useState, useEffect } from 'react';
import { X, Check, ArrowDownRight, ArrowUpRight, AlertCircle } from 'lucide-react';
import { DebtRecord } from '../types/finance';
import { getTodayDateString, formatRupiah } from '../utils/formatters';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord | null;
  onSavePayment: (debtId: string, nominal: number, tanggal: string, metodeKas: string, keterangan: string) => void;
}

const METODE_KAS_LIST = ['Kas Tunai', 'Bank Transfer', 'e-Wallet'];

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  onSavePayment
}) => {
  const [nominal, setNominal] = useState('');
  const [tanggal, setTanggal] = useState(getTodayDateString());
  const [metodeKas, setMetodeKas] = useState('Kas Tunai');
  const [keterangan, setKeterangan] = useState('');

  useEffect(() => {
    if (debt) {
      setNominal(debt.sisaNominal.toString());
      setTanggal(getTodayDateString());
      setMetodeKas('Kas Tunai');
      setKeterangan(
        debt.tipe === 'utang'
          ? `Bayar utang ke ${debt.pihak}`
          : `Terima pembayaran piutang dari ${debt.pihak}`
      );
    }
  }, [debt, isOpen]);

  if (!isOpen || !debt) return null;

  const isUtang = debt.tipe === 'utang';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = nominal.toString().replace(/[^0-9]/g, '');
    const num = parseFloat(cleanNum);
    if (!num || num <= 0) {
      alert('Silakan masukkan nominal pembayaran angka yang valid.');
      return;
    }

    if (num > debt.sisaNominal) {
      if (!window.confirm(`Nominal pembayaran (${formatRupiah(num)}) melebihi sisa ${debt.tipe} (${formatRupiah(debt.sisaNominal)}). Tetapkan lunas?`)) {
        return;
      }
    }

    onSavePayment(debt.id, num, tanggal, metodeKas, keterangan.trim());
    onClose();
  };

  const parsedNominal = parseInt(nominal.replace(/[^0-9]/g, ''), 10) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isUtang ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {isUtang ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isUtang ? `Bayar Utang ke ${debt.pihak}` : `Terima Piutang dari ${debt.pihak}`}
              </h2>
              <p className="text-xs text-slate-500">
                Sisa belum dibayar: <strong className="font-mono text-slate-700">{formatRupiah(debt.sisaNominal)}</strong>
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

        {/* Info Penjelasan Efek ke Kas */}
        <div className={`p-3 rounded-xl border mt-3 text-xs leading-relaxed flex items-start gap-2 ${
          isUtang 
            ? 'bg-rose-50/70 border-rose-200/80 text-rose-900' 
            : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">
              {isUtang ? 'Otomatis Mengurangi Kas' : 'Otomatis Menambah Kas'}
            </span>
            <span>
              {isUtang
                ? `Pembayaran utang sebesar ${parsedNominal > 0 ? formatRupiah(parsedNominal) : 'nominal'} akan dicatat sebagai Pengeluaran di Buku Kas sehingga saldo kas berkurang.`
                : `Penerimaan piutang sebesar ${parsedNominal > 0 ? formatRupiah(parsedNominal) : 'nominal'} akan dicatat sebagai Pemasukan di Buku Kas sehingga saldo kas bertambah.`
              }
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
          
          {/* Nominal Pembayaran */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Nominal Pembayaran (Rp) *
              </label>
              <button
                type="button"
                onClick={() => setNominal(debt.sisaNominal.toString())}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Bayar Lunas ({formatRupiah(debt.sisaNominal)})
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={nominal}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setNominal(val);
                }}
                placeholder="0"
                autoFocus
                className="w-full pl-11 pr-4 py-2 text-lg font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            {/* Display formatted preview */}
            {parsedNominal > 0 && (
              <div className="text-[11px] text-slate-500 mt-1 font-mono flex items-center justify-between">
                <span>Terbaca: <strong className="text-slate-800">{formatRupiah(parsedNominal)}</strong></span>
                <span>
                  Sisa setelah bayar: <strong className="font-mono text-indigo-700">{formatRupiah(Math.max(debt.sisaNominal - parsedNominal, 0))}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Tanggal & Metode Kas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Pembayaran *
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
                Metode Kas
              </label>
              <select
                value={metodeKas}
                onChange={(e) => setMetodeKas(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
              >
                {METODE_KAS_LIST.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Keterangan Pembayaran
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Cicilan ke-2 / Pelunasan pinjaman"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
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
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5 ${
                isUtang ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isUtang ? 'Konfirmasi Bayar Utang (Potong Kas)' : 'Konfirmasi Terima Piutang (Tambah Kas)'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
