import React, { useState, useEffect } from 'react';
import { X, Check, PiggyBank, Coins, TrendingUp, Building, Wallet, Sparkles } from 'lucide-react';
import { AsetTabungan, AsetKategori, AsetGroupType, isCashSavings } from '../types/finance';

interface AsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (aset: AsetTabungan) => void;
  initialData?: AsetTabungan | null;
  defaultGroup?: AsetGroupType;
}

const KATEGORI_CASH_OPTIONS: { label: string; value: AsetKategori; desc: string }[] = [
  { label: 'Tabungan Bank / Rekening', value: 'tabungan', desc: 'Rekening harian, tabungan dana darurat, autodebet' },
  { label: 'Deposito Bank', value: 'deposito', desc: 'Simpanan berjangka dengan bunga/imbal hasil' },
  { label: 'Uang Tunai / Kas Fisik', value: 'kas_fisik', desc: 'Uang cash tersimpan di brankas atau amplop rumah' },
];

const KATEGORI_ASET_OPTIONS: { label: string; value: AsetKategori; desc: string }[] = [
  { label: 'Emas / Logam Mulia (Antam, UBS, Perhiasan)', value: 'emas', desc: 'Emas batangan, koin dinar, atau perhiasan berharga' },
  { label: 'Reksadana / Saham / Obligasi', value: 'investasi', desc: 'Portofolio pasar modal (Bibit, Bareksa, Ajaib, dll)' },
  { label: 'Properti / Tanah / Bangunan', value: 'properti', desc: 'Rumah, tanah kavling, ruko, atau aset tak bergerak' },
  { label: 'Aset Koleksi / Berharga Lainnya', value: 'lainnya', desc: 'Kendaraan bernilai, barang koleksi bernilai tinggi' },
];

export const AsetModal: React.FC<AsetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultGroup = 'cash',
}) => {
  const isEditing = !!initialData;

  const [activeGroup, setActiveGroup] = useState<AsetGroupType>(defaultGroup);
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<AsetKategori>('tabungan');
  const [nominal, setNominal] = useState('');
  const [institusi, setInstitusi] = useState('');
  const [keterangan, setKeterangan] = useState('');

  useEffect(() => {
    if (initialData) {
      setNama(initialData.nama);
      setKategori(initialData.kategori);
      setActiveGroup(isCashSavings(initialData.kategori) ? 'cash' : 'aset');
      setNominal(initialData.nominal.toString());
      setInstitusi(initialData.institusi || '');
      setKeterangan(initialData.keterangan || '');
    } else {
      const initGroup = defaultGroup || 'cash';
      setActiveGroup(initGroup);
      setNama('');
      setKategori(initGroup === 'cash' ? 'tabungan' : 'emas');
      setNominal('');
      setInstitusi(initGroup === 'cash' ? 'Bank BCA' : 'Brankas Pribadi');
      setKeterangan('');
    }
  }, [initialData, isOpen, defaultGroup]);

  if (!isOpen) return null;

  const handleGroupChange = (newGroup: AsetGroupType) => {
    setActiveGroup(newGroup);
    if (newGroup === 'cash') {
      setKategori('tabungan');
      if (!isEditing && (!institusi || institusi === 'Brankas Pribadi')) {
        setInstitusi('Bank BCA');
      }
    } else {
      setKategori('emas');
      if (!isEditing && (!institusi || institusi === 'Bank BCA')) {
        setInstitusi('Brankas Pribadi');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = nominal.toString().replace(/[^0-9]/g, '');
    const num = parseFloat(cleanNum);
    if (!nama.trim() || isNaN(num) || num < 0) {
      alert('Silakan masukkan nama dan nominal angka yang valid.');
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

  const currentOptions = activeGroup === 'cash' ? KATEGORI_CASH_OPTIONS : KATEGORI_ASET_OPTIONS;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${activeGroup === 'cash' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
              {activeGroup === 'cash' ? <Wallet className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Ubah Catatan' : 'Tambah Pos Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                {activeGroup === 'cash' ? 'Simpanan uang kas likuid & rekening bank' : 'Logam mulia emas, investasi, dan aset bernilai'}
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

        {/* Group Selector Switcher (Tabungan Cash vs Aset & Logam Mulia) */}
        <div className="mt-4 p-1 bg-slate-100 rounded-xl grid grid-cols-2 gap-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleGroupChange('cash')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeGroup === 'cash'
                ? 'bg-white text-indigo-900 shadow-xs border border-indigo-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PiggyBank className="w-4 h-4 text-indigo-600" />
            <span>Tabungan Cash</span>
          </button>

          <button
            type="button"
            onClick={() => handleGroupChange('aset')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeGroup === 'aset'
                ? 'bg-white text-amber-900 shadow-xs border border-amber-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Aset & Logam Mulia</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
          
          {/* Nama Aset / Tabungan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {activeGroup === 'cash' ? 'Nama Pos Tabungan Cash *' : 'Nama Aset / Logam Mulia *'}
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={activeGroup === 'cash' ? 'Contoh: Tabungan Dana Darurat / Rekening Gaji BCA' : 'Contoh: Emas Batangan Antam 10g / Reksadana Bibit'}
              required
              autoFocus
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Kategori Spesifik */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori {activeGroup === 'cash' ? 'Simpanan Cash' : 'Aset'}
            </label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value as AsetKategori)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 cursor-pointer"
            >
              {currentOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nilai Nominal (Rp) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {activeGroup === 'cash' ? 'Saldo Tabungan (Rp) *' : 'Nilai Taksiran / Nilai Beli Aset (Rp) *'}
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
              placeholder={activeGroup === 'cash' ? 'Contoh: Bank BCA / Bank BSI / Dompet Tunai' : 'Contoh: Brankas Pribadi / Safe Deposit Box / Bibit'}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Keterangan / Catatan Tambahan
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={activeGroup === 'cash' ? 'Contoh: Target persiapan 6 bulan pengeluaran keluarga' : 'Contoh: Emas kadar 99.99% sertifikat Antam / Pembelian Maret 2024'}
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
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5 ${
                activeGroup === 'cash'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan' : activeGroup === 'cash' ? 'Simpan Tabungan Cash' : 'Simpan Aset / Logam Mulia'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
