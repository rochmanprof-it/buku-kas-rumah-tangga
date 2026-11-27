import React, { useState, useEffect } from 'react';
import { X, Check, PiggyBank, Coins, Wallet } from 'lucide-react';
import { AsetTabungan, AsetKategori, AsetGroupType, GoldBrand, GoldPriceSnapshot, isCashSavings } from '../types/finance';
import { GoldMetaMap, resolveGoldMeta } from '../utils/goldValuation';
import { formatRupiah } from '../utils/formatters';

interface AsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (aset: AsetTabungan) => void;
  initialData?: AsetTabungan | null;
  defaultGroup?: AsetGroupType;
  goldPrices?: GoldPriceSnapshot | null;
  goldMetaMap?: GoldMetaMap;
}

const KATEGORI_CASH_OPTIONS: { label: string; value: AsetKategori; desc: string }[] = [
  { label: 'Tabungan Bank / Rekening', value: 'tabungan', desc: 'Rekening harian, tabungan dana darurat, autodebet' },
  { label: 'Deposito Bank', value: 'deposito', desc: 'Simpanan berjangka dengan bunga/imbal hasil' },
  { label: 'Uang Tunai / Kas Fisik', value: 'kas_fisik', desc: 'Uang cash tersimpan di brankas atau amplop rumah' },
];

const KATEGORI_ASET_OPTIONS: { label: string; value: AsetKategori; desc: string }[] = [
  { label: 'Emas / Logam Mulia (Antam, UBS, Galeri 24)', value: 'emas', desc: 'Emas batangan Antam, UBS, G24, atau perhiasan emas' },
  { label: 'Perak / Silver Batangan & Koin', value: 'perak', desc: 'Perak batangan Antam, koin silver, atau dirham perak' },
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
  goldPrices = null,
  goldMetaMap = {},
}) => {
  const isEditing = !!initialData;

  const [activeGroup, setActiveGroup] = useState<AsetGroupType>(defaultGroup);
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<AsetKategori>('tabungan');
  const [nominal, setNominal] = useState('');
  const [merekEmas, setMerekEmas] = useState<GoldBrand>('antam');
  const [beratGram, setBeratGram] = useState('');
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

      if (initialData.kategori === 'emas' || initialData.kategori === 'perak') {
        const resolved = resolveGoldMeta(initialData, goldMetaMap);
        setMerekEmas(resolved.merekEmas);
        setBeratGram(resolved.beratGram > 0 ? resolved.beratGram.toString() : '');
      } else {
        setMerekEmas('antam');
        setBeratGram('');
      }
    } else {
      const initGroup = defaultGroup || 'cash';
      setActiveGroup(initGroup);
      setNama('');
      setKategori(initGroup === 'cash' ? 'tabungan' : 'emas');
      setNominal('');
      setMerekEmas('antam');
      setBeratGram('');
      setInstitusi(initGroup === 'cash' ? 'Bank BCA' : 'Brankas Pribadi');
      setKeterangan('');
    }
  }, [initialData, isOpen, defaultGroup, goldMetaMap]);

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

  const parsedGram = parseFloat(beratGram.replace(',', '.')) || 0;
  const activeSellPerGram =
    kategori === 'emas'
      ? goldPrices
        ? goldPrices[merekEmas]?.sellPerGram || 0
        : 0
      : kategori === 'perak'
      ? goldPrices?.perak?.sellPerGram || 0
      : 0;
  const estimatedSellToday = parsedGram > 0 && activeSellPerGram > 0 ? Math.round(parsedGram * activeSellPerGram) : 0;

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
      merekEmas: kategori === 'emas' ? merekEmas : undefined,
      beratGram: (kategori === 'emas' || kategori === 'perak') && parsedGram > 0 ? parsedGram : undefined,
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
              placeholder={
                activeGroup === 'cash'
                  ? 'Contoh: Tabungan Dana Darurat / Rekening Gaji BCA'
                  : kategori === 'perak'
                  ? 'Contoh: Perak Antam 100g / Koin Dirham Perak 50g'
                  : 'Contoh: Emas Batangan Antam 10g / Emas UBS 5g'
              }
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

          {/* Detail Khusus Emas: Merek (Antam, UBS, G24) & Berat (Gram) */}
          {kategori === 'emas' && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    Merek Emas
                  </label>
                  <select
                    value={merekEmas}
                    onChange={(e) => setMerekEmas(e.target.value as GoldBrand)}
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="antam">Antam (LM)</option>
                    <option value="ubs">UBS</option>
                    <option value="galeri24">Galeri 24 (G24)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    Berat Emas (Gram) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={beratGram}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9.,]/g, '');
                      setBeratGram(clean);
                    }}
                    placeholder="Contoh: 5 atau 10"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[1, 2, 5, 10, 25, 50].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setBeratGram(g.toString())}
                    className={`px-2 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer shrink-0 ${
                      parsedGram === g
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {g} gr
                  </button>
                ))}
              </div>

              {estimatedSellToday > 0 && (
                <div className="text-[11px] bg-white border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-amber-900">
                    Estimasi Jual Hari Ini ({parsedGram}g @ {formatRupiah(activeSellPerGram)}/gr):
                  </span>
                  <strong className="font-mono tabular-nums text-amber-950">
                    {formatRupiah(estimatedSellToday)}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Detail Khusus Perak / Silver: Berat (Gram) & Estimasi Harga Perak */}
          {kategori === 'perak' && (
            <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-300 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Berat Perak (Gram) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={beratGram}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9.,]/g, '');
                    setBeratGram(clean);
                  }}
                  placeholder="Contoh: 50, 100, atau 250"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[10, 25, 50, 100, 250, 500, 1000].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setBeratGram(g.toString())}
                    className={`px-2 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer shrink-0 ${
                      parsedGram === g
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {g} gr
                  </button>
                ))}
              </div>

              {estimatedSellToday > 0 && (
                <div className="text-[11px] bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-700">
                    Estimasi Nilai Perak Hari Ini ({parsedGram}g @ {formatRupiah(activeSellPerGram)}/gr):
                  </span>
                  <strong className="font-mono tabular-nums text-slate-900">
                    {formatRupiah(estimatedSellToday)}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Nilai Nominal (Rp) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {activeGroup === 'cash'
                ? 'Saldo Tabungan (Rp) *'
                : kategori === 'emas' || kategori === 'perak'
                ? 'Harga Beli / Modal Awal (Rp) *'
                : 'Nilai Taksiran / Nilai Beli Aset (Rp) *'}
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
