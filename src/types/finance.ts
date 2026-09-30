export type TransactionType = 'pemasukan' | 'pengeluaran';

export type AsetKategori = 'tabungan' | 'investasi' | 'emas' | 'deposito' | 'properti' | 'lainnya';

export interface KasTransaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jenis: TransactionType;
  kategori: string;
  nominal: number;
  keterangan: string;
  metodeKas: string; // 'Kas Tunai', 'Bank Transfer', 'e-Wallet'
  masukKeAsetId?: string; // ID pos tabungan penerima jika pengeluaran ini dialokasikan ke tabungan
  masukKeAsetNama?: string; // Nama pos tabungan penerima
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
}
