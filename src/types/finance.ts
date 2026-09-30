export type TransactionType = 'pemasukan' | 'pengeluaran';

export type AsetKategori = 'tabungan' | 'investasi' | 'emas' | 'deposito' | 'properti' | 'lainnya';

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
  updatedAt: number;
}

export interface KasSummary {
  saldoKas: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  totalAset: number;
  totalUtang: number;
  totalPiutang: number;
}
