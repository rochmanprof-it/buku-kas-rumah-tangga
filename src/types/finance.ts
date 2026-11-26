export type TransactionType = 'pemasukan' | 'pengeluaran';

export type AsetKategori = 'tabungan' | 'deposito' | 'kas_fisik' | 'emas' | 'investasi' | 'properti' | 'lainnya';

export type AsetGroupType = 'cash' | 'aset';

export function isCashSavings(kategori: string): boolean {
  return kategori === 'tabungan' || kategori === 'deposito' || kategori === 'kas_fisik';
}

export function getAsetGroupLabel(kategori: string): string {
  return isCashSavings(kategori) ? 'Tabungan Cash' : 'Aset & Logam Mulia';
}

export type DebtType = 'utang' | 'piutang';

export interface DebtPayment {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nominal: number;
  metodeKas: string;
  keterangan?: string;
  kasTransactionId?: string;
}

export interface DebtRecord {
  id: string;
  tipe: DebtType; // 'utang' (kewajiban kita bayar) atau 'piutang' (orang lain bayar ke kita)
  pihak: string; // nama orang / lembaga peminjam / pemberi pinjaman
  totalNominal: number;
  sisaNominal: number;
  tanggalMulai: string; // YYYY-MM-DD
  jatuhTempo?: string; // YYYY-MM-DD
  status: 'belum_lunas' | 'lunas';
  keterangan?: string;
  riwayatPembayaran?: DebtPayment[];
  createdAt: number;
  updatedAt: number;
}

export interface KasTransaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jenis: TransactionType;
  kategori: string;
  nominal: number;
  keterangan: string;
  metodeKas: string; // 'Kas Tunai', 'Bank Transfer', 'e-Wallet'
  masukKeAsetId?: string; // ID pos tabungan penerima jika pengeluaran dialokasikan ke tabungan
  masukKeAsetNama?: string; // Nama pos tabungan penerima
  terkaitDebtId?: string; // ID utang/piutang jika terkait pembayaran utang/piutang
  terkaitDebtTipe?: DebtType;
  terkaitDebtPihak?: string;
  createdAt: number;
}

export interface AsetTabungan {
  id: string;
  nama: string; // contoh: "Tabungan Dana Darurat", "Emas Antam 10g", "Reksadana Bibit"
  kategori: AsetKategori;
  nominal: number; // Nilai dalam Rupiah
  institusi?: string; // contoh: "Bank BCA", "BSI", "Pegadaian", "Ajaib"
  keterangan?: string;
  beratGram?: number; // Berat dalam gram jika aset emas / logam mulia
  hargaBeliPerGram?: number; // Harga beli per gram saat perolehan
  tanggalBeli?: string; // Tanggal perolehan YYYY-MM-DD
  updatedAt: number;
}

export interface KasSummary {
  saldoKas: number;
  saldoKasBank: number;
  saldoPettyCash: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  totalAset: number;
  totalTabunganCash: number;
  totalAsetLogamMulia: number;
  totalUtang: number;
  totalPiutang: number;
}

export const METODE_PETTY_CASH = 'Petty Cash';
export const KATEGORI_ISI_PETTY_CASH = 'Isi Petty Cash';
export const KATEGORI_SETOR_PETTY_CASH = 'Setor Petty Cash';

export function isPettyCashTopUp(tx: KasTransaction): boolean {
  return tx.jenis === 'pengeluaran' && tx.kategori === KATEGORI_ISI_PETTY_CASH;
}

export function isPettyCashReturn(tx: KasTransaction): boolean {
  return tx.jenis === 'pemasukan' && tx.kategori === KATEGORI_SETOR_PETTY_CASH;
}

export function isPettyCashTransfer(tx: KasTransaction): boolean {
  return isPettyCashTopUp(tx) || isPettyCashReturn(tx);
}

export function isPettyCashLedgerEntry(tx: KasTransaction): boolean {
  return isPettyCashTransfer(tx) || tx.metodeKas === METODE_PETTY_CASH;
}

export interface CashMetrics {
  totalPemasukanRiil: number;
  totalPengeluaranRiil: number;
  saldoKasBank: number;
  saldoPettyCash: number;
  totalSaldoKas: number;
  totalTopUpPettyCash: number;
  totalSetorPettyCash: number;
  totalPemasukanPettyCash: number;
  totalBelanjaPettyCash: number;
}

export function calculateCashMetrics(dataset: KasTransaction[]): CashMetrics {
  let totalPemasukanRiil = 0;
  let totalPengeluaranRiil = 0;
  let saldoKasBank = 0;
  let saldoPettyCash = 0;
  let totalTopUpPettyCash = 0;
  let totalSetorPettyCash = 0;
  let totalPemasukanPettyCash = 0;
  let totalBelanjaPettyCash = 0;

  for (const t of dataset) {
    const nominal = Number(t.nominal) || 0;

    if (isPettyCashTopUp(t)) {
      // Tarik tunai / pindah dari Rekening Bank ke Petty Cash (Cash di Tangan)
      saldoKasBank -= nominal;
      saldoPettyCash += nominal;
      totalTopUpPettyCash += nominal;
      continue;
    }

    if (isPettyCashReturn(t)) {
      // Setor sisa Petty Cash kembali ke Rekening Bank
      saldoPettyCash -= nominal;
      saldoKasBank += nominal;
      totalSetorPettyCash += nominal;
      continue;
    }

    if (t.jenis === 'pemasukan') {
      totalPemasukanRiil += nominal;
      if (t.metodeKas === METODE_PETTY_CASH) {
        saldoPettyCash += nominal;
        totalPemasukanPettyCash += nominal;
      } else {
        saldoKasBank += nominal;
      }
    } else {
      totalPengeluaranRiil += nominal;
      if (t.metodeKas === METODE_PETTY_CASH) {
        saldoPettyCash -= nominal;
        totalBelanjaPettyCash += nominal;
      } else {
        saldoKasBank -= nominal;
      }
    }
  }

  return {
    totalPemasukanRiil,
    totalPengeluaranRiil,
    saldoKasBank,
    saldoPettyCash,
    totalSaldoKas: saldoKasBank + saldoPettyCash,
    totalTopUpPettyCash,
    totalSetorPettyCash,
    totalPemasukanPettyCash,
    totalBelanjaPettyCash,
  };
}

