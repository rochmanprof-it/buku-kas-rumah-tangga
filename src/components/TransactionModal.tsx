import React, { useState, useEffect } from 'react';
import { X, Check, ArrowUpRight, ArrowDownRight, PiggyBank } from 'lucide-react';
import { KasTransaction, TransactionType, AsetTabungan } from '../types/finance';
import { getTodayDateString, formatRupiah } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: KasTransaction) => void;
  initialData?: KasTransaction | null;
  defaultType?: TransactionType;
  asetList?: AsetTabungan[];
  prefilledAsetId?: string;
}

const KATEGORI_PEMASUKAN = [
  'Gaji Bulanan',
  'Usaha Sampingan',
  'Bonus & THR',
  'Hasil Jualan',
  'Hadiah / Pemberian',
  'Lain-lain'
];

const KATEGORI_PENGELUARAN = [
  'Menabung / Investasi',
  'Beli Emas / Logam Mulia',
  'Belanja Makan & Dapur',
  'Tagihan & Utilitas',
  'Pendidikan Anak',
  'Transportasi & Bensin',
  'Kebutuhan Rumah',
  'Kesehatan & Obat',
  'Makan di Luar & Jajan',
  'Sosial & Sedekah',
  'Cicilan & Hutang',
  'Lain-lain'
];

const METODE_KAS_LIST = ['Kas Tunai', 'Bank Transfer', 'e-Wallet'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = 'pengeluaran',
  asetList = [],
  prefilledAsetId
}) => {
  const isEditing = !!initialData;

  const [jenis, setJenis] = useState<TransactionType>(defaultType);
  const [tanggal, setTanggal] = useState<string>(getTodayDateString());
  const [nominal, setNominal] = useState<string>('');
  const [kategori, setKategori] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [metodeKas, setMetodeKas] = useState<string>('Kas Tunai');
  
  // Fitur Pengeluaran Masuk ke Tabungan
  const [isMasukTabungan, setIsMasukTabungan] = useState<boolean>(false);
  const [targetAsetId, setTargetAsetId] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setJenis(initialData.jenis);
      setTanggal(initialData.tanggal);
      setNominal(initialData.nominal.toString());
      setKategori(initialData.kategori);
      setKeterangan(initialData.keterangan);
      setMetodeKas(initialData.metodeKas || 'Kas Tunai');
      
      if (initialData.masukKeAsetId) {
        setIsMasukTabungan(true);
        setTargetAsetId(initialData.masukKeAsetId);
      } else {
        setIsMasukTabungan(false);
        setTargetAsetId(asetList[0]?.id || '');
      }
    } else {
      setJenis(defaultType);
      setTanggal(getTodayDateString());
      setNominal('');
      setKategori(defaultType === 'pemasukan' ? KATEGORI_PEMASUKAN[0] : KATEGORI_PENGELUARAN[0]);
      setKeterangan('');
      setMetodeKas('Kas Tunai');

      if (prefilledAsetId) {
        setIsMasukTabungan(true);
        setTargetAsetId(prefilledAsetId);
        const target = asetList.find(a => a.id === prefilledAsetId);
        if (target) {
          setKategori('Menabung / Investasi');
          setKeterangan(`Setor ke ${target.nama}`);
        }
      } else {
        setIsMasukTabungan(false);
        setTargetAsetId(asetList[0]?.id || '');
      }
    }
  }, [initialData, defaultType, isOpen, prefilledAsetId, asetList]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setJenis(newType);
    if (!isEditing) {
      setKategori(newType === 'pemasukan' ? KATEGORI_PEMASUKAN[0] : KATEGORI_PENGELUARAN[0]);
    }
    if (newType === 'pemasukan') {
      setIsMasukTabungan(false);
    }
  };

  const handleQuickAddNominal = (val: number) => {
    const cleanCurrent = nominal.toString().replace(/[^0-9]/g, '');
    const current = parseFloat(cleanCurrent) || 0;
    setNominal((current + val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = nominal.toString().replace(/[^0-9]/g, '');
    const num = parseFloat(cleanNum);
    if (!num || num <= 0) {
      alert('Silakan masukkan nominal angka yang valid (lebih dari 0).');
      return;
    }

    const selectedTargetAset = isMasukTabungan && jenis === 'pengeluaran' 
      ? asetList.find(a => a.id === targetAsetId) 
      : undefined;

    const tx: KasTransaction = {
      id: initialData ? initialData.id : `tx-${Date.now()}`,
      tanggal,
      jenis,
      kategori: kategori.trim() || (jenis === 'pemasukan' ? 'Pemasukan Lain' : 'Pengeluaran Lain'),
      nominal: num,
      keterangan: keterangan.trim() || (selectedTargetAset ? `Setor ke ${selectedTargetAset.nama}` : kategori.trim()),
      metodeKas,
      masukKeAsetId: selectedTargetAset ? selectedTargetAset.id : undefined,
      masukKeAsetNama: selectedTargetAset ? selectedTargetAset.nama : undefined,
      createdAt: initialData ? initialData.createdAt : Date.now()
    };

    onSave(tx);
    onClose();
  };

  const categories = jenis === 'pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;
  const targetAsetObj = asetList.find(a => a.id === targetAsetId) || asetList[0];
  const parsedNominal = parseInt(nominal.replace(/[^0-9]/g, ''), 10) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? 'Ubah Catatan Kas' : 'Tambah Catatan Kas Baru'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing ? 'Perbarui rincian transaksi pembukuan' : 'Catat uang masuk atau keluar'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
          
          {/* Toggle Jenis: Pemasukan vs Pengeluaran */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('pemasukan')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                jenis === 'pemasukan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pemasukan (+)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('pengeluaran')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                jenis === 'pengeluaran'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Pengeluaran (-)</span>
            </button>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Uang (Rp) *
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
                autoFocus
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
              {[50000, 100000, 250000, 500000, 1000000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddNominal(val)}
                  className="px-2 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
            </div>
          </div>

          {/* Fitur Khusus: Pengeluaran Masuk ke Tabungan / Aset */}
          {jenis === 'pengeluaran' && asetList.length > 0 && (
            <div className={`border rounded-xl p-3.5 transition-all ${
              isMasukTabungan 
                ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs' 
                : 'bg-slate-50/70 border-slate-200'
            }`}>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMasukTabungan}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsMasukTabungan(checked);
                    if (checked) {
                      if (!kategori || kategori === 'Belanja Makan & Dapur') {
                        setKategori('Menabung / Investasi');
                      }
                      if (!targetAsetId && asetList[0]) {
                        setTargetAsetId(asetList[0].id);
                      }
                    }
                  }}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <PiggyBank className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Pengeluaran ini Masuk ke Tabungan / Aset</span>
                  </span>
                  <span className="text-slate-500 block mt-0.5 leading-relaxed text-[11px]">
                    Uang kas harian berkurang, dan langsung menambah saldo pada pos tabungan/aset yang dipilih.
                  </span>
                </div>
              </label>

              {/* Dropdown Pos Tabungan Tujuan */}
              {isMasukTabungan && (
                <div className="mt-3 pt-2.5 border-t border-indigo-200/70 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-indigo-950">
                    Pilih Pos Tabungan / Aset Penerima:
                  </label>
                  <select
                    value={targetAsetId || (asetList[0]?.id ?? '')}
                    onChange={(e) => setTargetAsetId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {asetList.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nama} ({formatRupiah(a.nominal)}) · {a.institusi || a.kategori}
                      </option>
                    ))}
                  </select>

                  {targetAsetObj && parsedNominal > 0 && (
                    <div className="text-[11px] text-indigo-800 bg-white/80 p-2 rounded-md border border-indigo-200 mt-1">
                      Saldo <strong>{targetAsetObj.nama}</strong> akan bertambah dari {formatRupiah(targetAsetObj.nominal)} menjadi <strong className="font-mono text-indigo-900">{formatRupiah(targetAsetObj.nominal + parsedNominal)}</strong>.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tanggal & Metode Kas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Transaksi *
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Metode Kas
              </label>
              <select
                value={metodeKas}
                onChange={(e) => setMetodeKas(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
              >
                {METODE_KAS_LIST.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Kategori
            </label>
            <div className="flex gap-2">
              <select
                value={categories.includes(kategori) ? kategori : 'Lain-lain'}
                onChange={(e) => setKategori(e.target.value)}
                className="w-1/2 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                placeholder="Atau ketik kategori sendiri..."
                className="w-1/2 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
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
              placeholder={isMasukTabungan ? `Contoh: Setor tabungan ${targetAsetObj?.nama || ''}` : "Contoh: Belanja beras di warung / Gaji bulanan"}
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
                jenis === 'pemasukan' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Transaksi'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
