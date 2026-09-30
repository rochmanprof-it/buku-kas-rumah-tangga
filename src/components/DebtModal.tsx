import React, { useState, useEffect } from 'react';
import { X, Check, HandCoins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DebtRecord, DebtType } from '../types/finance';
import { getTodayDateString, formatRupiah } from '../utils/formatters';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: DebtRecord) => void;
  initialData?: DebtRecord | null;
  defaultType?: DebtType;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = 'utang'
}) => {
  const isEditing = !!initialData;

  const [tipe, setTipe] = useState<DebtType>(defaultType);
  const [pihak, setPihak] = useState('');
  const [totalNominal, setTotalNominal] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(getTodayDateString());
  const [jatuhTempo, setJatuhTempo] = useState('');
  const [keterangan, setKeterangan] = useState('');

  useEffect(() => {
    if (initialData) {
      setTipe(initialData.tipe);
      setPihak(initialData.pihak);
      setTotalNominal(initialData.totalNominal.toString());
      setTanggalMulai(initialData.tanggalMulai);
      setJatuhTempo(initialData.jatuhTempo || '');
      setKeterangan(initialData.keterangan || '');
    } else {
      setTipe(defaultType);
      setPihak('');
      setTotalNominal('');
      setTanggalMulai(getTodayDateString());
      setJatuhTempo('');
      setKeterangan('');
    }
  }, [initialData, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleQuickAdd = (val: number) => {
    const cleanCurrent = totalNominal.toString().replace(/[^0-9]/g, '');
    const current = parseFloat(cleanCurrent) || 0;
    setTotalNominal((current + val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = totalNominal.toString().replace(/[^0-9]/g, '');
    const num = parseFloat(cleanNum);
    if (!pihak.trim() || isNaN(num) || num <= 0) {
      alert('Silakan masukkan nama pihak dan nominal angka yang valid.');
      return;
    }

    // Jika edit, hitung sisa nominal secara proporsional
    let sisa = num;
    if (initialData) {
      const terbayar = Math.max(initialData.totalNominal - initialData.sisaNominal, 0);
      sisa = Math.max(num - terbayar, 0);
    }

    const debt: DebtRecord = {
      id: initialData ? initialData.id : `dbt-${Date.now()}`,
      tipe,
      pihak: pihak.trim(),
      totalNominal: num,
      sisaNominal: sisa,
      tanggalMulai,
      jatuhTempo: jatuhTempo.trim() || undefined,
      status: sisa <= 0 ? 'lunas' : 'belum_lunas',
      keterangan: keterangan.trim() || undefined,
      riwayatPembayaran: initialData?.riwayatPembayaran || [],
      createdAt: initialData ? initialData.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    onSave(debt);
    onClose();
  };

  const parsedNominal = parseInt(totalNominal.replace(/[^0-9]/g, ''), 10) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${tipe === 'utang' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? `Ubah Catatan ${tipe === 'utang' ? 'Utang' : 'Piutang'}` : `Tambah ${tipe === 'utang' ? 'Utang' : 'Piutang'} Baru`}
              </h2>
              <p className="text-xs text-slate-500">
                {tipe === 'utang' 
                  ? 'Kewajiban uang yang harus Anda bayarkan ke pihak lain' 
                  : 'Uang Anda yang dipinjam atau belum dibayarkan orang lain'}
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
          
          {/* Toggle Jenis: Utang vs Piutang */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTipe('utang')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                tipe === 'utang'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Utang (Kewajiban Kita)</span>
            </button>

            <button
              type="button"
              onClick={() => setTipe('piutang')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                tipe === 'piutang'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Piutang (Hak Kita)</span>
            </button>
          </div>

          {/* Pihak (Nama Peminjam / Pemberi Pinjaman) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tipe === 'utang' ? 'Nama Pemberi Pinjaman / Kreditur *' : 'Nama Peminjam / Debitur *'}
            </label>
            <input
              type="text"
              value={pihak}
              onChange={(e) => setPihak(e.target.value)}
              placeholder={tipe === 'utang' ? "Contoh: Bank BSI / Pak Joko / Toko Bangunan" : "Contoh: Rudi (Teman Kantor) / Pembeli Kue"}
              required
              autoFocus
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Total Nominal {tipe === 'utang' ? 'Utang' : 'Piutang'} (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={totalNominal}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setTotalNominal(val);
                }}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2 text-lg font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* Display formatted preview */}
            {parsedNominal > 0 && (
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Terbaca: <strong className="text-slate-800">{formatRupiah(parsedNominal)}</strong>
              </div>
            )}

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {[250000, 500000, 1000000, 2500000, 5000000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
            </div>
          </div>

          {/* Tanggal Mulai & Jatuh Tempo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Mulai *
              </label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jatuh Tempo (Opsional)
              </label>
              <input
                type="date"
                value={jatuhTempo}
                onChange={(e) => setJatuhTempo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
              />
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
              placeholder="Contoh: Pinjaman renovasi dapur / Tagihan pesanan arisan"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
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
                tipe === 'utang' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan' : `Simpan ${tipe === 'utang' ? 'Utang' : 'Piutang'}`}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
