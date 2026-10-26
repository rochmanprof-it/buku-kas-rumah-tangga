/**
 * Utility untuk Pelacakan Harga Emas Realtime & Perhitungan Untung/Rugi
 */

import { AsetTabungan } from '../types/finance';

export interface GoldPriceData {
  pricePerGram: number; // Harga jual spot / pasar per gram (Rp)
  buybackPerGram: number; // Harga beli kembali (buyback) per gram (Rp)
  change24h: number; // Perubahan persentase 24 jam (%)
  lastUpdated: number; // Timestamp
  source: string; // Sumber data
  isCustom?: boolean; // Apakah pengguna menggunakan harga kustom sendiri
}

const STORAGE_GOLD_CACHE_KEY = 'bukukas_gold_price_cache_v1';
const STORAGE_CUSTOM_PRICE_KEY = 'bukukas_gold_custom_price_v1';

// 1 Troy Ounce = 31.1034768 gram
const TROY_OUNCE_TO_GRAM = 31.1034768;

// Baseline harga emas (sekitar Rp 1.495.000 / gram)
const BASELINE_PRICE_PER_GRAM = 1495000;
const DEFAULT_BUYBACK_RATIO = 0.925; // Spread buyback sekitar 7.5%

export function getCachedGoldPrice(): GoldPriceData {
  try {
    const custom = localStorage.getItem(STORAGE_CUSTOM_PRICE_KEY);
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed && parsed.pricePerGram > 0) {
        return parsed;
      }
    }

    const cached = localStorage.getItem(STORAGE_GOLD_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.pricePerGram > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca cache harga emas:', err);
  }

  return {
    pricePerGram: BASELINE_PRICE_PER_GRAM,
    buybackPerGram: Math.round(BASELINE_PRICE_PER_GRAM * DEFAULT_BUYBACK_RATIO),
    change24h: 0.65,
    lastUpdated: Date.now(),
    source: 'Harga Acuan Logam Mulia'
  };
}

export function saveCustomGoldPrice(pricePerGram: number, buybackPerGram?: number): GoldPriceData {
  const buyback = buybackPerGram && buybackPerGram > 0 
    ? buybackPerGram 
    : Math.round(pricePerGram * DEFAULT_BUYBACK_RATIO);

  const data: GoldPriceData = {
    pricePerGram,
    buybackPerGram: buyback,
    change24h: 0,
    lastUpdated: Date.now(),
    source: 'Harga Kustom Pengguna',
    isCustom: true
  };

  localStorage.setItem(STORAGE_CUSTOM_PRICE_KEY, JSON.stringify(data));
  return data;
}

export function resetToLiveGoldPrice(): void {
  localStorage.removeItem(STORAGE_CUSTOM_PRICE_KEY);
}

/**
 * Mengambil harga emas live terkini dari public API
 */
export async function fetchLiveGoldPrice(): Promise<GoldPriceData> {
  // Jika pengguna menyetel harga kustom secara manual, gunakan harga kustom
  const custom = localStorage.getItem(STORAGE_CUSTOM_PRICE_KEY);
  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (parsed && parsed.pricePerGram > 0) {
        return parsed;
      }
    } catch {
      // Abaikan jika corrupt
    }
  }

  // Coba sumber 1: CoinGecko PAX-Gold in IDR (Realtime spot gold backed 1:1)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=idr&include_24hr_change=true',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data['pax-gold'] && data['pax-gold'].idr) {
        const idrPerOunce = Number(data['pax-gold'].idr);
        const change24h = Number(data['pax-gold'].idr_24h_change || 0);

        if (idrPerOunce > 0) {
          const pricePerGram = Math.round(idrPerOunce / TROY_OUNCE_TO_GRAM);
          const buybackPerGram = Math.round(pricePerGram * DEFAULT_BUYBACK_RATIO);

          const result: GoldPriceData = {
            pricePerGram,
            buybackPerGram,
            change24h: parseFloat(change24h.toFixed(2)),
            lastUpdated: Date.now(),
            source: 'Spot Gold Realtime (PAXG / IDR)'
          };

          localStorage.setItem(STORAGE_GOLD_CACHE_KEY, JSON.stringify(result));
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('CoinGecko gold fetch failed, mencoba sumber sekunder:', err);
  }

  // Coba sumber 2: Indodax PAXG / IDR
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://indodax.com/api/ticker/paxgidr', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.ticker && data.ticker.last) {
        const lastPrice = parseFloat(data.ticker.last);
        if (lastPrice > 0) {
          const pricePerGram = Math.round(lastPrice / TROY_OUNCE_TO_GRAM);
          const buybackPerGram = Math.round(pricePerGram * DEFAULT_BUYBACK_RATIO);

          const result: GoldPriceData = {
            pricePerGram,
            buybackPerGram,
            change24h: 0.5,
            lastUpdated: Date.now(),
            source: 'Indodax PAXG/IDR'
          };

          localStorage.setItem(STORAGE_GOLD_CACHE_KEY, JSON.stringify(result));
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('Indodax gold fetch failed:', err);
  }

  // Fallback ke data cache sebelumnya atau baseline
  return getCachedGoldPrice();
}

/**
 * Ekstraksi berat gram dari properti atau dari nama aset
 * Contoh: "Emas Antam (10 Gram)" -> 10
 */
export function extractGoldGrams(aset: AsetTabungan): number {
  if (aset.beratGram && aset.beratGram > 0) {
    return aset.beratGram;
  }

  // Cek jika tersimpan di keterangan
  if (aset.keterangan) {
    const match = aset.keterangan.match(/\[EMAS:([\d.]+)g/);
    if (match && parseFloat(match[1]) > 0) {
      return parseFloat(match[1]);
    }
  }

  // Cek dari nama aset
  const nameMatch = aset.nama.match(/(\d+(?:[.,]\d+)?)\s*(?:gram|gr|g)\b/i);
  if (nameMatch) {
    const grams = parseFloat(nameMatch[1].replace(',', '.'));
    if (grams > 0) return grams;
  }

  return 0;
}

/**
 * Ekstraksi harga beli per gram dari properti atau dihitung dari nominal/gram
 */
export function extractGoldBuyPrice(aset: AsetTabungan, grams: number): number {
  if (aset.hargaBeliPerGram && aset.hargaBeliPerGram > 0) {
    return aset.hargaBeliPerGram;
  }

  if (aset.keterangan) {
    const match = aset.keterangan.match(/\[EMAS:[\d.]+g:([\d.]+)/);
    if (match && parseFloat(match[1]) > 0) {
      return parseFloat(match[1]);
    }
  }

  if (grams > 0 && aset.nominal > 0) {
    return Math.round(aset.nominal / grams);
  }

  return 0;
}

export interface GoldAssetCalculation {
  beratGram: number;
  hargaBeliPerGram: number;
  totalModal: number; // Nilai saat dibeli
  hargaAcuanPerGram: number; // Harga pasar atau buyback sekarang
  nilaiSekarang: number; // Estimasi nilai saat ini
  untungRugiNominal: number; // Untung (+), Rugi (-)
  untungRugiPersen: number; // Persentase untung/rugi
  isUntung: boolean;
  status: 'untung' | 'rugi' | 'impas';
}

/**
 * Menghitung estimasi nilai sekarang dan untung/rugi satu pos emas
 */
export function calculateGoldProfitLoss(
  aset: AsetTabungan, 
  currentPrice: GoldPriceData, 
  evalMode: 'pasar' | 'buyback' = 'pasar'
): GoldAssetCalculation {
  const beratGram = extractGoldGrams(aset);
  const totalModal = aset.nominal;
  const hargaBeliPerGram = extractGoldBuyPrice(aset, beratGram);

  const hargaAcuanPerGram = evalMode === 'buyback' 
    ? currentPrice.buybackPerGram 
    : currentPrice.pricePerGram;

  // Jika berat gram tidak diketahui, hitung berdasarkan harga saat beli perkiraan
  let nilaiSekarang = totalModal;
  if (beratGram > 0) {
    nilaiSekarang = Math.round(beratGram * hargaAcuanPerGram);
  } else if (hargaBeliPerGram > 0) {
    const estimasiGram = totalModal / hargaBeliPerGram;
    nilaiSekarang = Math.round(estimasiGram * hargaAcuanPerGram);
  }

  const untungRugiNominal = nilaiSekarang - totalModal;
  const untungRugiPersen = totalModal > 0 
    ? (untungRugiNominal / totalModal) * 100 
    : 0;

  const isUntung = untungRugiNominal > 0;
  const status: 'untung' | 'rugi' | 'impas' = 
    untungRugiNominal > 0 ? 'untung' : (untungRugiNominal < 0 ? 'rugi' : 'impas');

  return {
    beratGram,
    hargaBeliPerGram,
    totalModal,
    hargaAcuanPerGram,
    nilaiSekarang,
    untungRugiNominal,
    untungRugiPersen,
    isUntung,
    status
  };
}

export interface GoldPortfolioSummary {
  totalGrams: number;
  totalModal: number;
  totalNilaiSekarang: number;
  totalUntungRugiNominal: number;
  totalUntungRugiPersen: number;
  jumlahKeping: number;
}

/**
 * Menghitung ringkasan portofolio seluruh pos tabungan emas
 */
export function calculateGoldPortfolioSummary(
  asetList: AsetTabungan[], 
  currentPrice: GoldPriceData, 
  evalMode: 'pasar' | 'buyback' = 'pasar'
): GoldPortfolioSummary {
  const emasList = asetList.filter(a => a.kategori === 'emas');

  let totalGrams = 0;
  let totalModal = 0;
  let totalNilaiSekarang = 0;

  emasList.forEach(aset => {
    const calc = calculateGoldProfitLoss(aset, currentPrice, evalMode);
    totalGrams += calc.beratGram;
    totalModal += calc.totalModal;
    totalNilaiSekarang += calc.nilaiSekarang;
  });

  const totalUntungRugiNominal = totalNilaiSekarang - totalModal;
  const totalUntungRugiPersen = totalModal > 0 
    ? (totalUntungRugiNominal / totalModal) * 100 
    : 0;

  return {
    totalGrams,
    totalModal,
    totalNilaiSekarang,
    totalUntungRugiNominal,
    totalUntungRugiPersen,
    jumlahKeping: emasList.length
  };
}
