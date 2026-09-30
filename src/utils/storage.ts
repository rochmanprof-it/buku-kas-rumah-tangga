import { KasTransaction, AsetTabungan } from '../types/finance';
import { getDefaultTransactions, getDefaultAset } from '../data/defaultData';

const TRANSACTIONS_KEY = 'bukukas_sederhana_transactions_v2';
const ASET_KEY = 'bukukas_aset_tabungan_v1';

export function loadTransactions(): KasTransaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return getDefaultTransactions();
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : getDefaultTransactions();
  } catch (err) {
    console.error('Failed to load transactions:', err);
    return getDefaultTransactions();
  }
}

export function saveTransactions(transactions: KasTransaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions:', err);
  }
}

export function loadAset(): AsetTabungan[] {
  try {
    const raw = localStorage.getItem(ASET_KEY);
    if (!raw) return getDefaultAset();
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : getDefaultAset();
  } catch (err) {
    console.error('Failed to load aset:', err);
    return getDefaultAset();
  }
}

export function saveAset(asetList: AsetTabungan[]): void {
  try {
    localStorage.setItem(ASET_KEY, JSON.stringify(asetList));
  } catch (err) {
    console.error('Failed to save aset:', err);
  }
}

export function exportTransactionsCSV(transactions: KasTransaction[]): void {
  const headers = ['No', 'Tanggal', 'Jenis', 'Kategori', 'Nominal (Rp)', 'Metode Kas', 'Keterangan'];
  
  const rows = transactions.map((t, index) => [
    index + 1,
    t.tanggal,
    t.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
    `"${(t.kategori || '').replace(/"/g, '""')}"`,
    t.nominal,
    `"${(t.metodeKas || '').replace(/"/g, '""')}"`,
    `"${(t.keterangan || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `buku_kas_rumah_tangga_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function exportAsetCSV(asetList: AsetTabungan[]): void {
  const headers = ['No', 'Nama Aset / Tabungan', 'Kategori', 'Nominal (Rp)', 'Institusi / Tempat Simpan', 'Keterangan'];
  
  const rows = asetList.map((a, index) => [
    index + 1,
    `"${(a.nama || '').replace(/"/g, '""')}"`,
    a.kategori,
    a.nominal,
    `"${(a.institusi || '').replace(/"/g, '""')}"`,
    `"${(a.keterangan || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `daftar_aset_tabungan_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
