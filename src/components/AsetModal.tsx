import React, { useState, useEffect } from 'react';
import { X, Check, PiggyBank, Landmark, Coins, Building, Sparkles } from 'lucide-react';
import { AsetTabungan, AsetKategori } from '../types/finance';

interface AsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (aset: AsetTabungan) => void;
  initialData?: AsetTabungan | null;
}

const KATEGORI_OPTIONS: { label: string; value: AsetKategori }[] = [
  { label: 'Tabungan Bank / Rekening', value: 'tabungan' },
  { label: 'Emas / Logam Mulia', value: 'emas' },
  { label: 'Reksadana / Investasi', value: 'investasi' },
  { label: 'Deposito', value: 'deposito' },
  { label: 'Properti / Tanah', value: 'properti' },
  { label: 'Aset Lainnya', value: 'lainnya' },
];

export const AsetModal: React.FC<AsetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = !!initialData;

  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<AsetKategori>('tabungan');
  const [nominal, setNominal] = useState('');
  const [institusi, setInstitusi] = useState('');
  const [keterangan, setKeterangan] = useState('');

  useEffect(() => {
    if (initialData) {
      setNama(initialData.nama);
      setKategori(initialData.kategori);
      setNominal(initialData.nominal.toString());
      setInstitusi(initialData.institusi || '');
      setKeterangan(initialData.keterangan || '');
    } else {
      setNama('');
      setKategori('tabungan');
      setNominal('');
      setInstitusi('Bank BCA');
      setKeterangan('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = nominal.toString().replace(/[^0-9]/g, '');
    const num = parseFloat(cleanNum);
    if (!nama.trim() || isNaN(num) || num < 0) {
      alert('Silakan masukkan nama aset dan nominal angka yang valid.');
      return;
    }

    const aset: AsetTabungan = {
      id: initialData ? initialData.id : `ast-${Date.now()}`,
      nama: nama.trim(),
      kategori,
      nominal: num,
      institusi: institusi.trim() || undefined,
      keterangan: keterangan.trim() || undefined,
      updatedAt: Date.now()
    };

    onSave(aset);
    onClose();
  };

  const handleQuickAdd = (val: number) => {
    const cur = parseFloat(nominal.toString().replace(/[^0-9]/g, '')) || 0;
    setNominal((cur + val).toString());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Ubah Pos Aset / Tabungan' : 'Tambah Aset / Tabungan Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                Catat saldo simpanan, emas, atau investasi keluarga
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
          
          {/* Nama Aset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Aset / Tabungan *
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Tabungan Dana Darurat / Emas Antam 10g"
              required
              autoFocus
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Aset
            </label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value as AsetKategori)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 cursor-pointer"
            >
              {KATEGORI_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Nilai Nominal (Rp) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nilai Saldo / Nominal Aset (Rp) *
            </label>
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
                className="w-full pl-11 pr-4 py-2 text-lg font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
            </div>

            {/* Display formatted preview */}
            {nominal && parseInt(nominal, 10) > 0 && (
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Terbaca: <strong className="text-slate-800">Rp {parseInt(nominal, 10).toLocaleString('id-ID')}</strong>
              </div>
            )}

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {[500000, 1000000, 2500000, 5000000, 10000000].map(val => (
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

          {/* Institusi / Tempat Simpan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Institusi / Tempat Penyimpanan
            </label>
            <input
              type="text"
              value={institusi}
              onChange={(e) => setInstitusi(e.target.value)}
              placeholder="Contoh: Bank BSI / Pegadaian / Bibit / Brankas Rumah"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Keterangan / Tujuan Tabungan
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Target persiapan 6 bulan pengeluaran keluarga"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan' : 'Simpan Aset'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
