import React, { useState, useEffect } from 'react';
import { X, Check, ArrowUpRight, ArrowDownRight, PiggyBank, Banknote } from 'lucide-react';
import {
  KasTransaction,
  TransactionType,
  AsetTabungan,
  isCashSavings,
  METODE_PETTY_CASH,
  KATEGORI_ISI_PETTY_CASH,
} from '../types/finance';
import { getTodayDateString, formatRupiah } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: KasTransaction) => void;
  initialData?: KasTransaction | null;
  defaultType?: TransactionType;
  defaultMetodeKas?: string;
  asetList?: AsetTabungan[];
  prefilledAsetId?: string;
  saldoPettyCash?: number;
  saldoKasBank?: number;
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
  'Belanja Makan & Dapur',
  'Belanja Harian',
  'Transportasi & Bensin',
  'Kebutuhan Rumah',
  'Makan di Luar & Jajan',
  'Tagihan & Utilitas',
  'Pendidikan Anak',
  'Kesehatan & Obat',
  'Sosial & Sedekah',
  'Menabung / Investasi',
  'Beli Emas / Logam Mulia',
  'Cicilan & Hutang',
  'Lain-lain'
];

const METODE_KAS_LIST = ['Bank Transfer', 'e-Wallet', METODE_PETTY_CASH];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = 'pengeluaran',
  defaultMetodeKas = 'Bank Transfer',
  asetList = [],
  prefilledAsetId,
  saldoPettyCash = 0,
  saldoKasBank = 0,
}) => {
  const isEditing = !!initialData;

  const [jenis, setJenis] = useState<TransactionType>(defaultType);
  const [tanggal, setTanggal] = useState<string>(getTodayDateString());
  const [nominal, setNominal] = useState<string>('');
  const [kategori, setKategori] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [metodeKas, setMetodeKas] = useState<string>(defaultMetodeKas);
  
  // Fitur Pengeluaran Pindah ke Petty Cash (Tarik Tunai)
  const [isKePettyCash, setIsKePettyCash] = useState<boolean>(false);

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
      setMetodeKas(initialData.metodeKas || 'Bank Transfer');

      const isTopUp =
        initialData.jenis === 'pengeluaran' &&
        initialData.kategori === KATEGORI_ISI_PETTY_CASH;
      setIsKePettyCash(isTopUp);
      
      if (!isTopUp && initialData.masukKeAsetId) {
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
      setMetodeKas(defaultMetodeKas || 'Bank Transfer');
      setIsKePettyCash(false);

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
  }, [initialData, defaultType, defaultMetodeKas, isOpen, prefilledAsetId, asetList]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setJenis(newType);
    if (!isEditing) {
      setKategori(newType === 'pemasukan' ? KATEGORI_PEMASUKAN[0] : KATEGORI_PENGELUARAN[0]);
    }
    if (newType === 'pemasukan') {
      setIsMasukTabungan(false);
      setIsKePettyCash(false);
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

    const activeKePettyCash =
      jenis === 'pengeluaran' &&
      metodeKas !== METODE_PETTY_CASH &&
      (isKePettyCash || kategori.trim() === KATEGORI_ISI_PETTY_CASH);

    const selectedTargetAset =
      !activeKePettyCash && isMasukTabungan && jenis === 'pengeluaran'
        ? asetList.find(a => a.id === targetAsetId)
        : undefined;

    const finalKategori = activeKePettyCash
      ? KATEGORI_ISI_PETTY_CASH
      : kategori.trim() || (jenis === 'pemasukan' ? 'Pemasukan Lain' : 'Pengeluaran Lain');

    const finalKeterangan =
      keterangan.trim() ||
      (activeKePettyCash
        ? 'Tarik tunai dari kas operasional ke Petty Cash'
        : selectedTargetAset
        ? `Setor ke ${selectedTargetAset.nama}`
        : finalKategori);

    const tx: KasTransaction = {
      id: initialData ? initialData.id : `tx-${Date.now()}`,
      tanggal,
      jenis,
      kategori: finalKategori,
      nominal: num,
      keterangan: finalKeterangan,
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
  const isPettyCashSelected = metodeKas === METODE_PETTY_CASH;
  const metodeOptions =
    initialData?.metodeKas && !METODE_KAS_LIST.includes(initialData.metodeKas)
      ? [...METODE_KAS_LIST, initialData.metodeKas]
      : METODE_KAS_LIST;
  const nominalPresets = isPettyCashSelected
    ? [10000, 20000, 50000, 100000, 250000]
    : [50000, 100000, 250000, 500000, 1000000];
  const activeWalletBalance = isPettyCashSelected ? saldoPettyCash : saldoKasBank;
  const projectedWalletBalance =
    jenis === 'pemasukan' ? activeWalletBalance + parsedNominal : activeWalletBalance - parsedNominal;

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
              {nominalPresets.map(val => (
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

          {/* Fitur Khusus: Pengeluaran dari Kas Operasional ke Petty Cash */}
          {jenis === 'pengeluaran' && !isPettyCashSelected && (
            <div className={`border rounded-xl p-3.5 transition-all ${
              isKePettyCash
                ? 'bg-teal-50/80 border-teal-300 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200'
            }`}>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isKePettyCash}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsKePettyCash(checked);
                    if (checked) {
                      setIsMasukTabungan(false);
                      setKategori(KATEGORI_ISI_PETTY_CASH);
                      if (!keterangan.trim()) {
                        setKeterangan('Tarik tunai dari kas operasional ke Petty Cash');
                      }
                    } else if (kategori === KATEGORI_ISI_PETTY_CASH) {
                      setKategori(KATEGORI_PENGELUARAN[0]);
                    }
                  }}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Pindahkan ke Petty Cash (Tarik Tunai)</span>
                  </span>
                  <span className="text-slate-500 block mt-0.5 leading-relaxed text-[11px]">
                    Kas rekening otomatis terpotong dan saldo Petty Cash (cash di tangan) bertambah otomatis.
                  </span>
                </div>
              </label>

              {isKePettyCash && parsedNominal > 0 && !isEditing && (
                <div className="mt-2.5 pt-2.5 border-t border-teal-200/80 grid grid-cols-2 gap-2 text-[11px] bg-white/90 p-2.5 rounded-lg border border-teal-200">
                  <div>
                    <span className="text-slate-500 block">Kas Rekening:</span>
                    <span className="font-mono font-bold text-rose-600 tabular-nums">
                      {formatRupiah(saldoKasBank)} → {formatRupiah(saldoKasBank - parsedNominal)}
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-2.5">
                    <span className="text-teal-700 font-medium block">Petty Cash:</span>
                    <span className="font-mono font-bold text-teal-700 tabular-nums">
                      {formatRupiah(saldoPettyCash)} → {formatRupiah(saldoPettyCash + parsedNominal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      setIsKePettyCash(false);
                      if (!kategori || kategori === 'Belanja Makan & Dapur' || kategori === KATEGORI_ISI_PETTY_CASH) {
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
                    {asetList.filter(a => isCashSavings(a.kategori)).length > 0 && (
                      <optgroup label="💵 Tabungan Cash & Rekening Bank">
                        {asetList.filter(a => isCashSavings(a.kategori)).map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nama} ({formatRupiah(a.nominal)}) · {a.institusi || 'Bank'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {asetList.filter(a => !isCashSavings(a.kategori)).length > 0 && (
                      <optgroup label="🪙 Aset & Logam Mulia / Investasi">
                        {asetList.filter(a => !isCashSavings(a.kategori)).map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nama} ({formatRupiah(a.nominal)}) · {a.institusi || a.kategori}
                          </option>
                        ))}
                      </optgroup>
                    )}
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
                Sumber / Metode Kas
              </label>
              <select
                value={metodeKas}
                onChange={(e) => setMetodeKas(e.target.value)}
                className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-1 text-slate-900 cursor-pointer ${
                  isPettyCashSelected
                    ? 'border-teal-400 focus:ring-teal-500 font-semibold text-teal-900'
                    : 'border-slate-300 focus:ring-emerald-500'
                }`}
              >
                {metodeOptions.map(m => (
                  <option key={m} value={m}>
                    {m === METODE_PETTY_CASH ? 'Petty Cash (Cash di Tangan)' : m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info Saldo Dompet Aktif (Petty Cash vs Rekening Bank) */}
          <div className={`px-3 py-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
            isPettyCashSelected
              ? 'bg-teal-50/70 border-teal-200 text-teal-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="flex items-center gap-1.5 font-medium">
              <Banknote className={`w-3.5 h-3.5 shrink-0 ${isPettyCashSelected ? 'text-teal-600' : 'text-slate-500'}`} />
              <span>{isPettyCashSelected ? 'Saldo Petty Cash' : 'Saldo Rekening (Bank)'}</span>
            </span>
            <div className="font-mono tabular-nums text-right">
              <span className="font-semibold">{formatRupiah(activeWalletBalance)}</span>
              {parsedNominal > 0 && !isEditing && (
                <span className={`ml-1.5 font-bold ${projectedWalletBalance < 0 ? 'text-rose-600' : isPettyCashSelected ? 'text-teal-700' : 'text-slate-900'}`}>
                  → {formatRupiah(projectedWalletBalance)}
                </span>
              )}
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
