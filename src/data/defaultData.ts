import { KasTransaction, AsetTabungan, DebtRecord } from '../types/finance';
import { getCurrentMonthKey, getTodayDateString } from '../utils/formatters';

export function getDefaultTransactions(): KasTransaction[] {
  const currentMonth = getCurrentMonthKey();
  const today = getTodayDateString();

  return [
    {
      id: 'tx-1',
      tanggal: `${currentMonth}-01`,
      jenis: 'pemasukan',
      kategori: 'Gaji Bulanan',
      nominal: 8500000,
      keterangan: 'Gaji utama bulanan kantor',
      metodeKas: 'Bank Transfer',
      createdAt: Date.now() - 25 * 86400000
    },
    {
      id: 'tx-2',
      tanggal: `${currentMonth}-03`,
      jenis: 'pemasukan',
      kategori: 'Usaha Sampingan',
      nominal: 2000000,
      keterangan: 'Laba jualan kue & katering',
      metodeKas: 'Kas Tunai',
      createdAt: Date.now() - 23 * 86400000
    },
    {
      id: 'tx-3',
      tanggal: `${currentMonth}-04`,
      jenis: 'pengeluaran',
      kategori: 'Tagihan & Utilitas',
      nominal: 450000,
      keterangan: 'Bayar listrik PLN & PDAM',
      metodeKas: 'Bank Transfer',
      createdAt: Date.now() - 22 * 86400000
    },
    {
      id: 'tx-4',
      tanggal: `${currentMonth}-06`,
      jenis: 'pengeluaran',
      kategori: 'Belanja Dapur',
      nominal: 750000,
      keterangan: 'Belanja beras, minyak, sayur & lauk pasar',
      metodeKas: 'Kas Tunai',
      createdAt: Date.now() - 20 * 86400000
    },
    {
      id: 'tx-5',
      tanggal: `${currentMonth}-10`,
      jenis: 'pengeluaran',
      kategori: 'Pendidikan Anak',
      nominal: 800000,
      keterangan: 'SPP sekolah & les anak',
      metodeKas: 'Bank Transfer',
      createdAt: Date.now() - 16 * 86400000
    },
    {
      id: 'tx-6',
      tanggal: `${currentMonth}-15`,
      jenis: 'pengeluaran',
      kategori: 'Transportasi',
      nominal: 250000,
      keterangan: 'Bensin motor & operasional keluarga',
      metodeKas: 'Kas Tunai',
      createdAt: Date.now() - 11 * 86400000
    },
    {
      id: 'tx-7',
      tanggal: `${currentMonth}-20`,
      jenis: 'pengeluaran',
      kategori: 'Kebutuhan Rumah',
      nominal: 350000,
      keterangan: 'Refill gas elpiji, galon air & sabun cuci',
      metodeKas: 'Kas Tunai',
      createdAt: Date.now() - 6 * 86400000
    },
    {
      id: 'tx-8',
      tanggal: today,
      jenis: 'pengeluaran',
      kategori: 'Belanja Harian',
      nominal: 65000,
      keterangan: 'Beli telur ayam & bumbu dapur',
      metodeKas: 'Kas Tunai',
      createdAt: Date.now() - 3600000
    }
  ];
}

export function getDefaultAset(): AsetTabungan[] {
  return [
    {
      id: 'ast-1',
      nama: 'Tabungan Dana Darurat',
      kategori: 'tabungan',
      nominal: 15000000,
      institusi: 'Bank BSI',
      keterangan: 'Dana siaga tak terduga (target 6 bulan pengeluaran)',
      updatedAt: Date.now() - 10 * 86400000
    },
    {
      id: 'ast-2',
      nama: 'Emas Batangan Antam (10 Gram)',
      kategori: 'emas',
      nominal: 13500000,
      institusi: 'Brankas Pribadi',
      keterangan: 'Simpanan lindung nilai jangka panjang',
      updatedAt: Date.now() - 5 * 86400000
    },
    {
      id: 'ast-3',
      nama: 'Reksadana Pasar Uang & Pendapatan Tetap',
      kategori: 'investasi',
      nominal: 8000000,
      institusi: 'Bibit / Bareksa',
      keterangan: 'Investasi likuid dengan imbal hasil harian',
      updatedAt: Date.now() - 2 * 86400000
    },
    {
      id: 'ast-4',
      nama: 'Tabungan Rencana Pendidikan Anak',
      kategori: 'tabungan',
      nominal: 6500000,
      institusi: 'Bank BCA',
      keterangan: 'Autodebet bulanan untuk persiapan biaya sekolah',
      updatedAt: Date.now() - 1 * 86400000
    }
  ];
}

export function getDefaultDebts(): DebtRecord[] {
  const currentMonth = getCurrentMonthKey();

  return [
    {
      id: 'dbt-1',
      tipe: 'utang',
      pihak: 'Cicilan Kendaraan / Leasing',
      totalNominal: 10000000,
      sisaNominal: 3500000,
      tanggalMulai: `${currentMonth}-01`,
      jatuhTempo: `${currentMonth}-28`,
      status: 'belum_lunas',
      keterangan: 'Sisa angsuran motor keluarga',
      riwayatPembayaran: [
        {
          id: 'pay-1',
          tanggal: `${currentMonth}-05`,
          nominal: 1500000,
          metodeKas: 'Bank Transfer',
          keterangan: 'Angsuran bulan berjalan'
        }
      ],
      createdAt: Date.now() - 30 * 86400000,
      updatedAt: Date.now() - 20 * 86400000
    },
    {
      id: 'dbt-2',
      tipe: 'piutang',
      pihak: 'Rudi (Teman Kantor)',
      totalNominal: 2000000,
      sisaNominal: 1200000,
      tanggalMulai: `${currentMonth}-02`,
      jatuhTempo: `${currentMonth}-30`,
      status: 'belum_lunas',
      keterangan: 'Pinjaman sementara untuk renovasi rumah',
      riwayatPembayaran: [
        {
          id: 'pay-2',
          tanggal: `${currentMonth}-15`,
          nominal: 800000,
          metodeKas: 'Bank Transfer',
          keterangan: 'Cicilan pertama Rudi'
        }
      ],
      createdAt: Date.now() - 28 * 86400000,
      updatedAt: Date.now() - 15 * 86400000
    },
    {
      id: 'dbt-3',
      tipe: 'piutang',
      pihak: 'Toko Berkah (Pesanan Kue)',
      totalNominal: 600000,
      sisaNominal: 600000,
      tanggalMulai: `${currentMonth}-10`,
      status: 'belum_lunas',
      keterangan: 'Tagihan pesanan kue box arisan',
      riwayatPembayaran: [],
      createdAt: Date.now() - 15 * 86400000,
      updatedAt: Date.now() - 15 * 86400000
    }
  ];
}
