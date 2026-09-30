/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  RotateCcw, 
  ReceiptText, 
  Calendar,
  PiggyBank,
  Coins,
  TrendingUp,
  Landmark,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HandCoins,
  BadgeAlert,
  Clock,
  Check
} from 'lucide-react';
import { KasTransaction, AsetTabungan, DebtRecord, TransactionType, DebtType } from './types/finance';
import { 
  loadTransactions, 
  saveTransactions, 
  loadAset, 
  saveAset, 
  loadDebts,
  saveDebts,
  exportTransactionsCSV,
  exportAsetCSV,
  exportDebtsCSV
} from './utils/storage';
import { getDefaultTransactions, getDefaultAset, getDefaultDebts } from './data/defaultData';
import { formatRupiah, formatDateIndo, getCurrentMonthKey, getMonthNameIndo } from './utils/formatters';
import { TransactionModal } from './components/TransactionModal';
import { AsetModal } from './components/AsetModal';
import { DebtModal } from './components/DebtModal';
import { DebtPaymentModal } from './components/DebtPaymentModal';

type ActiveViewTab = 'kas' | 'aset' | 'utang_piutang';

export default function App() {
  const [transactions, setTransactions] = useState<KasTransaction[]>(() => loadTransactions());
  const [asetList, setAsetList] = useState<AsetTabungan[]>(() => loadAset());
  const [debts, setDebts] = useState<DebtRecord[]>(() => loadDebts());
  
  // Navigation View Tab: 'kas' | 'aset' | 'utang_piutang'
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('kas');

  // Filters for Kas
  const [filterType, setFilterType] = useState<'semua' | 'pemasukan' | 'pengeluaran' | 'tabungan' | 'utang' | 'piutang'>('semua');
  const [selectedMonth, setSelectedMonth] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filters for Utang & Piutang
  const [debtFilter, setDebtFilter] = useState<'semua' | 'utang' | 'piutang' | 'belum_lunas' | 'lunas'>('semua');
  const [debtSearchQuery, setDebtSearchQuery] = useState<string>('');

  // Modals for Transactions CRUD
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<KasTransaction | null>(null);
  const [defaultModalType, setDefaultModalType] = useState<TransactionType>('pengeluaran');
  const [prefilledAsetId, setPrefilledAsetId] = useState<string | undefined>(undefined);

  // Modals for Aset CRUD
  const [isAsetModalOpen, setIsAsetModalOpen] = useState(false);
  const [editingAset, setEditingAset] = useState<AsetTabungan | null>(null);

  // Modals for Utang & Piutang CRUD
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [defaultDebtType, setDefaultDebtType] = useState<DebtType>('utang');

  // Modal for Catat Pembayaran Utang / Piutang
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeDebtForPayment, setActiveDebtForPayment] = useState<DebtRecord | null>(null);

  // Delete Confirmation States
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [deletingAsetId, setDeletingAsetId] = useState<string | null>(null);
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveAset(asetList);
  }, [asetList]);

  useEffect(() => {
    saveDebts(debts);
  }, [debts]);

  // Unique list of months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.tanggal && t.tanggal.length >= 7) {
        set.add(t.tanggal.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Calculations dataset (scoped to selected month or all)
  const calculationDataset = selectedMonth === 'semua' 
    ? transactions 
    : transactions.filter(t => t.tanggal.startsWith(selectedMonth));

  // 1. Saldo Kas & Cashflow
  const totalPemasukan = useMemo(() => {
    return calculationDataset
      .filter(t => t.jenis === 'pemasukan')
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [calculationDataset]);

  const totalPengeluaran = useMemo(() => {
    return calculationDataset
      .filter(t => t.jenis === 'pengeluaran')
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [calculationDataset]);

  const saldoKas = totalPemasukan - totalPengeluaran;

  // Total pengeluaran yang dialirkan masuk ke tabungan
  const totalMasukTabungan = useMemo(() => {
    return calculationDataset
      .filter(t => t.jenis === 'pengeluaran' && t.masukKeAsetId)
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [calculationDataset]);

  // 2. Total Aset & Tabungan
  const totalAset = useMemo(() => {
    return asetList.reduce((sum, a) => sum + a.nominal, 0);
  }, [asetList]);

  // 3. Total Utang (Kewajiban belum dibayar)
  const totalSisaUtang = useMemo(() => {
    return debts
      .filter(d => d.tipe === 'utang' && d.status === 'belum_lunas')
      .reduce((sum, d) => sum + d.sisaNominal, 0);
  }, [debts]);

  // 4. Total Piutang (Uang kita yang belum kembali)
  const totalSisaPiutang = useMemo(() => {
    return debts
      .filter(d => d.tipe === 'piutang' && d.status === 'belum_lunas')
      .reduce((sum, d) => sum + d.sisaNominal, 0);
  }, [debts]);

  // Total Kekayaan Bersih (Kas + Tabungan + Piutang - Utang)
  const totalKekayaanBersih = saldoKas + totalAset + totalSisaPiutang - totalSisaUtang;

  // Filtered transactions for the table
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType === 'pemasukan' && t.jenis !== 'pemasukan') return false;
      if (filterType === 'pengeluaran' && t.jenis !== 'pengeluaran') return false;
      if (filterType === 'tabungan' && (!t.masukKeAsetId || t.jenis !== 'pengeluaran')) return false;
      if (filterType === 'utang' && (t.terkaitDebtTipe !== 'utang')) return false;
      if (filterType === 'piutang' && (t.terkaitDebtTipe !== 'piutang')) return false;
      
      if (selectedMonth !== 'semua' && !t.tanggal.startsWith(selectedMonth)) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ketMatch = (t.keterangan || '').toLowerCase().includes(q);
        const katMatch = (t.kategori || '').toLowerCase().includes(q);
        const metMatch = (t.metodeKas || '').toLowerCase().includes(q);
        const astMatch = (t.masukKeAsetNama || '').toLowerCase().includes(q);
        const debtMatch = (t.terkaitDebtPihak || '').toLowerCase().includes(q);
        const tglMatch = (t.tanggal || '').includes(q);
        if (!ketMatch && !katMatch && !metMatch && !astMatch && !debtMatch && !tglMatch) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [transactions, filterType, selectedMonth, searchQuery]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      if (debtFilter === 'utang' && d.tipe !== 'utang') return false;
      if (debtFilter === 'piutang' && d.tipe !== 'piutang') return false;
      if (debtFilter === 'belum_lunas' && d.status !== 'belum_lunas') return false;
      if (debtFilter === 'lunas' && d.status !== 'lunas') return false;

      if (debtSearchQuery.trim()) {
        const q = debtSearchQuery.toLowerCase();
        const pihakMatch = d.pihak.toLowerCase().includes(q);
        const ketMatch = (d.keterangan || '').toLowerCase().includes(q);
        if (!pihakMatch && !ketMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'belum_lunas' ? -1 : 1;
      }
      return new Date(b.tanggalMulai).getTime() - new Date(a.tanggalMulai).getTime();
    });
  }, [debts, debtFilter, debtSearchQuery]);

  // Transaction CRUD Handlers
  const handleOpenCreateTx = (type: TransactionType, targetAset?: string) => {
    setEditingTransaction(null);
    setDefaultModalType(type);
    setPrefilledAsetId(targetAset);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: KasTransaction) => {
    setEditingTransaction(tx);
    setDefaultModalType(tx.jenis);
    setPrefilledAsetId(tx.masukKeAsetId);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = (savedTx: KasTransaction) => {
    // 1. Sinkronisasi saldo Aset/Tabungan jika ada pengeluaran masuk ke tabungan
    setAsetList(prevAset => {
      let copyAset = [...prevAset];

      if (editingTransaction && editingTransaction.masukKeAsetId) {
        const oldTargetIndex = copyAset.findIndex(a => a.id === editingTransaction.masukKeAsetId);
        if (oldTargetIndex >= 0) {
          copyAset[oldTargetIndex] = {
            ...copyAset[oldTargetIndex],
            nominal: Math.max(copyAset[oldTargetIndex].nominal - editingTransaction.nominal, 0),
            updatedAt: Date.now()
          };
        }
      }

      if (savedTx.jenis === 'pengeluaran' && savedTx.masukKeAsetId) {
        const newTargetIndex = copyAset.findIndex(a => a.id === savedTx.masukKeAsetId);
        if (newTargetIndex >= 0) {
          copyAset[newTargetIndex] = {
            ...copyAset[newTargetIndex],
            nominal: copyAset[newTargetIndex].nominal + savedTx.nominal,
            updatedAt: Date.now()
          };
        }
      }

      return copyAset;
    });

    // 2. Simpan transaksi ke Buku Kas
    setTransactions(prev => {
      const index = prev.findIndex(t => t.id === savedTx.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = savedTx;
        return updated;
      } else {
        return [savedTx, ...prev];
      }
    });

    setEditingTransaction(null);
    setPrefilledAsetId(undefined);
  };

  const handleDeleteTransaction = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;

    if (txToDelete.jenis === 'pengeluaran' && txToDelete.masukKeAsetId) {
      setAsetList(prevAset => {
        return prevAset.map(aset => {
          if (aset.id === txToDelete.masukKeAsetId) {
            return {
              ...aset,
              nominal: Math.max(aset.nominal - txToDelete.nominal, 0),
              updatedAt: Date.now()
            };
          }
          return aset;
        });
      });
    }

    if (txToDelete.terkaitDebtId) {
      setDebts(prevDebts => {
        return prevDebts.map(d => {
          if (d.id === txToDelete.terkaitDebtId) {
            const restoredSisa = Math.min(d.sisaNominal + txToDelete.nominal, d.totalNominal);
            return {
              ...d,
              sisaNominal: restoredSisa,
              status: (restoredSisa <= 0 ? 'lunas' : 'belum_lunas') as 'lunas' | 'belum_lunas',
              riwayatPembayaran: (d.riwayatPembayaran || []).filter(p => p.kasTransactionId !== txToDelete.id),
              updatedAt: Date.now()
            };
          }
          return d;
        });
      });
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    setDeletingTxId(null);
  };

  // Aset CRUD Handlers
  const handleOpenCreateAset = () => {
    setEditingAset(null);
    setIsAsetModalOpen(true);
  };

  const handleOpenEditAset = (aset: AsetTabungan) => {
    setEditingAset(aset);
    setIsAsetModalOpen(true);
  };

  const handleSaveAset = (savedAset: AsetTabungan) => {
    setAsetList(prev => {
      const index = prev.findIndex(a => a.id === savedAset.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = savedAset;
        return updated;
      } else {
        return [savedAset, ...prev];
      }
    });
  };

  const handleDeleteAset = (id: string) => {
    setAsetList(prev => prev.filter(a => a.id !== id));
    setDeletingAsetId(null);
  };

  // Utang & Piutang CRUD Handlers
  const handleOpenCreateDebt = (type: DebtType) => {
    setEditingDebt(null);
    setDefaultDebtType(type);
    setIsDebtModalOpen(true);
  };

  const handleOpenEditDebt = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setDefaultDebtType(debt.tipe);
    setIsDebtModalOpen(true);
  };

  const handleSaveDebt = (savedDebt: DebtRecord) => {
    setDebts(prev => {
      const index = prev.findIndex(d => d.id === savedDebt.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = savedDebt;
        return updated;
      } else {
        return [savedDebt, ...prev];
      }
    });
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    setDeletingDebtId(null);
  };

  // CATAT PEMBAYARAN UTANG / PIUTANG (MENGURANGI / MENAMBAH KAS)
  const handleOpenPayment = (debt: DebtRecord) => {
    setActiveDebtForPayment(debt);
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = (
    debtId: string, 
    nominal: number, 
    tanggal: string, 
    metodeKas: string, 
    keterangan: string
  ) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const txId = `tx-debt-${Date.now()}`;
    const paymentId = `pay-${Date.now()}`;

    const newTx: KasTransaction = {
      id: txId,
      tanggal,
      jenis: debt.tipe === 'utang' ? 'pengeluaran' : 'pemasukan',
      kategori: debt.tipe === 'utang' ? 'Pembayaran Utang' : 'Penerimaan Piutang',
      nominal,
      keterangan: keterangan || (debt.tipe === 'utang' ? `Bayar utang ke ${debt.pihak}` : `Terima bayar piutang dari ${debt.pihak}`),
      metodeKas,
      terkaitDebtId: debt.id,
      terkaitDebtTipe: debt.tipe,
      terkaitDebtPihak: debt.pihak,
      createdAt: Date.now()
    };

    setTransactions(prev => [newTx, ...prev]);

    const newSisa = Math.max(debt.sisaNominal - nominal, 0);
    const newStatus: 'belum_lunas' | 'lunas' = newSisa <= 0 ? 'lunas' : 'belum_lunas';

    const paymentObj = {
      id: paymentId,
      tanggal,
      nominal,
      metodeKas,
      keterangan,
      kasTransactionId: txId
    };

    setDebts(prev => {
      return prev.map(d => {
        if (d.id === debtId) {
          const newRiwayat = [...(d.riwayatPembayaran || []), paymentObj];
          return {
            ...d,
            sisaNominal: newSisa,
            status: newStatus,
            riwayatPembayaran: newRiwayat,
            updatedAt: Date.now()
          };
        }
        return d;
      });
    });

    setActiveDebtForPayment(null);
  };

  const handleResetData = () => {
    if (window.confirm('Apakah Anda yakin ingin memuat kembali contoh data awal (Buku Kas, Aset, dan Utang Piutang)?')) {
      setTransactions(getDefaultTransactions());
      setAsetList(getDefaultAset());
      setDebts(getDefaultDebts());
      setSelectedMonth('semua');
      setFilterType('semua');
      setDebtFilter('semua');
      setSearchQuery('');
      setDebtSearchQuery('');
    }
  };

  const getAsetIcon = (kategori: string) => {
    switch (kategori) {
      case 'emas':
        return <Coins className="w-5 h-5 text-amber-600" />;
      case 'investasi':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'deposito':
        return <Landmark className="w-5 h-5 text-blue-600" />;
      case 'properti':
        return <Building className="w-5 h-5 text-purple-600" />;
      default:
        return <PiggyBank className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                BukuKas<span className="text-emerald-600">.RumahTangga</span>
              </span>
              <span className="text-[11px] text-slate-400 block leading-none">
                Kas · Tabungan · Utang & Piutang
              </span>
            </div>
          </div>

          {/* Right Header: Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateTx('pemasukan')}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">+ Pemasukan</span>
              <span className="sm:hidden">+ Masuk</span>
            </button>

            <button
              onClick={() => handleOpenCreateTx('pengeluaran')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span className="hidden sm:inline">+ Pengeluaran</span>
              <span className="sm:hidden">+ Keluar</span>
            </button>

            <button
              onClick={() => handleOpenCreateDebt('utang')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer hidden md:flex items-center gap-1.5"
            >
              <HandCoins className="w-4 h-4 text-slate-600" />
              <span>+ Utang/Piutang</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Title & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {activeTab === 'kas' && 'Buku Kas & Pengeluaran'}
              {activeTab === 'aset' && 'Daftar Aset & Tabungan Keluarga'}
              {activeTab === 'utang_piutang' && 'Catatan Utang & Piutang'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'kas' && 'Catat uang masuk, pengeluaran harian, dan pembayaran utang piutang.'}
              {activeTab === 'aset' && 'Pos tabungan darurat, emas, dan simpanan keluarga yang terakumulasi.'}
              {activeTab === 'utang_piutang' && 'Bayar utang mengurangi kas, terima pelunasan piutang menambah kas.'}
            </p>
          </div>

          {/* Segmented View Switcher: Buku Kas vs Aset vs Utang & Piutang */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab('kas')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'kas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buku Kas ({transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('aset')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'aset'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tabungan ({asetList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('utang_piutang')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'utang_piutang'
                  ? 'bg-white text-rose-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HandCoins className="w-3.5 h-3.5 text-rose-600" />
              <span>Utang & Piutang ({debts.filter(d => d.status === 'belum_lunas').length})</span>
            </button>
          </div>
        </div>

        {/* 4 Main Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Saldo Kas Operasional */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Saldo Kas Operasional
                </span>
                <div className={`p-2 rounded-lg ${saldoKas >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              
              <div className={`text-2xl font-bold font-mono tracking-tight ${saldoKas >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatRupiah(saldoKas)}
              </div>
            </div>

            <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span>Uang kas harian</span>
              <span className="font-semibold text-slate-700 text-[11px]">
                {saldoKas >= 0 ? 'Kas Ada' : 'Defisit'}
              </span>
            </div>
          </div>

          {/* 2. Total Tabungan & Aset */}
          <div className="bg-white border border-indigo-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Total Tabungan & Aset
                </span>
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
              
              <div className="text-2xl font-bold font-mono text-indigo-900 tracking-tight">
                {formatRupiah(totalAset)}
              </div>
            </div>

            <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span>{asetList.length} Pos Simpanan</span>
              <button 
                onClick={() => setActiveTab('aset')}
                className="font-semibold text-indigo-600 hover:text-indigo-800 text-[11px] cursor-pointer"
              >
                Lihat →
              </button>
            </div>
          </div>

          {/* 3. Sisa Utang Kita (Kewajiban) */}
          <div className="bg-white border border-rose-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  Sisa Utang Kita
                </span>
                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              
              <div className="text-2xl font-bold font-mono text-rose-600 tracking-tight">
                {formatRupiah(totalSisaUtang)}
              </div>
            </div>

            <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span>Kewajiban harus dibayar</span>
              <button 
                onClick={() => { setActiveTab('utang_piutang'); setDebtFilter('utang'); }}
                className="font-semibold text-rose-600 hover:text-rose-800 text-[11px] cursor-pointer"
              >
                Bayar Utang →
              </button>
            </div>
          </div>

          {/* 4. Sisa Piutang (Hak Tagih Kita) */}
          <div className="bg-white border border-emerald-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Sisa Piutang (Tagihan)
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              
              <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">
                {formatRupiah(totalSisaPiutang)}
              </div>
            </div>

            <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span>Uang di pihak lain</span>
              <button 
                onClick={() => { setActiveTab('utang_piutang'); setDebtFilter('piutang'); }}
                className="font-semibold text-emerald-600 hover:text-emerald-800 text-[11px] cursor-pointer"
              >
                Terima Piutang →
              </button>
            </div>
          </div>

        </div>

        {/* VIEW 1: TABEL BUKU KAS (Pemasukan, Kas, Pengeluaran) */}
        {activeTab === 'kas' && (
          <div className="space-y-4">
            
            {/* Filter Bar & Controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Segmented Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setFilterType('semua')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'semua'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({transactions.length})
                  </button>

                  <button
                    onClick={() => setFilterType('pemasukan')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'pemasukan'
                        ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pemasukan ({transactions.filter(t => t.jenis === 'pemasukan').length})
                  </button>

                  <button
                    onClick={() => setFilterType('pengeluaran')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'pengeluaran'
                        ? 'bg-white text-rose-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pengeluaran ({transactions.filter(t => t.jenis === 'pengeluaran').length})
                  </button>

                  <button
                    onClick={() => setFilterType('tabungan')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'tabungan'
                        ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Masuk Tabungan ({transactions.filter(t => t.jenis === 'pengeluaran' && t.masukKeAsetId).length})
                  </button>

                  <button
                    onClick={() => setFilterType('utang')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'utang'
                        ? 'bg-white text-rose-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bayar Utang ({transactions.filter(t => t.terkaitDebtTipe === 'utang').length})
                  </button>

                  <button
                    onClick={() => setFilterType('piutang')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'piutang'
                        ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Terima Piutang ({transactions.filter(t => t.terkaitDebtTipe === 'piutang').length})
                  </button>
                </div>

                {/* Period & Search Input */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Period Filter */}
                  <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-slate-800 font-medium text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="semua">Semua Periode</option>
                      {availableMonths.map(m => (
                        <option key={m} value={m}>{getMonthNameIndo(m)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari transaksi / utang..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-900"
                    />
                  </div>

                  <button
                    onClick={() => exportTransactionsCSV(filteredTransactions)}
                    title="Download pembukuan kas ke Excel (CSV)"
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Ekspor CSV</span>
                  </button>

                  <button
                    onClick={handleResetData}
                    title="Kembalikan contoh data"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>

            {/* Tabel Transaksi */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Catatan Kas ({filteredTransactions.length} Transaksi)
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleOpenCreateTx('pemasukan')}
                    className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    + Pemasukan
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => handleOpenCreateTx('pengeluaran')}
                    className="font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    + Pengeluaran
                  </button>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="py-16 text-center">
                  <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-800">Belum ada transaksi pada daftar ini</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery ? 'Coba ganti kata kunci pencarian Anda.' : 'Mulai catat transaksi uang masuk atau pengeluaran belanja.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => handleOpenCreateTx('pemasukan')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      + Tambah Pemasukan
                    </button>
                    <button
                      onClick={() => handleOpenCreateTx('pengeluaran')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                    >
                      + Tambah Pengeluaran
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Jenis</th>
                        <th className="py-3 px-4">Kategori & Keterangan</th>
                        <th className="py-3 px-4">Metode Kas</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-center w-24">Aksi (CRUD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredTransactions.map((tx) => {
                        const isIncome = tx.jenis === 'pemasukan';
                        const goesToSavings = tx.jenis === 'pengeluaran' && tx.masukKeAsetId;
                        const isFromDebt = !!tx.terkaitDebtId;

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            
                            {/* Tanggal */}
                            <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {tx.tanggal}
                            </td>

                            {/* Jenis */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded ${
                                isIncome 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              }`}>
                                {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span>{isIncome ? 'Pemasukan (+)' : 'Pengeluaran (-)'}</span>
                              </span>
                            </td>

                            {/* Kategori, Keterangan & Badge Khusus */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">
                                {tx.keterangan || tx.kategori}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px]">
                                <span className="text-slate-400">Pos: {tx.kategori}</span>

                                {/* Badge Penanda Masuk ke Tabungan */}
                                {goesToSavings && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                                    <PiggyBank className="w-3 h-3 text-indigo-600" />
                                    <span>Masuk ke: {tx.masukKeAsetNama || 'Tabungan'}</span>
                                  </span>
                                )}

                                {/* Badge Penanda Pembayaran Utang / Piutang */}
                                {isFromDebt && (
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-medium border ${
                                    tx.terkaitDebtTipe === 'utang'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    <HandCoins className="w-3 h-3" />
                                    <span>{tx.terkaitDebtTipe === 'utang' ? `Bayar Utang: ${tx.terkaitDebtPihak}` : `Terima Piutang: ${tx.terkaitDebtPihak}`}</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Metode Kas */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                              {tx.metodeKas || 'Kas Tunai'}
                            </td>

                            {/* Nominal */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                              <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                                {isIncome ? '+' : '-'}{formatRupiah(tx.nominal)}
                              </span>
                            </td>

                            {/* Aksi CRUD: Edit & Delete */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditTx(tx)}
                                  title="Ubah transaksi (Edit)"
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setDeletingTxId(tx.id)}
                                  title="Hapus transaksi (Delete)"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        )}

        {/* VIEW 2: DAFTAR ASET & TABUNGAN */}
        {activeTab === 'aset' && (
          <div className="space-y-4">
            
            {/* Header Kontrol Aset */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Total Portofolio Tabungan & Aset: <span className="font-mono text-indigo-700">{formatRupiah(totalAset)}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap kali ada pengeluaran dialokasikan ke tabungan, saldo pos tabungan di bawah otomatis bertambah.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportAsetCSV(asetList)}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  onClick={handleOpenCreateAset}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Pos Tabungan Baru</span>
                </button>
              </div>
            </div>

            {/* Grid Kartu Aset / Tabungan */}
            {asetList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-16 text-center shadow-xs">
                <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800">Belum ada pos tabungan atau aset tercatat</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Buat pos tabungan darurat, tabungan pendidikan, emas, atau deposito keluarga Anda.
                </p>
                <button
                  onClick={handleOpenCreateAset}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                >
                  + Tambah Pos Tabungan Pertama
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asetList.map((aset) => {
                  return (
                    <div 
                      key={aset.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-200 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                              {getAsetIcon(aset.kategori)}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 leading-snug">{aset.nama}</h4>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {aset.institusi || 'Penyimpanan Pribadi'} · Kategori: {aset.kategori}
                              </span>
                            </div>
                          </div>

                          {/* Action CRUD: Edit & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditAset(aset)}
                              title="Ubah data tabungan (Edit)"
                              className="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingAsetId(aset.id)}
                              title="Hapus pos tabungan (Delete)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {aset.keterangan && (
                          <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg my-2 border border-slate-100/80 leading-relaxed">
                            💡 {aset.keterangan}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-400 block text-[11px]">Saldo Tabungan:</span>
                          <span className="text-lg font-bold font-mono text-indigo-700">
                            {formatRupiah(aset.nominal)}
                          </span>
                        </div>

                        {/* Tombol Cepat: Setor Uang dari Kas ke Tabungan Ini */}
                        <button
                          onClick={() => handleOpenCreateTx('pengeluaran', aset.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                          <span>+ Setor dari Kas</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: DAFTAR UTANG & PIUTANG */}
        {activeTab === 'utang_piutang' && (
          <div className="space-y-4">
            
            {/* Header Kontrol Utang Piutang */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Manajemen Utang & Piutang Keluarga
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <strong>Bayar Utang</strong> otomatis mengurangi kas. <strong>Terima Piutang</strong> otomatis menambah kas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportDebtsCSV(debts)}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  onClick={() => handleOpenCreateDebt('utang')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Catat Utang</span>
                </button>

                <button
                  onClick={() => handleOpenCreateDebt('piutang')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Catat Piutang</span>
                </button>
              </div>
            </div>

            {/* Filter Bar Utang Piutang */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 overflow-x-auto">
                <button
                  onClick={() => setDebtFilter('semua')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    debtFilter === 'semua' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({debts.length})
                </button>

                <button
                  onClick={() => setDebtFilter('belum_lunas')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    debtFilter === 'belum_lunas' ? 'bg-white text-amber-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Belum Lunas ({debts.filter(d => d.status === 'belum_lunas').length})
                </button>

                <button
                  onClick={() => setDebtFilter('utang')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    debtFilter === 'utang' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Utang Saja ({debts.filter(d => d.tipe === 'utang').length})
                </button>

                <button
                  onClick={() => setDebtFilter('piutang')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    debtFilter === 'piutang' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Piutang Saja ({debts.filter(d => d.tipe === 'piutang').length})
                </button>

                <button
                  onClick={() => setDebtFilter('lunas')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    debtFilter === 'lunas' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lunas ({debts.filter(d => d.status === 'lunas').length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={debtSearchQuery}
                  onChange={(e) => setDebtSearchQuery(e.target.value)}
                  placeholder="Cari nama orang / keterangan..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-900"
                />
              </div>

            </div>

            {/* List Utang & Piutang Cards */}
            {filteredDebts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-16 text-center shadow-xs">
                <HandCoins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800">Tidak ada catatan utang atau piutang</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Catat pinjaman yang harus Anda bayar atau piutang yang ingin Anda tagih.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => handleOpenCreateDebt('utang')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                  >
                    + Catat Utang Baru
                  </button>
                  <button
                    onClick={() => handleOpenCreateDebt('piutang')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                  >
                    + Catat Piutang Baru
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDebts.map((item) => {
                  const isUtang = item.tipe === 'utang';
                  const isLunas = item.status === 'lunas';
                  const terbayar = Math.max(item.totalNominal - item.sisaNominal, 0);
                  const persenLunas = item.totalNominal > 0 ? (terbayar / item.totalNominal) * 100 : 0;

                  return (
                    <div 
                      key={item.id}
                      className={`bg-white border rounded-xl p-5 shadow-xs transition-colors flex flex-col justify-between ${
                        isLunas ? 'border-slate-200 opacity-80' : isUtang ? 'border-rose-200/90' : 'border-emerald-200/90'
                      }`}
                    >
                      <div>
                        {/* Header Kartu */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                              isUtang 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            }`}>
                              {isUtang ? 'Utang (Kita Bayar)' : 'Piutang (Kita Tagih)'}
                            </span>

                            {isLunas ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                <Check className="w-3 h-3" />
                                <span>LUNAS</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" />
                                <span>BELUM LUNAS</span>
                              </span>
                            )}
                          </div>

                          {/* Action Edit & Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditDebt(item)}
                              title="Ubah rincian"
                              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingDebtId(item.id)}
                              title="Hapus catatan"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Nama Pihak */}
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          {item.pihak}
                        </h4>

                        {item.keterangan && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {item.keterangan}
                          </p>
                        )}

                        {/* Tanggal & Jatuh Tempo */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                          <span>Mulai: <strong className="font-mono text-slate-600">{item.tanggalMulai}</strong></span>
                          {item.jatuhTempo && (
                            <span>Jatuh Tempo: <strong className="font-mono text-rose-600">{item.jatuhTempo}</strong></span>
                          )}
                        </div>

                        {/* Progress Bar Pelunasan */}
                        <div className="mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLunas ? 'bg-emerald-500' : isUtang ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(persenLunas, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                          <span>Total: <strong className="font-mono text-slate-700">{formatRupiah(item.totalNominal)}</strong></span>
                          <span>Terbayar: <strong className="font-mono text-slate-700">{formatRupiah(terbayar)} ({persenLunas.toFixed(0)}%)</strong></span>
                        </div>
                      </div>

                      {/* Footer Kartu & Tombol Aksi Pembayaran */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-slate-400 block leading-tight">Sisa yang Belum Terbayar:</span>
                          <span className={`text-lg font-bold font-mono tracking-tight ${isLunas ? 'text-slate-400 line-through' : isUtang ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatRupiah(item.sisaNominal)}
                          </span>
                        </div>

                        {/* Tombol Pembayaran yang otomatis Memotong / Menambah Kas */}
                        {!isLunas ? (
                          <button
                            onClick={() => handleOpenPayment(item)}
                            className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                              isUtang 
                                ? 'bg-rose-600 hover:bg-rose-700' 
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {isUtang ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            <span>{isUtang ? 'Bayar Utang' : 'Terima Piutang'}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Sudah Lunas</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Banner Edukasi Mekanisme Kas */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs text-slate-600 leading-relaxed flex items-start gap-3">
              <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 shrink-0">
                <HandCoins className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">
                  Bagaimana Pembayaran Utang & Piutang Terhubung ke Saldo Kas?
                </span>
                <span>
                  • <strong>Bayar Utang</strong>: Saat Anda membayar angsuran atau melunasi utang, sistem otomatis membuat transaksi <em>Pengeluaran Kas</em>, sehingga uang kas berkurang dan sisa utang mengecil.<br/>
                  • <strong>Terima Bayar Piutang</strong>: Saat orang lain melunasi utangnya ke Anda, sistem otomatis membuat transaksi <em>Pemasukan Kas</em>, sehingga uang kas bertambah dan sisa piutang mengecil.
                </span>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">BukuKas Rumah Tangga</span>
            <span className="mx-2">·</span>
            <span>Kas Operasional, Tabungan & Aset, Utang dan Piutang Terintegrasi</span>
          </div>
          <div>
            Data tersimpan aman di browser (localStorage)
          </div>
        </div>
      </footer>

      {/* Modal CRUD: Create & Update Transaksi */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setPrefilledAsetId(undefined);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        defaultType={defaultModalType}
        asetList={asetList}
        prefilledAsetId={prefilledAsetId}
      />

      {/* Modal CRUD: Create & Update Aset */}
      <AsetModal
        isOpen={isAsetModalOpen}
        onClose={() => setIsAsetModalOpen(false)}
        onSave={handleSaveAset}
        initialData={editingAset}
      />

      {/* Modal CRUD: Create & Update Utang / Piutang */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        onSave={handleSaveDebt}
        initialData={editingDebt}
        defaultType={defaultDebtType}
      />

      {/* Modal Catat Pembayaran Utang / Piutang (Mengurangi / Menambah Kas) */}
      <DebtPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setActiveDebtForPayment(null);
        }}
        debt={activeDebtForPayment}
        onSavePayment={handleExecutePayment}
      />

      {/* Dialog Konfirmasi Hapus Transaksi */}
      {deletingTxId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Transaksi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan kas ini? Jika transaksi ini terkait pembayaran utang, piutang, atau tabungan, data terkait akan otomatis disesuaikan kembali.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingTxId(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteTransaction(deletingTxId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus Aset */}
      {deletingAsetId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Pos Tabungan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus pos tabungan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingAsetId(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteAset(deletingAsetId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                Hapus Tabungan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus Utang / Piutang */}
      {deletingDebtId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Catatan</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan utang/piutang ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingDebtId(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteDebt(deletingDebtId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
