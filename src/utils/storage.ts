import { KasTransaction, AsetTabungan, DebtRecord } from '../types/finance';
import { getDefaultTransactions, getDefaultAset, getDefaultDebts } from '../data/defaultData';
import { supabase } from './supabase';

// ================= TRANSAKSI =================
export async function loadTransactions(): Promise<KasTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('kas_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load transactions:', error);
      return getDefaultTransactions();
    }

    // Jika tabel di database benar-benar kosong, kembalikan array kosong (bukan data dummy)
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((t: any) => ({
      id: t.id,
      tanggal: t.tanggal,
      jenis: t.jenis,
      kategori: t.kategori,
      nominal: Number(t.nominal),
      metodeKas: t.metode_kas,
      keterangan: t.keterangan || '',
      masukKeAsetId: t.masuk_ke_aset_id || undefined,
      masukKeAsetNama: t.masuk_ke_aset_nama || undefined,
      createdAt: Number(t.created_at),
    }));
  } catch (err) {
    console.error('Failed to load transactions:', err);
    return getDefaultTransactions();
  }
}

export async function saveTransactions(transactions: KasTransaction[]): Promise<void> {
  try {
    if (transactions.length === 0) return;

    const payload = transactions.map(t => ({
      id: t.id,
      tanggal: t.tanggal,
      jenis: t.jenis,
      kategori: t.kategori || '',
      nominal: t.nominal,
      metode_kas: t.metodeKas || 'Kas Tunai',
      keterangan: t.keterangan || null,
      masuk_ke_aset_id: t.masukKeAsetId || null,
      masuk_ke_aset_nama: t.masukKeAsetNama || null,
      created_at: t.createdAt || Date.now(),
    }));

    const { error } = await supabase
      .from('kas_transactions')
      .upsert(payload);

    if (error) console.error('Failed to save transactions:', error);
  } catch (err) {
    console.error('Failed to save transactions:', err);
  }
}

export async function deleteTransactionInSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('kas_transactions')
      .delete()
      .eq('id', id);

    if (error) console.error('Gagal menghapus transaksi di Supabase:', error);
  } catch (err) {
    console.error('Error deleting transaction:', err);
  }
}

// ================= ASET / TABUNGAN =================
export async function loadAset(): Promise<AsetTabungan[]> {
  try {
    const { data, error } = await supabase
      .from('aset_tabungan')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load aset:', error);
      return getDefaultAset();
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((a: any) => ({
      id: a.id,
      nama: a.nama,
      kategori: a.kategori,
      nominal: Number(a.nominal),
      institusi: a.institusi || '',
      keterangan: a.keterangan || '',
      createdAt: Number(a.created_at),
      updatedAt: Number(a.updated_at),
    }));
  } catch (err) {
    console.error('Failed to load aset:', err);
    return getDefaultAset();
  }
}

export async function saveAset(asetList: AsetTabungan[]): Promise<void> {
  try {
    if (asetList.length === 0) return;

    const payload = asetList.map((a: any) => {
      const createdAt = (a.createdAt ?? a.updatedAt ?? Date.now()) as number;

      return {
        id: a.id,
        nama: a.nama,
        kategori: a.kategori || 'lainnya',
        nominal: a.nominal,
        institusi: a.institusi || null,
        keterangan: a.keterangan || null,
        created_at: createdAt,
        updated_at: Date.now(),
      };
    });

    const { error } = await supabase
      .from('aset_tabungan')
      .upsert(payload);

    if (error) console.error('Failed to save aset:', error);
  } catch (err) {
    console.error('Failed to save aset:', err);
  }
}

export async function deleteAsetInSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('aset_tabungan')
      .delete()
      .eq('id', id);

    if (error) console.error('Gagal menghapus aset di Supabase:', error);
  } catch (err) {
    console.error('Gagal menghapus aset:', err);
  }
}

// ================= UTANG / PIUTANG =================
export async function loadDebts(): Promise<DebtRecord[]> {
  try {
    const { data, error } = await supabase
      .from('piutang_utang')
      .select(`
        *,
        piutang_utang_payments (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load debts:', error);
      return getDefaultDebts();
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((d: any) => {
      const paymentsList = d.piutang_utang_payments || [];
      const totalBayar = paymentsList.reduce((acc: number, p: any) => acc + Number(p.nominal), 0);
      const sisa = Math.max(0, Number(d.nominal) - totalBayar);

      return {
        id: d.id,
        tipe: d.jenis,
        pihak: d.nama_pihak,
        totalNominal: Number(d.nominal),
        sisaNominal: sisa,
        tanggalMulai: d.tanggal,
        jatuhTempo: d.jatuh_tempo || undefined,
        status: d.status,
        keterangan: d.keterangan || '',
        createdAt: Number(d.created_at),
        updatedAt: Number(d.updated_at),
        payments: paymentsList.map((p: any) => ({
          id: p.id,
          itemId: p.item_id,
          tanggal: p.tanggal,
          nominal: Number(p.nominal),
          metodeKas: p.metode_kas || undefined,
          keterangan: p.keterangan || undefined,
          transactionId: p.transaction_id || undefined,
          createdAt: Number(p.created_at),
          updatedAt: Number(p.updated_at),
        }))
      };
    });
  } catch (err) {
    console.error('Failed to load debts:', err);
    return getDefaultDebts();
  }
}

export async function saveDebts(debts: DebtRecord[]): Promise<void> {
  try {
    if (debts.length === 0) return;

    for (const d of debts) {
      const debtWithPayments = d as DebtRecord & {
        payments?: Array<{
          id: string;
          tanggal: string;
          nominal: number;
          metodeKas?: string | null;
          keterangan?: string | null;
          transactionId?: string | null;
          createdAt?: number;
          updatedAt?: number;
        }>;
      };

      const payloadDebt = {
        id: d.id,
        jenis: d.tipe,
        nama_pihak: d.pihak,
        nominal: d.totalNominal,
        tanggal: d.tanggalMulai,
        jatuh_tempo: d.jatuhTempo || null,
        status: d.status || 'belum_lunas',
        keterangan: d.keterangan || null,
        created_at: d.createdAt || Date.now(),
        updated_at: Date.now(),
      };

      await supabase.from('piutang_utang').upsert([payloadDebt]);

      if (debtWithPayments.payments && debtWithPayments.payments.length > 0) {
        const payloadPayments = debtWithPayments.payments.map(p => ({
          id: p.id,
          item_id: d.id,
          tanggal: p.tanggal,
          nominal: p.nominal,
          metode_kas: p.metodeKas || null,
          keterangan: p.keterangan || null,
          transaction_id: p.transactionId || null,
          created_at: p.createdAt || Date.now(),
          updated_at: Date.now(),
        }));

        await supabase.from('piutang_utang_payments').upsert(payloadPayments);
      }
    }
  } catch (err) {
    console.error('Failed to save debts:', err);
  }
}

export async function deleteDebtInSupabase(id: string): Promise<void> {
  try {
    await supabase.from('piutang_utang_payments').delete().eq('item_id', id);
    
    const { error } = await supabase
      .from('piutang_utang')
      .delete()
      .eq('id', id);

    if (error) console.error('Gagal menghapus utang/piutang di Supabase:', error);
  } catch (err) {
    console.error('Gagal menghapus utang/piutang:', err);
  }
}

// ================= EKSPOR CSV =================
export function exportTransactionsCSV(transactions: KasTransaction[]): void {
  const headers = ['No', 'Tanggal', 'Jenis', 'Kategori', 'Nominal (Rp)', 'Metode Kas', 'Keterangan', 'Info Khusus'];
  const rows = transactions.map((t, index) => {
    let info = '';
    if (t.masukKeAsetNama) info = `Masuk ke Tabungan: ${t.masukKeAsetNama}`;
    return [
      index + 1,
      t.tanggal,
      t.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      `"${(t.kategori || '').replace(/"/g, '""')}"`,
      t.nominal,
      `"${(t.metodeKas || '').replace(/"/g, '""')}"`,
      `"${(t.keterangan || '').replace(/"/g, '""')}"`,
      `"${info.replace(/"/g, '""')}"`
    ];
  });
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

export function exportDebtsCSV(debts: DebtRecord[]): void {
  const headers = ['No', 'Tipe', 'Pihak / Nama', 'Total Nominal (Rp)', 'Sisa (Rp)', 'Tanggal Mulai', 'Jatuh Tempo', 'Status', 'Keterangan'];
  const rows = debts.map((d, index) => [
    index + 1,
    d.tipe === 'utang' ? 'Utang (Kita Bayar)' : 'Piutang (Kita Tagih)',
    `"${(d.pihak || '').replace(/"/g, '""')}"`,
    d.totalNominal,
    d.sisaNominal,
    d.tanggalMulai,
    d.jatuhTempo || '-',
    d.status === 'lunas' ? 'LUNAS' : 'BELUM LUNAS',
    `"${(d.keterangan || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `daftar_utang_piutang_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}