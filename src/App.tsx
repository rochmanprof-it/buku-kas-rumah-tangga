/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Check,
  Tag,
  X,
  Banknote,
  ArrowRightLeft,
  ChevronDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import {
  KasTransaction,
  AsetTabungan,
  DebtRecord,
  TransactionType,
  DebtType,
  AsetGroupType,
  GoldPriceSnapshot,
  isCashSavings,
  METODE_PETTY_CASH,
  isPettyCashTopUp,
  isPettyCashReturn,
  isPettyCashTransfer,
  isPettyCashLedgerEntry,
  calculateCashMetrics
} from './types/finance';
import {
  loadTransactions,
  saveTransactions,
  deleteTransactionInSupabase,
  loadAset,
  saveAset,
  deleteAsetInSupabase,
  loadDebts,
  saveDebts,
  deleteDebtInSupabase,
  exportTransactionsCSV,
  exportPettyCashCSV,
  exportAsetCSV,
  exportDebtsCSV
} from './utils/storage';
import { getDefaultTransactions, getDefaultAset, getDefaultDebts } from './data/defaultData';
import { formatRupiah, formatDateIndo, getCurrentMonthKey, getMonthNameIndo } from './utils/formatters';
import {
  loadCachedGoldPrices,
  saveCachedGoldPrices,
  loadGoldMetaMap,
  saveGoldMetaOverride,
  removeGoldMetaOverride,
  getAssetEstimatedSellValue,
  fetchLiveGoldPrices,
  GoldMetaMap,
  AssetSellValuation,
} from './utils/goldValuation';
import { TransactionModal } from './components/TransactionModal';
import { PettyCashTransferModal, PettyCashTransferMode } from './components/PettyCashTransferModal';
import { AsetModal } from './components/AsetModal';
import { DebtModal } from './components/DebtModal';
import { DebtPaymentModal } from './components/DebtPaymentModal';
import { JualAsetModal, JualAsetSubmitPayload } from './components/JualAsetModal';

type ActiveViewTab = 'kas' | 'petty_cash' | 'aset' | 'utang_piutang';

export default function App() {
  const [transactions, setTransactions] = useState<KasTransaction[]>([]);
  const [asetList, setAsetList] = useState<AsetTabungan[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  
  // Navigation View Tab: 'kas' | 'aset' | 'utang_piutang'
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('kas');

  // Filters for Kas
  const [filterType, setFilterType] = useState<'semua' | 'pemasukan' | 'pengeluaran' | 'petty_cash' | 'tabungan' | 'utang' | 'piutang'>('semua');
  const [selectedMonth, setSelectedMonth] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filters for Petty Cash
  const [pettyCashFilter, setPettyCashFilter] = useState<'semua' | 'belanja' | 'isi' | 'setor'>('semua');
  const [pettyCashMonth, setPettyCashMonth] = useState<string>('semua');
  const [pettyCashSearchQuery, setPettyCashSearchQuery] = useState<string>('');

  // Filters for Utang & Piutang
  const [debtFilter, setDebtFilter] = useState<'semua' | 'utang' | 'piutang' | 'belum_lunas' | 'lunas'>('semua');
  const [debtSearchQuery, setDebtSearchQuery] = useState<string>('');

  // Modals for Transactions CRUD
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<KasTransaction | null>(null);
  const [defaultModalType, setDefaultModalType] = useState<TransactionType>('pengeluaran');
  const [defaultModalMetodeKas, setDefaultModalMetodeKas] = useState<string>('Bank Transfer');
  const [prefilledAsetId, setPrefilledAsetId] = useState<string | undefined>(undefined);

  // Modal for Petty Cash Transfer (Isi Petty Cash / Setor ke Bank)
  const [isPettyCashModalOpen, setIsPettyCashModalOpen] = useState(false);
  const [pettyCashTransferMode, setPettyCashTransferMode] = useState<PettyCashTransferMode>('isi');
  const [editingPettyCashTransfer, setEditingPettyCashTransfer] = useState<KasTransaction | null>(null);

  // Filters & State for Aset & Tabungan
  const [asetFilter, setAsetFilter] = useState<'semua' | 'cash' | 'aset'>('semua');
  const [defaultAsetGroup, setDefaultAsetGroup] = useState<AsetGroupType>('cash');

  // Modals for Aset CRUD
  const [isAsetModalOpen, setIsAsetModalOpen] = useState(false);
  const [editingAset, setEditingAset] = useState<AsetTabungan | null>(null);

  // Modal for Jual Aset
  const [isJualModalOpen, setIsJualModalOpen] = useState(false);
  const [assetToSell, setAssetToSell] = useState<AsetTabungan | null>(null);
  const [saleNotification, setSaleNotification] = useState<{
    message: string;
    type: 'untung' | 'rugi' | 'impas';
  } | null>(null);

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

  // Dropdown Total Kas (Kas Rekening + Petty Cash)
  const [isTotalKasDropdownOpen, setIsTotalKasDropdownOpen] = useState(false);
  const totalKasDropdownRef = useRef<HTMLDivElement | null>(null);

  // Live Gold & Silver Prices (Antam, UBS, Galeri 24, Perak) & Weight/Brand Meta
  const [goldPrices, setGoldPrices] = useState<GoldPriceSnapshot | null>(() => loadCachedGoldPrices());
  const [isLoadingGoldPrices, setIsLoadingGoldPrices] = useState(false);
  const [goldPriceError, setGoldPriceError] = useState<string | null>(null);
  const [isEditingManualGold, setIsEditingManualGold] = useState(false);
  const [manualAntamSell, setManualAntamSell] = useState('');
  const [manualUbsSell, setManualUbsSell] = useState('');
  const [manualG24Sell, setManualG24Sell] = useState('');
  const [manualPerakSell, setManualPerakSell] = useState('');
  const [goldMetaMap, setGoldMetaMap] = useState<GoldMetaMap>(() => loadGoldMetaMap());

  // Close Total Kas dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        totalKasDropdownRef.current &&
        !totalKasDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTotalKasDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fetch live gold & silver prices on mount when cache is empty, stale, or missing silver quote
  useEffect(() => {
    let active = true;
    const cached = loadCachedGoldPrices();
    const isStale =
      !cached ||
      Date.now() - cached.fetchedAt > 15 * 60 * 1000 ||
      (!cached.perak && !cached.isManualOverride);
    if (!isStale) return;

    setIsLoadingGoldPrices(true);
    setGoldPriceError(null);
    fetchLiveGoldPrices(false)
      .then((snapshot) => {
        if (!active) return;
        setGoldPrices(snapshot);
      })
      .catch((err) => {
        if (!active) return;
        setGoldPriceError(err instanceof Error ? err.message : 'Gagal memuat harga emas & perak hari ini.');
      })
      .finally(() => {
        if (active) setIsLoadingGoldPrices(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRefreshGoldPrices = async () => {
    setIsLoadingGoldPrices(true);
    setGoldPriceError(null);
    try {
      const snapshot = await fetchLiveGoldPrices(true);
      setGoldPrices(snapshot);
    } catch (err) {
      setGoldPriceError(err instanceof Error ? err.message : 'Gagal memperbarui harga emas & perak.');
    } finally {
      setIsLoadingGoldPrices(false);
    }
  };

  const handleOpenManualGoldEditor = () => {
    setManualAntamSell(goldPrices?.antam?.sellPerGram ? goldPrices.antam.sellPerGram.toString() : '');
    setManualUbsSell(goldPrices?.ubs?.sellPerGram ? goldPrices.ubs.sellPerGram.toString() : '');
    setManualG24Sell(goldPrices?.galeri24?.sellPerGram ? goldPrices.galeri24.sellPerGram.toString() : '');
    setManualPerakSell(goldPrices?.perak?.sellPerGram ? goldPrices.perak.sellPerGram.toString() : '');
    setIsEditingManualGold((prev) => !prev);
  };

  const handleSaveManualGoldPrices = (e: React.FormEvent) => {
    e.preventDefault();
    const antamSell = parseInt(manualAntamSell.replace(/[^0-9]/g, ''), 10) || 0;
    const ubsSell = parseInt(manualUbsSell.replace(/[^0-9]/g, ''), 10) || 0;
    const g24Sell = parseInt(manualG24Sell.replace(/[^0-9]/g, ''), 10) || 0;
    const perakSell = parseInt(manualPerakSell.replace(/[^0-9]/g, ''), 10) || 0;

    if (antamSell <= 0 || ubsSell <= 0 || g24Sell <= 0) {
      setGoldPriceError('Masukkan harga jual (buyback) per gram > 0 untuk Antam, UBS, dan Galeri 24.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const manualSnapshot: GoldPriceSnapshot = {
      antam: {
        brand: 'antam',
        label: 'Antam',
        buyPerGram: goldPrices?.antam?.buyPerGram || antamSell,
        sellPerGram: antamSell,
      },
      ubs: {
        brand: 'ubs',
        label: 'UBS',
        buyPerGram: goldPrices?.ubs?.buyPerGram || ubsSell,
        sellPerGram: ubsSell,
      },
      galeri24: {
        brand: 'galeri24',
        label: 'Galeri 24 (G24)',
        buyPerGram: goldPrices?.galeri24?.buyPerGram || g24Sell,
        sellPerGram: g24Sell,
      },
      perak:
        perakSell > 0
          ? {
              label: 'Perak (Silver)',
              buyPerGram: goldPrices?.perak?.buyPerGram || perakSell,
              sellPerGram: perakSell,
            }
          : goldPrices?.perak,
      priceDate: todayStr,
      fetchedAt: Date.now(),
      sources: [{ title: 'Input Harga Manual Pengguna', uri: '' }],
      isManualOverride: true,
    };

    saveCachedGoldPrices(manualSnapshot);
    setGoldPrices(manualSnapshot);
    setGoldPriceError(null);
    setIsEditingManualGold(false);
  };

  // Sync to localStorage / Supabase
  useEffect(() => {
  async function fetchData() {
    const transactionsData = await loadTransactions();
    const asetData = await loadAset();
    const debtsData = await loadDebts();
    
    setTransactions(transactionsData);
    setAsetList(asetData);
    setDebts(debtsData);
  }
  fetchData();
}, []);

// Sync ke Supabase / Local Storage secara otomatis ketika state berubah
  useEffect(() => {
    if (transactions.length > 0) {
      saveTransactions(transactions);
    }
  }, [transactions]);

  useEffect(() => {
    if (asetList.length > 0) {
      saveAset(asetList);
    }
  }, [asetList]);

  useEffect(() => {
    if (debts.length > 0) {
      saveDebts(debts);
    }
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

  // 1. Saldo Kas Rekening (Bank) & Petty Cash (Cash di Tangan)
  const cashMetrics = useMemo(() => calculateCashMetrics(calculationDataset), [calculationDataset]);
  const allTimeCashMetrics = useMemo(() => calculateCashMetrics(transactions), [transactions]);

  const totalPemasukan = cashMetrics.totalPemasukanRiil;
  const totalPengeluaran = cashMetrics.totalPengeluaranRiil;
  const saldoKasBank = cashMetrics.saldoKasBank;
  const saldoPettyCash = cashMetrics.saldoPettyCash;
  const saldoKas = cashMetrics.totalSaldoKas;

  // Petty Cash metrics scoped to Petty Cash tab period filter
  const pettyCashPeriodDataset = useMemo(() => {
    const base = pettyCashMonth === 'semua'
      ? transactions
      : transactions.filter(t => t.tanggal.startsWith(pettyCashMonth));
    return base.filter(isPettyCashLedgerEntry);
  }, [transactions, pettyCashMonth]);

  const pettyCashMetrics = useMemo(() => {
    const raw = pettyCashMonth === 'semua'
      ? transactions
      : transactions.filter(t => t.tanggal.startsWith(pettyCashMonth));
    return calculateCashMetrics(raw);
  }, [transactions, pettyCashMonth]);

  const pettyCashCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let totalSpent = 0;
    for (const t of pettyCashPeriodDataset) {
      if (!isPettyCashTransfer(t) && t.jenis === 'pengeluaran' && t.metodeKas === METODE_PETTY_CASH) {
        const cat = t.kategori || 'Lain-lain';
        map.set(cat, (map.get(cat) || 0) + t.nominal);
        totalSpent += t.nominal;
      }
    }
    return Array.from(map.entries())
      .map(([kategori, total]) => ({
        kategori,
        total,
        persen: totalSpent > 0 ? (total / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [pettyCashPeriodDataset]);

  // Total pengeluaran yang dialirkan masuk ke tabungan
  const totalMasukTabungan = useMemo(() => {
    return calculationDataset
      .filter(t => t.jenis === 'pengeluaran' && t.masukKeAsetId)
      .reduce((sum, t) => sum + t.nominal, 0);
  }, [calculationDataset]);

  // 2. Pemisahan Tabungan Cash vs Aset & Logam Mulia (dengan Estimasi Jual Emas Hari Ini)
  const cashSavingsItems = useMemo(() => {
    return asetList.filter(a => isCashSavings(a.kategori));
  }, [asetList]);

  const physicalAssetsItems = useMemo(() => {
    return asetList.filter(a => !isCashSavings(a.kategori));
  }, [asetList]);

  const assetValuations = useMemo(() => {
    const map: Record<string, AssetSellValuation> = {};
    for (const aset of asetList) {
      map[aset.id] = getAssetEstimatedSellValue(aset, goldPrices, goldMetaMap);
    }
    return map;
  }, [asetList, goldPrices, goldMetaMap]);

  const totalTabunganCash = useMemo(() => {
    return cashSavingsItems.reduce((sum, a) => sum + a.nominal, 0);
  }, [cashSavingsItems]);

  const totalAsetLogamMulia = useMemo(() => {
    return physicalAssetsItems.reduce(
      (sum, a) => sum + (assetValuations[a.id]?.displayNominal ?? a.nominal),
      0
    );
  }, [physicalAssetsItems, assetValuations]);

  const goldValuationSummary = useMemo(() => {
    let totalPurchase = 0;
    let totalSellEstimate = 0;
    let liveGoldCount = 0;

    for (const a of physicalAssetsItems) {
      const val = assetValuations[a.id];
      if (val?.isGoldAsset && val.isLiveGoldEstimate) {
        totalPurchase += val.purchaseNominal;
        totalSellEstimate += val.displayNominal;
        liveGoldCount += 1;
      }
    }

    return {
      hasLiveGold: liveGoldCount > 0,
      unrealizedPnL: totalSellEstimate - totalPurchase,
      unrealizedPct:
        totalPurchase > 0 ? ((totalSellEstimate - totalPurchase) / totalPurchase) * 100 : 0,
    };
  }, [physicalAssetsItems, assetValuations]);

  const totalAset = totalTabunganCash + totalAsetLogamMulia;

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

  // Filtered transactions for the Buku Kas table
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType === 'pemasukan' && (t.jenis !== 'pemasukan' || isPettyCashTransfer(t))) return false;
      if (filterType === 'pengeluaran' && (t.jenis !== 'pengeluaran' || isPettyCashTransfer(t))) return false;
      if (filterType === 'petty_cash' && !isPettyCashLedgerEntry(t)) return false;
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
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() || b.createdAt - a.createdAt);
  }, [transactions, filterType, selectedMonth, searchQuery]);

  // Filtered transactions for the Petty Cash ledger
  const allPettyCashTransactions = useMemo(() => {
    return transactions.filter(isPettyCashLedgerEntry);
  }, [transactions]);

  const filteredPettyCashTransactions = useMemo(() => {
    return pettyCashPeriodDataset.filter(t => {
      if (pettyCashFilter === 'belanja' && (isPettyCashTransfer(t) || t.jenis !== 'pengeluaran')) return false;
      if (pettyCashFilter === 'isi' && !isPettyCashTopUp(t) && (isPettyCashTransfer(t) || t.jenis !== 'pemasukan')) return false;
      if (pettyCashFilter === 'setor' && !isPettyCashReturn(t)) return false;

      if (pettyCashSearchQuery.trim()) {
        const q = pettyCashSearchQuery.toLowerCase();
        const ketMatch = (t.keterangan || '').toLowerCase().includes(q);
        const katMatch = (t.kategori || '').toLowerCase().includes(q);
        const tglMatch = (t.tanggal || '').includes(q);
        if (!ketMatch && !katMatch && !tglMatch) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() || b.createdAt - a.createdAt);
  }, [pettyCashPeriodDataset, pettyCashFilter, pettyCashSearchQuery]);

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
  const handleOpenCreateTx = (type: TransactionType, targetAset?: string, metodeKas?: string) => {
    setEditingTransaction(null);
    setDefaultModalType(type);
    setDefaultModalMetodeKas(metodeKas || 'Bank Transfer');
    setPrefilledAsetId(targetAset);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTx = (tx: KasTransaction) => {
    if (isPettyCashTransfer(tx)) {
      setEditingPettyCashTransfer(tx);
      setPettyCashTransferMode(isPettyCashReturn(tx) ? 'setor' : 'isi');
      setIsPettyCashModalOpen(true);
      return;
    }
    setEditingTransaction(tx);
    setDefaultModalType(tx.jenis);
    setDefaultModalMetodeKas(tx.metodeKas || 'Bank Transfer');
    setPrefilledAsetId(tx.masukKeAsetId);
    setIsTxModalOpen(true);
  };

  const handleOpenPettyCashTransfer = (mode: PettyCashTransferMode = 'isi') => {
    setEditingPettyCashTransfer(null);
    setPettyCashTransferMode(mode);
    setIsPettyCashModalOpen(true);
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

  const handleDeleteTransaction = async (id: string) => {
  const txToDelete = transactions.find(t => t.id === id);
  if (!txToDelete) return;

  // 1. Hapus transaksi dari Supabase
  await deleteTransactionInSupabase(id);

  // 2. Kembalikan saldo tabungan jika transaksi masuk ke tabungan
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

  // 3. Kembalikan sisa utang/piutang jika transaksi adalah pembayaran
  if (txToDelete.terkaitDebtId) {
    setDebts(prevDebts => {
      return prevDebts.map(d => {
        if (d.id === txToDelete.terkaitDebtId) {
          const restoredSisa = Math.min(
            d.sisaNominal + txToDelete.nominal,
            d.totalNominal
          );

          return {
            ...d,
            sisaNominal: restoredSisa,
            status: (restoredSisa <= 0 ? 'lunas' : 'belum_lunas') as 'lunas' | 'belum_lunas',
            riwayatPembayaran: (d.riwayatPembayaran || []).filter(
              p => p.kasTransactionId !== txToDelete.id
            ),
            updatedAt: Date.now()
          };
        }
        return d;
      });
    });
  }

  // 4. Hapus dari state React
  setTransactions(prev => prev.filter(t => t.id !== id));

  setDeletingTxId(null);
};

  // Aset & Tabungan CRUD Handlers
  const handleOpenCreateAset = (group: AsetGroupType = 'cash') => {
    setEditingAset(null);
    setDefaultAsetGroup(group);
    setIsAsetModalOpen(true);
  };

  const handleOpenEditAset = (aset: AsetTabungan) => {
    setEditingAset(aset);
    setDefaultAsetGroup(isCashSavings(aset.kategori) ? 'cash' : 'aset');
    setIsAsetModalOpen(true);
  };

  const handleSaveAset = (savedAset: AsetTabungan) => {
    if (savedAset.kategori === 'emas' || savedAset.kategori === 'perak') {
      const nextMeta = saveGoldMetaOverride(savedAset.id, {
        merekEmas: savedAset.kategori === 'emas' ? savedAset.merekEmas : undefined,
        beratGram: savedAset.beratGram,
      });
      setGoldMetaMap(nextMeta);
    } else {
      setGoldMetaMap(removeGoldMetaOverride(savedAset.id));
    }

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

  const handleDeleteAset = async (id: string) => {
    // 1. Hapus dari Supabase
    await deleteAsetInSupabase(id);

    // 2. Hapus metadata emas & state React
    setGoldMetaMap(removeGoldMetaOverride(id));
    setAsetList(prev => prev.filter(a => a.id !== id));

    setDeletingAsetId(null);
  };

  // Handler Jual Aset / Logam Mulia
  const handleOpenJualAset = (aset: AsetTabungan) => {
    setAssetToSell(aset);
    setIsJualModalOpen(true);
  };

  const handleExecuteJualAset = async (payload: JualAsetSubmitPayload) => {
    const {
      aset,
      hargaJual,
      selisihUntungRugi,
      persentaseUntungRugi,
      tujuanHasil,
      targetTabunganId,
      targetTabunganNama,
      tanggal,
      metodeKas,
      keteranganTambahan,
      isJualSebagian,
      sisaNilaiBukuAset,
    } = payload;

    const untungRugiText = selisihUntungRugi > 0
      ? `Untung ${formatRupiah(selisihUntungRugi)} (+${persentaseUntungRugi.toFixed(1)}%)`
      : selisihUntungRugi < 0
      ? `Rugi ${formatRupiah(Math.abs(selisihUntungRugi))} (${persentaseUntungRugi.toFixed(1)}%)`
      : 'Impas / Modal Balik';

    const porsiDesc = isJualSebagian ? ' [Jual Sebagian]' : '';
    const destDesc = tujuanHasil === 'tabungan' ? ` → Masuk ke ${targetTabunganNama || 'Tabungan'}` : ' → Masuk ke Kas';
    const detailTambahan = keteranganTambahan ? ` (${keteranganTambahan})` : '';

    const txKeterangan = `Hasil Jual ${aset.nama}${porsiDesc} · ${untungRugiText}${destDesc}${detailTambahan}`;

    // 1. Catat transaksi pemasukan di buku kas
    const newTx: KasTransaction = {
      id: `tx-jual-${Date.now()}`,
      tanggal,
      jenis: 'pemasukan',
      kategori: 'Penjualan Aset / Investasi',
      nominal: hargaJual,
      keterangan: txKeterangan,
      metodeKas,
      masukKeAsetId: tujuanHasil === 'tabungan' ? targetTabunganId : undefined,
      masukKeAsetNama: tujuanHasil === 'tabungan' ? targetTabunganNama : undefined,
      createdAt: Date.now(),
    };

    setTransactions(prev => [newTx, ...prev]);

    // 2. Update atau lepas kepemilikan aset yang dijual
    if (isJualSebagian && sisaNilaiBukuAset > 0) {
      const updatedAset: AsetTabungan = {
        ...aset,
        nominal: sisaNilaiBukuAset,
        updatedAt: Date.now(),
      };
      setAsetList(prev => prev.map(a => a.id === aset.id ? updatedAset : a));
    } else {
      await deleteAsetInSupabase(aset.id);
      setGoldMetaMap(removeGoldMetaOverride(aset.id));
      setAsetList(prev => prev.filter(a => a.id !== aset.id));
    }

    // 3. Jika hasil penjualan masuk ke pos tabungan cash tertentu
    if (tujuanHasil === 'tabungan' && targetTabunganId) {
      setAsetList(prev => {
        return prev.map(a => {
          if (a.id === targetTabunganId) {
            return {
              ...a,
              nominal: a.nominal + hargaJual,
              updatedAt: Date.now(),
            };
          }
          return a;
        });
      });
    }

    // 4. Tampilkan pesan feedback notifikasi
    setSaleNotification({
      message: `Aset "${aset.nama}" berhasil dijual seharga ${formatRupiah(hargaJual)}! Realisasi: ${untungRugiText}. Hasil penjualan masuk ke ${tujuanHasil === 'tabungan' ? targetTabunganNama : 'Kas Operasional'}.`,
      type: selisihUntungRugi > 0 ? 'untung' : selisihUntungRugi < 0 ? 'rugi' : 'impas',
    });

    setTimeout(() => {
      setSaleNotification(null);
    }, 7000);
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

  const handleDeleteDebt = async (id: string) => {
  // 1. Hapus utang/piutang dan pembayaran terkait dari Supabase
  await deleteDebtInSupabase(id);

  // 2. Hapus dari state React
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
    if (window.confirm('Apakah Anda yakin ingin memuat kembali contoh data awal (Buku Kas, Petty Cash, Aset, dan Utang Piutang)?')) {
      setTransactions(getDefaultTransactions());
      setAsetList(getDefaultAset());
      setDebts(getDefaultDebts());
      setSelectedMonth('semua');
      setFilterType('semua');
      setPettyCashFilter('semua');
      setPettyCashMonth('semua');
      setPettyCashSearchQuery('');
      setDebtFilter('semua');
      setSearchQuery('');
      setDebtSearchQuery('');
    }
  };

  const getAsetIcon = (kategori: string) => {
    switch (kategori) {
      case 'emas':
        return <Coins className="w-5 h-5 text-amber-500" />;
      case 'perak':
        return <Coins className="w-5 h-5 text-slate-500" />;
      case 'investasi':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'deposito':
        return <Landmark className="w-5 h-5 text-blue-600" />;
      case 'kas_fisik':
        return <Wallet className="w-5 h-5 text-emerald-600" />;
      case 'properti':
        return <Building className="w-5 h-5 text-purple-600" />;
      default:
        return <PiggyBank className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getAsetKategoriLabel = (kategori: string) => {
    switch (kategori) {
      case 'emas':
        return 'Logam Mulia / Emas';
      case 'perak':
        return 'Perak / Silver';
      case 'investasi':
        return 'Investasi / Pasar Modal';
      case 'deposito':
        return 'Deposito Bank';
      case 'kas_fisik':
        return 'Kas Tunai Simpanan';
      case 'properti':
        return 'Properti & Tanah';
      case 'tabungan':
        return 'Tabungan Bank';
      default:
        return 'Aset Lainnya';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      
      {/* Top Bar Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight whitespace-nowrap">
                BukuKas<span className="text-emerald-600">.RumahTangga</span>
              </span>
              <span className="text-[11px] text-slate-400 block leading-none whitespace-nowrap">
                Kas Rekening · Petty Cash · Tabungan · Utang Piutang
              </span>
            </div>
          </div>

          {/* Right Header: Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenPettyCashTransfer('isi')}
              className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 whitespace-nowrap"
              title="Tarik tunai dari rekening ke dompet Petty Cash"
            >
              <Banknote className="w-4 h-4 text-teal-600" />
              <span>Isi Petty Cash</span>
            </button>

            <button
              onClick={() => handleOpenCreateTx('pemasukan', undefined, activeTab === 'petty_cash' ? METODE_PETTY_CASH : 'Bank Transfer')}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">+ Pemasukan</span>
              <span className="sm:hidden">+ Masuk</span>
            </button>

            <button
              onClick={() => handleOpenCreateTx('pengeluaran', undefined, activeTab === 'petty_cash' ? METODE_PETTY_CASH : 'Bank Transfer')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span className="hidden sm:inline">+ Pengeluaran</span>
              <span className="sm:hidden">+ Keluar</span>
            </button>

            <button
              onClick={() => handleOpenCreateDebt('utang')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer hidden md:flex items-center gap-1.5 whitespace-nowrap"
            >
              <HandCoins className="w-4 h-4 text-slate-600" />
              <span>+ Utang/Piutang</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Banner Notifikasi Realisasi Penjualan Aset */}
        {saleNotification && (
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-xs animate-fade-in ${
            saleNotification.type === 'untung'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : saleNotification.type === 'rugi'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-indigo-50 border-indigo-300 text-indigo-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${
                saleNotification.type === 'untung' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
              }`}>
                <Tag className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold leading-relaxed">
                {saleNotification.message}
              </span>
            </div>
            <button
              onClick={() => setSaleNotification(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Title & View Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {activeTab === 'kas' && 'Buku Kas & Mutasi Rekening'}
              {activeTab === 'petty_cash' && 'Petty Cash (Cash di Tangan)'}
              {activeTab === 'aset' && 'Daftar Aset & Tabungan Keluarga'}
              {activeTab === 'utang_piutang' && 'Catatan Utang & Piutang'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'kas' && 'Catat uang masuk rekening, tarik tunai Petty Cash, dan pengeluaran keluarga.'}
              {activeTab === 'petty_cash' && 'Catat penarikan tunai (misal Rp 500rb/minggu) dan lacak detail belanja cash harian.'}
              {activeTab === 'aset' && 'Pos tabungan darurat, emas, dan simpanan keluarga yang terakumulasi.'}
              {activeTab === 'utang_piutang' && 'Bayar utang mengurangi kas, terima pelunasan piutang menambah kas.'}
            </p>
          </div>

          {/* Segmented View Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl self-start lg:self-auto border border-slate-200/60 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('kas')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'kas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buku Kas ({transactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('petty_cash')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'petty_cash'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5 text-teal-600" />
              <span>Petty Cash ({allPettyCashTransactions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('aset')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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

        {/* 6 Main Financial KPI Cards (Total Kas Dropdown, Petty Cash, Tabungan Cash, Aset & Emas, Utang, Piutang) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          
          {/* 1. Total Kas (Dropdown: Kas Rekening + Petty Cash) */}
          <div
            ref={totalKasDropdownRef}
            className="relative bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <button
                  type="button"
                  onClick={() => setIsTotalKasDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <span>Total Kas</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
                      isTotalKasDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setIsTotalKasDropdownOpen((prev) => !prev)}
                  title="Lihat rincian Kas Rekening & Petty Cash"
                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                    saldoKas >= 0
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setIsTotalKasDropdownOpen((prev) => !prev)}
                className={`text-left text-lg font-bold font-mono tabular-nums tracking-tight cursor-pointer hover:opacity-80 transition-opacity ${
                  saldoKas >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatRupiah(saldoKas)}
              </button>
            </div>

            <div className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsTotalKasDropdownOpen((prev) => !prev)}
                className="truncate text-left hover:text-slate-800 cursor-pointer"
              >
                Rek + Petty Cash
              </button>
              <button
                type="button"
                onClick={() => setIsTotalKasDropdownOpen((prev) => !prev)}
                className="font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-0.5"
              >
                <span>Rincian</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isTotalKasDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {isTotalKasDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Rincian Saldo Kas
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTotalKasDropdownOpen(false)}
                    className="p-0.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kas Rekening (Bank)</span>
                    </div>
                    <div className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${saldoKasBank >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {formatRupiah(saldoKasBank)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTotalKasDropdownOpen(false);
                      handleOpenPettyCashTransfer('isi');
                    }}
                    className="px-2 py-1 text-[10px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Isi Tunai →
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-teal-50/50 border border-teal-200/80 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold text-teal-900 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-teal-600" />
                      <span>Petty Cash (Cash di Tangan)</span>
                    </div>
                    <div className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${saldoPettyCash >= 0 ? 'text-teal-900' : 'text-rose-600'}`}>
                      {formatRupiah(saldoPettyCash)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTotalKasDropdownOpen(false);
                      setActiveTab('petty_cash');
                    }}
                    className="px-2 py-1 text-[10px] font-semibold text-teal-800 bg-white hover:bg-teal-100 border border-teal-200 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Detail →
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Total Gabungan</span>
                  <span className="font-bold font-mono tabular-nums text-slate-900">
                    {formatRupiah(saldoKas)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Petty Cash (Cash di Tangan) */}
          <div className="bg-white border border-teal-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900">
                  Petty Cash
                </span>
                <div className={`p-1.5 rounded-lg ${saldoPettyCash >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              
              <div className={`text-lg font-bold font-mono tabular-nums tracking-tight ${saldoPettyCash >= 0 ? 'text-teal-900' : 'text-rose-600'}`}>
                {formatRupiah(saldoPettyCash)}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="truncate">Cash di tangan</span>
              <button
                onClick={() => setActiveTab('petty_cash')}
                className="font-semibold text-teal-700 hover:text-teal-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                Detail →
              </button>
            </div>
          </div>

          {/* 3. Tabungan Cash / Bank (Likuid) */}
          <div className="bg-white border border-indigo-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
                  Tabungan Cash
                </span>
                <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
              
              <div className="text-lg font-bold font-mono tabular-nums text-indigo-900 tracking-tight">
                {formatRupiah(totalTabunganCash)}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="truncate">{cashSavingsItems.length} Pos</span>
              <button 
                onClick={() => { setActiveTab('aset'); setAsetFilter('cash'); }}
                className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                Lihat →
              </button>
            </div>
          </div>

          {/* 4. Aset & Logam Mulia (Estimasi Jual Hari Ini) */}
          <div className="bg-white border border-amber-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Aset & Emas
                </span>
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              
              <div
                title={
                  goldValuationSummary.hasLiveGold
                    ? `Nilai aset berdasarkan estimasi harga jual/buyback emas hari ini (${goldPrices?.priceDate || 'terbaru'})`
                    : 'Total nilai aset & logam mulia'
                }
                className="text-lg font-bold font-mono tabular-nums text-amber-900 tracking-tight"
              >
                {formatRupiah(totalAsetLogamMulia)}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="truncate">
                {goldValuationSummary.hasLiveGold ? (
                  <span
                    className={`font-mono font-semibold ${
                      goldValuationSummary.unrealizedPnL >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    Est. jual {goldValuationSummary.unrealizedPnL >= 0 ? '+' : ''}
                    {goldValuationSummary.unrealizedPct.toFixed(1)}%
                  </span>
                ) : (
                  `${physicalAssetsItems.length} Pos`
                )}
              </span>
              <button 
                onClick={() => { setActiveTab('aset'); setAsetFilter('aset'); }}
                className="font-semibold text-amber-700 hover:text-amber-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                Lihat →
              </button>
            </div>
          </div>

          {/* 5. Sisa Utang Kita (Kewajiban) */}
          <div className="bg-white border border-rose-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
                  Sisa Utang
                </span>
                <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              
              <div className="text-lg font-bold font-mono tabular-nums text-rose-600 tracking-tight">
                {formatRupiah(totalSisaUtang)}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="truncate">Kewajiban</span>
              <button 
                onClick={() => { setActiveTab('utang_piutang'); setDebtFilter('utang'); }}
                className="font-semibold text-rose-600 hover:text-rose-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                Bayar →
              </button>
            </div>
          </div>

          {/* 6. Sisa Piutang (Hak Tagih Kita) */}
          <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  Sisa Piutang
                </span>
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 tracking-tight">
                {formatRupiah(totalSisaPiutang)}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="truncate">Hak tagih</span>
              <button 
                onClick={() => { setActiveTab('utang_piutang'); setDebtFilter('piutang'); }}
                className="font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer whitespace-nowrap shrink-0"
              >
                Terima →
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
                    Pemasukan ({transactions.filter(t => t.jenis === 'pemasukan' && !isPettyCashTransfer(t)).length})
                  </button>

                  <button
                    onClick={() => setFilterType('pengeluaran')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'pengeluaran'
                        ? 'bg-white text-rose-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pengeluaran ({transactions.filter(t => t.jenis === 'pengeluaran' && !isPettyCashTransfer(t)).length})
                  </button>

                  <button
                    onClick={() => setFilterType('petty_cash')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      filterType === 'petty_cash'
                        ? 'bg-white text-teal-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Petty Cash ({allPettyCashTransactions.length})
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
                        const isTopUpPC = isPettyCashTopUp(tx);
                        const isReturnPC = isPettyCashReturn(tx);
                        const isTransferPC = isTopUpPC || isReturnPC;
                        const isPettyCashTx = tx.metodeKas === METODE_PETTY_CASH;
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
                              {isTransferPC ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>{isTopUpPC ? 'Isi Petty Cash' : 'Setor ke Bank'}</span>
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded ${
                                  isIncome 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                }`}>
                                  {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  <span>{isIncome ? 'Pemasukan (+)' : 'Pengeluaran (-)'}</span>
                                </span>
                              )}
                            </td>

                            {/* Kategori, Keterangan & Badge Khusus */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">
                                {tx.keterangan || tx.kategori}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px]">
                                <span className="text-slate-400">Pos: {tx.kategori}</span>

                                {isTransferPC && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                                    <Banknote className="w-3 h-3 text-teal-600" />
                                    <span>{isTopUpPC ? `${tx.metodeKas} → Petty Cash` : `Petty Cash → ${tx.metodeKas}`}</span>
                                  </span>
                                )}

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

                                {/* Badge Penanda Hasil Jual Aset */}
                                {tx.kategori?.includes('Penjualan Aset') && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-medium border bg-amber-50 text-amber-800 border-amber-200">
                                    <Tag className="w-3 h-3 text-amber-600" />
                                    <span>Hasil Jual Aset</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Metode Kas */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                              {isPettyCashTx ? (
                                <span className="inline-flex items-center gap-1 font-medium text-teal-800">
                                  <Banknote className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Petty Cash</span>
                                </span>
                              ) : (
                                tx.metodeKas || 'Bank Transfer'
                              )}
                            </td>

                            {/* Nominal */}
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                              {isTransferPC ? (
                                <span className="text-teal-700">
                                  {formatRupiah(tx.nominal)}
                                </span>
                              ) : (
                                <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                                  {isIncome ? '+' : '-'}{formatRupiah(tx.nominal)}
                                </span>
                              )}
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

        {/* VIEW 1B: PETTY CASH (CASH DI TANGAN & RINCIAN BELANJA TUNAI) */}
        {activeTab === 'petty_cash' && (
          <div className="space-y-4">

            {/* Summary Dompet Petty Cash */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block">
                    Saldo Petty Cash (Cash di Tangan)
                  </span>
                  <div className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight mt-1 ${
                    pettyCashMetrics.saldoPettyCash >= 0 ? 'text-teal-900' : 'text-rose-600'
                  }`}>
                    {formatRupiah(pettyCashMetrics.saldoPettyCash)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
                    <span>
                      Total Tarik Tunai: <strong className="font-mono tabular-nums text-teal-800">+{formatRupiah(pettyCashMetrics.totalTopUpPettyCash)}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      Total Belanja Tunai: <strong className="font-mono tabular-nums text-rose-600">-{formatRupiah(pettyCashMetrics.totalBelanjaPettyCash)}</strong>
                    </span>
                    {pettyCashMetrics.totalSetorPettyCash > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>
                          Setor Balik ke Bank: <strong className="font-mono tabular-nums text-slate-700">{formatRupiah(pettyCashMetrics.totalSetorPettyCash)}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi Cepat Petty Cash */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenPettyCashTransfer('isi')}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>+ Isi Petty Cash (Tarik Tunai)</span>
                  </button>

                  <button
                    onClick={() => handleOpenCreateTx('pengeluaran', undefined, METODE_PETTY_CASH)}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>- Catat Belanja Tunai</span>
                  </button>

                  <button
                    onClick={() => handleOpenPettyCashTransfer('setor')}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    title="Kembalikan sisa uang tunai ke rekening bank"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                    <span>Setor ke Bank</span>
                  </button>

                  <button
                    onClick={() => exportPettyCashCSV(filteredPettyCashTransactions)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Ekspor CSV</span>
                  </button>
                </div>
              </div>

              {/* Ringkasan Pengeluaran Petty Cash per Kategori */}
              {pettyCashCategoryBreakdown.length > 0 && (
                <div className="pt-3.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Rincian Pemakaian Cash per Kategori
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                      Total terpakai: <strong className="text-slate-800">{formatRupiah(pettyCashMetrics.totalBelanjaPettyCash)}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {pettyCashCategoryBreakdown.slice(0, 8).map((item) => (
                      <div key={item.kategori} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-slate-800 truncate">{item.kategori}</span>
                          <span className="font-mono tabular-nums text-slate-500 shrink-0">{item.persen.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${Math.min(item.persen, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs font-mono tabular-nums font-bold text-rose-600">
                          {formatRupiah(item.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Bar Petty Cash */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 overflow-x-auto">
                <button
                  onClick={() => setPettyCashFilter('semua')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    pettyCashFilter === 'semua'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({pettyCashPeriodDataset.length})
                </button>

                <button
                  onClick={() => setPettyCashFilter('belanja')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    pettyCashFilter === 'belanja'
                      ? 'bg-white text-rose-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Belanja Tunai ({pettyCashPeriodDataset.filter(t => !isPettyCashTransfer(t) && t.jenis === 'pengeluaran').length})
                </button>

                <button
                  onClick={() => setPettyCashFilter('isi')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    pettyCashFilter === 'isi'
                      ? 'bg-white text-teal-800 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tarik Tunai / Masuk ({pettyCashPeriodDataset.filter(t => isPettyCashTopUp(t) || (!isPettyCashTransfer(t) && t.jenis === 'pemasukan')).length})
                </button>

                <button
                  onClick={() => setPettyCashFilter('setor')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    pettyCashFilter === 'setor'
                      ? 'bg-white text-slate-800 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Setor ke Bank ({pettyCashPeriodDataset.filter(isPettyCashReturn).length})
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={pettyCashMonth}
                    onChange={(e) => setPettyCashMonth(e.target.value)}
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
                    value={pettyCashSearchQuery}
                    onChange={(e) => setPettyCashSearchQuery(e.target.value)}
                    placeholder="Cari rincian belanja tunai..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Tabel Rincian Petty Cash */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Buku Detail Petty Cash ({filteredPettyCashTransactions.length} Catatan)
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleOpenPettyCashTransfer('isi')}
                    className="font-semibold text-teal-700 hover:text-teal-800 cursor-pointer whitespace-nowrap"
                  >
                    + Tarik Tunai
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => handleOpenCreateTx('pengeluaran', undefined, METODE_PETTY_CASH)}
                    className="font-semibold text-rose-600 hover:text-rose-700 cursor-pointer whitespace-nowrap"
                  >
                    - Belanja Tunai
                  </button>
                </div>
              </div>

              {filteredPettyCashTransactions.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <Banknote className="w-10 h-10 text-teal-300 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-800">Belum ada catatan Petty Cash</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Mulai dengan menarik tunai dari kas rekening (misal Rp 500.000 per minggu), lalu catat detail belanja uang cash Anda setiap hari.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => handleOpenPettyCashTransfer('isi')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer"
                    >
                      + Isi Petty Cash (Rp 500rb)
                    </button>
                    <button
                      onClick={() => handleOpenCreateTx('pengeluaran', undefined, METODE_PETTY_CASH)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                    >
                      - Catat Belanja Tunai
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Tipe Mutasi</th>
                        <th className="py-3 px-4">Detail Belanja / Keterangan</th>
                        <th className="py-3 px-4">Sumber / Tujuan</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredPettyCashTransactions.map((tx) => {
                        const isTopUp = isPettyCashTopUp(tx);
                        const isReturn = isPettyCashReturn(tx);
                        const isInflowToPettyCash = isTopUp || (!isReturn && tx.jenis === 'pemasukan');

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                              {tx.tanggal}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isTopUp ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>Isi Petty Cash</span>
                                </span>
                              ) : isReturn ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Setor ke Bank</span>
                                </span>
                              ) : tx.jenis === 'pemasukan' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>Pemasukan Tunai</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  <ArrowDownRight className="w-3 h-3" />
                                  <span>Belanja Tunai</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">
                                {tx.keterangan || tx.kategori}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Pos: {tx.kategori}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                              {isTopUp
                                ? `Dari ${tx.metodeKas}`
                                : isReturn
                                ? `Ke ${tx.metodeKas}`
                                : 'Dompet Petty Cash'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                              <span className={isInflowToPettyCash ? 'text-teal-700' : 'text-rose-600'}>
                                {isInflowToPettyCash ? '+' : '-'}{formatRupiah(tx.nominal)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditTx(tx)}
                                  title="Ubah catatan"
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingTxId(tx.id)}
                                  title="Hapus catatan"
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

        {/* VIEW 2: DAFTAR ASET & TABUNGAN (TERPISAH ANTARA TABUNGAN CASH VS ASET LOGAM MULIA) */}
        {activeTab === 'aset' && (
          <div className="space-y-6">
            
            {/* Header Kontrol & Portofolio Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Portofolio Gabungan
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {asetList.length} Total Pos
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight mt-1">
                    {formatRupiah(totalAset)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Simpanan uang kas cair dan aset bernilai jangka panjang keluarga tercatat terpisah secara rapi.
                  </p>
                </div>

                {/* Sub-Ringkasan & Tombol Tambah Spesifik */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenCreateAset('cash')}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tabungan Cash</span>
                  </button>

                  <button
                    onClick={() => handleOpenCreateAset('aset')}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Coins className="w-4 h-4" />
                    <span>+ Logam Mulia / Aset</span>
                  </button>

                  <button
                    onClick={() => exportAsetCSV(asetList)}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Ekspor CSV</span>
                  </button>
                </div>
              </div>

              {/* Sub-Total Chips & Tab Filter */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                
                {/* Segmented Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/60 overflow-x-auto">
                  <button
                    onClick={() => setAsetFilter('semua')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      asetFilter === 'semua'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Pos ({asetList.length})
                  </button>

                  <button
                    onClick={() => setAsetFilter('cash')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      asetFilter === 'cash'
                        ? 'bg-white text-indigo-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PiggyBank className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tabungan Cash ({cashSavingsItems.length})</span>
                  </button>

                  <button
                    onClick={() => setAsetFilter('aset')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      asetFilter === 'aset'
                        ? 'bg-white text-amber-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span>Aset & Logam Mulia ({physicalAssetsItems.length})</span>
                  </button>
                </div>

                {/* Ringkasan Subtotal Cepat */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="text-slate-500">Cash:</span>
                    <strong className="font-mono text-indigo-900 font-bold">{formatRupiah(totalTabunganCash)}</strong>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-slate-500">Aset/Emas:</span>
                    <strong className="font-mono text-amber-900 font-bold">{formatRupiah(totalAsetLogamMulia)}</strong>
                  </div>
                </div>

              </div>
            </div>

            {/* ========================================================================= */}
            {/* BAGIAN 1: TABUNGAN CASH & REKENING BANK (LIKUID)                          */}
            {/* ========================================================================= */}
            {(asetFilter === 'semua' || asetFilter === 'cash') && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                      <PiggyBank className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Tabungan Cash & Rekening Bank</span>
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                          {cashSavingsItems.length} Pos
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Uang simpanan likuid: tabungan dana darurat, rekening harian, deposito, dan kas simpanan.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200/60">
                      Total: {formatRupiah(totalTabunganCash)}
                    </span>
                    <button
                      onClick={() => handleOpenCreateAset('cash')}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Pos Cash</span>
                    </button>
                  </div>
                </div>

                {cashSavingsItems.length === 0 ? (
                  <div className="bg-white border border-dashed border-indigo-200 rounded-xl p-8 text-center shadow-xs">
                    <PiggyBank className="w-9 h-9 text-indigo-300 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-slate-800">Belum ada pos tabungan cash</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                      Catat rekening bank (BCA, Mandiri, BSI), tabungan dana darurat, atau deposito keluarga Anda.
                    </p>
                    <button
                      onClick={() => handleOpenCreateAset('cash')}
                      className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                    >
                      + Tambah Tabungan Cash
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {cashSavingsItems.map((aset) => {
                      return (
                        <div 
                          key={aset.id}
                          className="bg-white border border-indigo-100/90 hover:border-indigo-300 rounded-xl p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                                  {getAsetIcon(aset.kategori)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{aset.nama}</h4>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                      {getAsetKategoriLabel(aset.kategori)}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 block mt-0.5">
                                    Institusi: <strong>{aset.institusi || 'Bank'}</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Action CRUD: Edit & Delete */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditAset(aset)}
                                  title="Ubah data tabungan"
                                  className="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingAsetId(aset.id)}
                                  title="Hapus pos tabungan"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {aset.keterangan && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg my-1.5 border border-slate-100 leading-relaxed text-[11px]">
                                💡 {aset.keterangan}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Saldo Tabungan:</span>
                              <span className="text-lg font-bold font-mono text-indigo-900">
                                {formatRupiah(aset.nominal)}
                              </span>
                            </div>

                            {/* Tombol Cepat: Setor Uang dari Kas */}
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

            {/* ========================================================================= */}
            {/* BAGIAN 2: ASET, LOGAM MULIA & INVESTASI (ASET BERNILAI NON-KAS)          */}
            {/* ========================================================================= */}
            {(asetFilter === 'semua' || asetFilter === 'aset') && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Aset, Logam Mulia & Investasi
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {physicalAssetsItems.length} pos · Estimasi total saat dijual hari ini:{' '}
                      <strong className="font-mono tabular-nums text-slate-900">
                        {formatRupiah(totalAsetLogamMulia)}
                      </strong>
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenCreateAset('aset')}
                    className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Aset / Logam Mulia</span>
                  </button>
                </div>

                {/* Strip Referensi Harga Jual (Buyback) Hari Ini */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs font-semibold text-slate-800">
                        Harga Jual (Buyback) Hari Ini
                      </span>
                      {goldPrices?.priceDate && (
                        <>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className="text-xs text-slate-500">{goldPrices.priceDate}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleRefreshGoldPrices}
                        disabled={isLoadingGoldPrices}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingGoldPrices ? 'animate-spin' : ''}`} />
                        <span>{isLoadingGoldPrices ? 'Memperbarui...' : 'Perbarui'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenManualGoldEditor}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {isEditingManualGold ? 'Tutup' : 'Atur Manual'}
                      </button>
                    </div>
                  </div>

                  {goldPriceError && (
                    <div className="px-4 py-2.5 text-xs text-rose-700 bg-rose-50 border-b border-rose-100 flex items-center justify-between gap-2">
                      <span>{goldPriceError}</span>
                      <button
                        type="button"
                        onClick={handleOpenManualGoldEditor}
                        className="font-semibold underline cursor-pointer shrink-0"
                      >
                        Input Manual
                      </button>
                    </div>
                  )}

                  {isEditingManualGold && (
                    <form
                      onSubmit={handleSaveManualGoldPrices}
                      className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
                    >
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Antam (Rp/gr)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={manualAntamSell}
                          onChange={(e) => setManualAntamSell(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="2175000"
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          UBS (Rp/gr)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={manualUbsSell}
                          onChange={(e) => setManualUbsSell(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="2175000"
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Galeri 24 (Rp/gr)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={manualG24Sell}
                          onChange={(e) => setManualG24Sell(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="2199000"
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Perak (Rp/gr)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={manualPerakSell}
                          onChange={(e) => setManualPerakSell(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="25500"
                          className="w-full px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      >
                        Simpan Harga
                      </button>
                    </form>
                  )}

                  {goldPrices ? (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                        {([goldPrices.antam, goldPrices.ubs, goldPrices.galeri24] as const).map((q) => (
                          <div key={q.brand} className="px-4 py-3 space-y-0.5">
                            <span className="text-xs font-medium text-slate-500 block">
                              Emas {q.label}
                            </span>
                            <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                              {formatRupiah(q.sellPerGram)}
                              <span className="text-xs font-normal text-slate-400">/gr</span>
                            </div>
                            <span className="text-[11px] text-slate-400 block font-mono tabular-nums">
                              Beli: {formatRupiah(q.buyPerGram)}
                            </span>
                          </div>
                        ))}

                        <div className="px-4 py-3 space-y-0.5">
                          <span className="text-xs font-medium text-slate-500 block">
                            Perak (Silver)
                          </span>
                          <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                            {goldPrices.perak?.sellPerGram
                              ? formatRupiah(goldPrices.perak.sellPerGram)
                              : 'Belum diatur'}
                            {goldPrices.perak?.sellPerGram ? (
                              <span className="text-xs font-normal text-slate-400">/gr</span>
                            ) : null}
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            Harga pasar per gram
                          </span>
                        </div>
                      </div>

                      {goldPrices.sources && goldPrices.sources.some((s) => s.uri) && (
                        <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          <span>Sumber:</span>
                          {goldPrices.sources
                            .filter((s) => s.uri)
                            .slice(0, 3)
                            .map((s, idx) => (
                              <a
                                key={`${s.uri}-${idx}`}
                                href={s.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline"
                              >
                                <span className="truncate max-w-[200px]">{s.title || s.uri}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    !isLoadingGoldPrices && (
                      <div className="px-4 py-3 text-xs text-slate-500">
                        Belum ada data harga emas & perak hari ini. Klik <strong>Perbarui</strong> atau <strong>Atur Manual</strong> untuk menghitung estimasi nilai jual.
                      </div>
                    )
                  )}
                </div>

                {physicalAssetsItems.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-slate-800">Belum ada pos logam mulia atau aset</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Catat kepemilikan emas Antam, UBS, Galeri 24, perak batangan, investasi, atau properti keluarga.
                    </p>
                    <button
                      onClick={() => handleOpenCreateAset('aset')}
                      className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
                    >
                      + Tambah Logam Mulia / Aset
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {physicalAssetsItems.map((aset) => {
                      const val = assetValuations[aset.id];
                      const isPerak = val?.isSilverAsset || aset.kategori === 'perak';
                      const isEmas = !isPerak && aset.kategori === 'emas';
                      const hasLiveRate = isEmas
                        ? Boolean(val?.isLiveGoldEstimate)
                        : isPerak
                        ? Boolean(val?.isLiveSilverEstimate)
                        : false;

                      const subtitleParts: string[] = [];
                      if (isPerak) {
                        subtitleParts.push('Perak / Silver');
                      } else if (isEmas && val?.merekLabel) {
                        subtitleParts.push(`Emas ${val.merekLabel}`);
                      } else {
                        subtitleParts.push(getAsetKategoriLabel(aset.kategori));
                      }
                      if ((isEmas || isPerak) && val?.beratGram && val.beratGram > 0) {
                        subtitleParts.push(`${val.beratGram} gr`);
                      }
                      if (aset.institusi) {
                        subtitleParts.push(aset.institusi);
                      }

                      return (
                        <div
                          key={aset.id}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs transition-colors flex flex-col justify-between gap-4"
                        >
                          {/* Header Kartu: Judul & Metadata Bersih Tanpa Pill */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-slate-900 leading-snug truncate">
                                {aset.nama}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {subtitleParts.join(' · ')}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenEditAset(aset)}
                                title="Ubah data aset"
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingAsetId(aset.id)}
                                title="Hapus aset"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Nilai Utama: Estimasi Jual vs Modal Beli */}
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs text-slate-500 block">
                                {hasLiveRate
                                  ? 'Estimasi Jual Hari Ini'
                                  : isPerak
                                  ? 'Nilai Aset Perak'
                                  : isEmas
                                  ? 'Nilai Estimasi Emas'
                                  : 'Nilai Taksiran'}
                              </span>
                              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-0.5">
                                {formatRupiah(val?.displayNominal ?? aset.nominal)}
                              </div>
                              {hasLiveRate && val?.beratGram && val?.sellPerGram && (
                                <span className="text-xs font-mono text-slate-400 block mt-0.5">
                                  {val.beratGram} gr × {formatRupiah(val.sellPerGram)}/gr
                                </span>
                              )}
                            </div>

                            {(isEmas || isPerak) && (
                              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 block">Modal Beli</span>
                                  <span className="font-mono tabular-nums font-semibold text-slate-700 mt-0.5 block">
                                    {formatRupiah(aset.nominal)}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400 block">Selisih Hari Ini</span>
                                  {hasLiveRate && val ? (
                                    <span
                                      className={`font-mono tabular-nums font-semibold mt-0.5 block ${
                                        val.unrealizedPnL >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                      }`}
                                    >
                                      {val.unrealizedPnL >= 0 ? '+' : '-'}
                                      {formatRupiah(Math.abs(val.unrealizedPnL))} ({val.unrealizedPnL >= 0 ? '+' : ''}
                                      {val.unrealizedPct.toFixed(1)}%)
                                    </span>
                                  ) : val?.needsGramInput ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditAset(aset)}
                                      className="font-semibold text-amber-700 hover:underline cursor-pointer mt-0.5 block text-left"
                                    >
                                      {isPerak ? 'Isi berat gram →' : 'Isi merek & gram →'}
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 mt-0.5 block">-</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {aset.keterangan && (
                              <p className="text-xs text-slate-500 leading-relaxed">
                                {aset.keterangan}
                              </p>
                            )}
                          </div>

                          {/* Aksi Kartu */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenCreateTx('pengeluaran', aset.id)}
                              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              + Tambah
                            </button>

                            <button
                              onClick={() => handleOpenJualAset(aset)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              title="Jual aset ini, catat harga jual, realisasi untung/rugi, dan masukkan ke kas/tabungan"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span>Jual</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Banner Penjelasan Pemisahan Kas vs Logam Mulia */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed flex items-start gap-3">
              <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-700 shrink-0">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">
                  Mengapa Tabungan Cash dan Aset Logam Mulia Dipisahkan?
                </span>
                <span>
                  • <strong>Tabungan Cash</strong> adalah dana likuid yang dapat ditarik sewaktu-waktu tanpa risiko fluktuasi harga (misalnya dana darurat di bank BCA/BSI atau deposito).<br/>
                  • <strong>Aset & Logam Mulia</strong> adalah aset fisik atau investasi berharga (seperti emas Antam atau reksadana) yang nilainya dapat diapresiasi dalam jangka panjang sebagai lindung nilai kekayaan keluarga.
                </span>
              </div>
            </div>

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">BukuKas Rumah Tangga</span>
            <span className="mx-2">·</span>
            <span>Kas Rekening, Petty Cash, Tabungan & Aset, Utang dan Piutang Terintegrasi</span>
          </div>
          <div>
            Tersinkronisasi dengan database Supabase
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
        defaultMetodeKas={defaultModalMetodeKas}
        asetList={asetList}
        prefilledAsetId={prefilledAsetId}
        saldoPettyCash={allTimeCashMetrics.saldoPettyCash}
        saldoKasBank={allTimeCashMetrics.saldoKasBank}
      />

      {/* Modal Mutasi Rekening <-> Petty Cash */}
      <PettyCashTransferModal
        isOpen={isPettyCashModalOpen}
        onClose={() => {
          setIsPettyCashModalOpen(false);
          setEditingPettyCashTransfer(null);
        }}
        onSave={handleSaveTransaction}
        initialMode={pettyCashTransferMode}
        initialData={editingPettyCashTransfer}
        saldoKasBank={allTimeCashMetrics.saldoKasBank}
        saldoPettyCash={allTimeCashMetrics.saldoPettyCash}
      />

      {/* Modal CRUD: Create & Update Aset */}
      <AsetModal
        isOpen={isAsetModalOpen}
        onClose={() => setIsAsetModalOpen(false)}
        onSave={handleSaveAset}
        initialData={editingAset}
        defaultGroup={defaultAsetGroup}
        goldPrices={goldPrices}
        goldMetaMap={goldMetaMap}
      />

      {/* Modal Jual Aset / Realisasi Keuntungan */}
      <JualAsetModal
        isOpen={isJualModalOpen}
        onClose={() => {
          setIsJualModalOpen(false);
          setAssetToSell(null);
        }}
        onConfirmJual={handleExecuteJualAset}
        aset={assetToSell}
        cashSavingsList={cashSavingsItems}
        estimatedSellValue={
          assetToSell ? (assetValuations[assetToSell.id]?.displayNominal ?? assetToSell.nominal) : undefined
        }
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
