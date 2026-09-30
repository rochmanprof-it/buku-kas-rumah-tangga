import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KasTransaction, AsetTabungan, DebtRecord, DebtPayment } from '../types/finance';

const STORAGE_URL_KEY = 'bukukas_supabase_url';
const STORAGE_KEY_KEY = 'bukukas_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  const url = (localUrl || envUrl).trim();
  const key = (localKey || envKey).trim();

  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string): void {
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, key.trim());
}

export function clearSupabaseCredentials(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(
    url && 
    key && 
    url.startsWith('https://') &&
    !url.includes('your-project')
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (isSupabaseConfigured()) {
    try {
      return createClient(url, key);
    } catch (err) {
      console.error('Error creating Supabase client:', err);
      return null;
    }
  }
  return null;
}

export interface TableDiagnostic {
  table: string;
  status: 'ok' | 'missing' | 'error';
  rowCount: number;
  message?: string;
}

// Diagnostics untuk 4 tabel di Supabase
export async function getSupabaseDiagnostics(customUrl?: string, customKey?: string): Promise<{
  success: boolean;
  message: string;
  tables: TableDiagnostic[];
}> {
  const creds = getSupabaseCredentials();
  const url = customUrl || creds.url;
  const key = customKey || creds.key;

  if (!url || !key || !url.startsWith('https://')) {
    return {
      success: false,
      message: 'Kredensial Project URL dan Anon Key belum diisi dengan benar.',
      tables: []
    };
  }

  try {
    const client = createClient(url, key);
    const tableNames = ['aset_tabungan', 'kas_transactions', 'piutang_utang', 'piutang_utang_payments'];
    const diagnostics: TableDiagnostic[] = [];

    for (const tbl of tableNames) {
      const { count, error } = await client
        .from(tbl)
        .select('*', { count: 'exact', head: true });

      if (error) {
        diagnostics.push({
          table: tbl,
          status: 'error',
          rowCount: 0,
          message: error.message
        });
      } else {
        diagnostics.push({
          table: tbl,
          status: 'ok',
          rowCount: count ?? 0
        });
      }
    }

    const hasError = diagnostics.some(d => d.status === 'error');
    return {
      success: !hasError,
      message: hasError 
        ? 'Beberapa tabel belum siap atau izin RLS belum diaktifkan.' 
        : 'Semua 4 tabel database Supabase siap dan terhubung sempurna!',
      tables: diagnostics
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menghubungi server Supabase.',
      tables: []
    };
  }
}

// Upload seluruh data lokal saat ini ke database Supabase
export async function pushLocalDataToSupabase(
  transactions: KasTransaction[],
  asetList: AsetTabungan[],
  debts: DebtRecord[]
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Koneksi Supabase belum aktif.' };
  }

  try {
    // 1. Aset Tabungan
    if (asetList.length > 0) {
      const rows = asetList.map(a => ({
        id: a.id,
        nama: a.nama,
        kategori: a.kategori,
        nominal: a.nominal,
        institusi: a.institusi || null,
        keterangan: a.keterangan || null,
        created_at: Date.now(),
        updated_at: a.updatedAt || Date.now()
      }));
      const { error } = await client.from('aset_tabungan').upsert(rows);
      if (error) throw new Error(`Gagal sync aset: ${error.message}`);
    }

    // 2. Kas Transactions
    if (transactions.length > 0) {
      const rows = transactions.map(t => ({
        id: t.id,
        tanggal: t.tanggal,
        jenis: t.jenis,
        kategori: t.kategori,
        nominal: t.nominal,
        keterangan: t.keterangan || null,
        metode_kas: t.metodeKas || null,
        masuk_ke_aset_id: t.masukKeAsetId || null,
        masuk_ke_aset_nama: t.masukKeAsetNama || null,
        terkait_debt_id: t.terkaitDebtId || null,
        terkait_debt_tipe: t.terkaitDebtTipe || null,
        terkait_debt_pihak: t.terkaitDebtPihak || null,
        created_at: t.createdAt
      }));
      const { error } = await client.from('kas_transactions').upsert(rows);
      if (error) throw new Error(`Gagal sync transaksi kas: ${error.message}`);
    }

    // 3. Piutang & Utang
    if (debts.length > 0) {
      const debtRows = debts.map(d => ({
        id: d.id,
        jenis: d.tipe,
        nama_pihak: d.pihak,
        nominal: d.totalNominal,
        tanggal: d.tanggalMulai,
        jatuh_tempo: d.jatuhTempo || null,
        status: d.status === 'lunas' ? 'lunas' : 'belum_lunas',
        keterangan: d.keterangan || null,
        created_at: d.createdAt || Date.now(),
        updated_at: d.updatedAt || Date.now()
      }));
      const { error: debtErr } = await client.from('piutang_utang').upsert(debtRows);
      if (debtErr) throw new Error(`Gagal sync utang piutang: ${debtErr.message}`);

      // Payments
      const allPayments: any[] = [];
      debts.forEach(d => {
        (d.riwayatPembayaran || []).forEach(p => {
          allPayments.push({
            id: p.id,
            item_id: d.id,
            tanggal: p.tanggal,
            nominal: p.nominal,
            metode_kas: p.metodeKas,
            keterangan: p.keterangan || null,
            transaction_id: p.kasTransactionId || null,
            created_at: Date.now(),
            updated_at: Date.now()
          });
        });
      });

      if (allPayments.length > 0) {
        const { error: payErr } = await client.from('piutang_utang_payments').upsert(allPayments);
        if (payErr) throw new Error(`Gagal sync riwayat pembayaran: ${payErr.message}`);
      }
    }

    return { 
      success: true, 
      message: `Berhasil mengunggah ${transactions.length} transaksi kas, ${asetList.length} pos tabungan, dan ${debts.length} utang/piutang ke database Supabase!` 
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal sinkronisasi data ke Supabase.' };
  }
}

// Test koneksi ke Supabase
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url.startsWith('https://')) {
      return { success: false, message: 'URL Supabase harus diawali dengan https://' };
    }
    const client = createClient(url, key);
    const { error } = await client.from('aset_tabungan').select('id').limit(1);
    if (error) {
      return { 
        success: false, 
        message: `Gagal query: ${error.message}. Pastikan tabel sudah dibuat dan Row Level Security (RLS) mengizinkan akses anonim.` 
      };
    }
    return { success: true, message: 'Koneksi ke Supabase berhasil terhubung!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menghubungi server Supabase.' };
  }
}

// ==================== KAS TRANSACTIONS ====================

export async function fetchTransactionsSupabase(): Promise<KasTransaction[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('kas_transactions')
      .select('*')
      .order('tanggal', { ascending: false });

    if (error) {
      console.warn('Supabase fetch kas_transactions error:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tanggal: row.tanggal,
      jenis: row.jenis,
      kategori: row.kategori,
      nominal: Number(row.nominal),
      keterangan: row.keterangan || '',
      metodeKas: row.metode_kas || 'Kas Tunai',
      masukKeAsetId: row.masuk_ke_aset_id || undefined,
      masukKeAsetNama: row.masuk_ke_aset_nama || undefined,
      terkaitDebtId: row.terkait_debt_id || undefined,
      terkaitDebtTipe: row.terkait_debt_tipe || undefined,
      terkaitDebtPihak: row.terkait_debt_pihak || undefined,
      createdAt: Number(row.created_at)
    }));
  } catch (err) {
    console.error('Supabase fetchTransactions error:', err);
    return null;
  }
}

export async function upsertTransactionSupabase(tx: KasTransaction): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('kas_transactions')
      .upsert({
        id: tx.id,
        tanggal: tx.tanggal,
        jenis: tx.jenis,
        kategori: tx.kategori,
        nominal: tx.nominal,
        keterangan: tx.keterangan || null,
        metode_kas: tx.metodeKas || null,
        masuk_ke_aset_id: tx.masukKeAsetId || null,
        masuk_ke_aset_nama: tx.masukKeAsetNama || null,
        terkait_debt_id: tx.terkaitDebtId || null,
        terkait_debt_tipe: tx.terkaitDebtTipe || null,
        terkait_debt_pihak: tx.terkaitDebtPihak || null,
        created_at: tx.createdAt
      });

    if (error) {
      console.error('Supabase upsert kas_transactions error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase upsertTransaction error:', err);
    return false;
  }
}

export async function deleteTransactionSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('kas_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete kas_transactions error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase deleteTransaction error:', err);
    return false;
  }
}

// ==================== ASET TABUNGAN ====================

export async function fetchAsetSupabase(): Promise<AsetTabungan[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('aset_tabungan')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch aset_tabungan error:', error.message);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nama: row.nama,
      kategori: row.kategori,
      nominal: Number(row.nominal),
      institusi: row.institusi || undefined,
      keterangan: row.keterangan || undefined,
      updatedAt: Number(row.updated_at)
    }));
  } catch (err) {
    console.error('Supabase fetchAset error:', err);
    return null;
  }
}

export async function upsertAsetSupabase(aset: AsetTabungan): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('aset_tabungan')
      .upsert({
        id: aset.id,
        nama: aset.nama,
        kategori: aset.kategori,
        nominal: aset.nominal,
        institusi: aset.institusi || null,
        keterangan: aset.keterangan || null,
        created_at: Date.now(),
        updated_at: aset.updatedAt || Date.now()
      });

    if (error) {
      console.error('Supabase upsert aset_tabungan error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase upsertAset error:', err);
    return false;
  }
}

export async function deleteAsetSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('aset_tabungan')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete aset_tabungan error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase deleteAset error:', err);
    return false;
  }
}

// ==================== PIUTANG & UTANG ====================

export async function fetchDebtsSupabase(): Promise<DebtRecord[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: debtsData, error: debtsError } = await client
      .from('piutang_utang')
      .select('*')
      .order('created_at', { ascending: false });

    if (debtsError) {
      console.warn('Supabase fetch piutang_utang error:', debtsError.message);
      return null;
    }

    const { data: paymentsData, error: paymentsError } = await client
      .from('piutang_utang_payments')
      .select('*');

    if (paymentsError) {
      console.warn('Supabase fetch piutang_utang_payments error:', paymentsError.message);
    }

    const paymentsByItem: Record<string, DebtPayment[]> = {};
    (paymentsData || []).forEach((p: any) => {
      if (!paymentsByItem[p.item_id]) {
        paymentsByItem[p.item_id] = [];
      }
      paymentsByItem[p.item_id].push({
        id: p.id,
        tanggal: p.tanggal,
        nominal: Number(p.nominal),
        metodeKas: p.metode_kas || 'Kas Tunai',
        keterangan: p.keterangan || '',
        kasTransactionId: p.transaction_id || undefined
      });
    });

    return (debtsData || []).map((row: any) => {
      const payments = paymentsByItem[row.id] || [];
      const totalBayar = payments.reduce((sum, pay) => sum + pay.nominal, 0);
      const totalNominal = Number(row.nominal);
      const sisaNominal = Math.max(totalNominal - totalBayar, 0);
      const status = sisaNominal <= 0 ? 'lunas' : (row.status === 'lunas' ? 'lunas' : 'belum_lunas');

      return {
        id: row.id,
        tipe: row.jenis as 'utang' | 'piutang',
        pihak: row.nama_pihak,
        totalNominal,
        sisaNominal,
        tanggalMulai: row.tanggal,
        jatuhTempo: row.jatuh_tempo || undefined,
        status,
        keterangan: row.keterangan || undefined,
        riwayatPembayaran: payments,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at)
      };
    });
  } catch (err) {
    console.error('Supabase fetchDebts error:', err);
    return null;
  }
}

export async function upsertDebtSupabase(debt: DebtRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('piutang_utang')
      .upsert({
        id: debt.id,
        jenis: debt.tipe,
        nama_pihak: debt.pihak,
        nominal: debt.totalNominal,
        tanggal: debt.tanggalMulai,
        jatuh_tempo: debt.jatuhTempo || null,
        status: debt.status === 'lunas' ? 'lunas' : 'belum_lunas',
        keterangan: debt.keterangan || null,
        created_at: debt.createdAt || Date.now(),
        updated_at: debt.updatedAt || Date.now()
      });

    if (error) {
      console.error('Supabase upsert piutang_utang error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase upsertDebt error:', err);
    return false;
  }
}

export async function insertPaymentSupabase(
  itemId: string, 
  payment: DebtPayment,
  updatedDebtStatus: 'belum_lunas' | 'lunas'
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error: payErr } = await client
      .from('piutang_utang_payments')
      .insert({
        id: payment.id,
        item_id: itemId,
        tanggal: payment.tanggal,
        nominal: payment.nominal,
        metode_kas: payment.metodeKas,
        keterangan: payment.keterangan || null,
        transaction_id: payment.kasTransactionId || null,
        created_at: Date.now(),
        updated_at: Date.now()
      });

    if (payErr) {
      console.error('Supabase insert piutang_utang_payments error:', payErr.message);
      return false;
    }

    await client
      .from('piutang_utang')
      .update({
        status: updatedDebtStatus,
        updated_at: Date.now()
      })
      .eq('id', itemId);

    return true;
  } catch (err) {
    console.error('Supabase insertPayment error:', err);
    return false;
  }
}

export async function deleteDebtSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('piutang_utang')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete piutang_utang error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase deleteDebt error:', err);
    return false;
  }
}
