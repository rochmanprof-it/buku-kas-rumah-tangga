import { AsetTabungan, GoldBrand, GoldPriceSnapshot } from '../types/finance';

const GOLD_PRICES_STORAGE_KEY = 'bukukas_gold_prices_v1';
const GOLD_META_STORAGE_KEY = 'bukukas_gold_meta_v1';

export interface GoldAssetMetaOverride {
  merekEmas?: GoldBrand;
  beratGram?: number;
}

export type GoldMetaMap = Record<string, GoldAssetMetaOverride>;

export const GOLD_BRAND_LABELS: Record<GoldBrand, string> = {
  antam: 'Antam',
  ubs: 'UBS',
  galeri24: 'Galeri 24 (G24)',
};

export function loadCachedGoldPrices(): GoldPriceSnapshot | null {
  try {
    const raw = localStorage.getItem(GOLD_PRICES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoldPriceSnapshot;
    if (!parsed?.antam || !parsed?.ubs || !parsed?.galeri24) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedGoldPrices(snapshot: GoldPriceSnapshot): void {
  try {
    localStorage.setItem(GOLD_PRICES_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage quota errors
  }
}

export function loadGoldMetaMap(): GoldMetaMap {
  try {
    const raw = localStorage.getItem(GOLD_META_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as GoldMetaMap;
  } catch {
    return {};
  }
}

export function saveGoldMetaOverride(asetId: string, meta: GoldAssetMetaOverride): GoldMetaMap {
  const current = loadGoldMetaMap();
  const next: GoldMetaMap = {
    ...current,
    [asetId]: {
      ...current[asetId],
      ...meta,
    },
  };
  try {
    localStorage.setItem(GOLD_META_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function removeGoldMetaOverride(asetId: string): GoldMetaMap {
  const current = loadGoldMetaMap();
  if (!(asetId in current)) return current;
  const next = { ...current };
  delete next[asetId];
  try {
    localStorage.setItem(GOLD_META_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function inferGoldBrand(text: string): GoldBrand {
  const lower = text.toLowerCase();
  if (lower.includes('ubs')) return 'ubs';
  if (lower.includes('galeri 24') || lower.includes('galeri24') || /\bg24\b/.test(lower)) {
    return 'galeri24';
  }
  return 'antam';
}

export function isSilverAsset(aset: AsetTabungan): boolean {
  if (aset.kategori === 'perak') return true;
  if (aset.kategori === 'emas') {
    const combinedText = `${aset.nama || ''} ${aset.keterangan || ''}`;
    return /\b(perak|silver)\b/i.test(combinedText);
  }
  return false;
}

export function inferGoldGram(text: string): number {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:gram|gr|g)\b/i);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }
  const ozMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:oz|ounce)\b/i);
  if (ozMatch) {
    const oz = parseFloat(ozMatch[1].replace(',', '.'));
    return Number.isFinite(oz) && oz > 0 ? Math.round(oz * 31.1035 * 100) / 100 : 0;
  }
  return 0;
}

export function resolveGoldMeta(
  aset: AsetTabungan,
  metaMap: GoldMetaMap
): { merekEmas: GoldBrand; beratGram: number } {
  const override = metaMap[aset.id];
  const combinedText = `${aset.nama || ''} ${aset.keterangan || ''} ${aset.institusi || ''}`;

  const merekEmas: GoldBrand =
    override?.merekEmas || aset.merekEmas || inferGoldBrand(combinedText);

  const beratGram: number =
    (override?.beratGram && override.beratGram > 0 ? override.beratGram : 0) ||
    (aset.beratGram && aset.beratGram > 0 ? aset.beratGram : 0) ||
    inferGoldGram(combinedText);

  return { merekEmas, beratGram };
}

export interface AssetSellValuation {
  displayNominal: number;
  purchaseNominal: number;
  isGoldAsset: boolean;
  isSilverAsset: boolean;
  isLiveGoldEstimate: boolean;
  isLiveSilverEstimate: boolean;
  needsGramInput: boolean;
  merekEmas?: GoldBrand;
  merekLabel?: string;
  beratGram?: number;
  sellPerGram?: number;
  buyPerGram?: number;
  unrealizedPnL: number;
  unrealizedPct: number;
}

export function getAssetEstimatedSellValue(
  aset: AsetTabungan,
  goldPrices: GoldPriceSnapshot | null,
  metaMap: GoldMetaMap
): AssetSellValuation {
  const purchaseNominal = Number(aset.nominal) || 0;

  if (isSilverAsset(aset)) {
    const { beratGram } = resolveGoldMeta(aset, metaMap);
    const silverSellPerGram = goldPrices?.perak?.sellPerGram || 0;
    const silverBuyPerGram = goldPrices?.perak?.buyPerGram || 0;

    if (beratGram > 0 && silverSellPerGram > 0) {
      const estimatedSell = Math.round(beratGram * silverSellPerGram);
      const unrealizedPnL = estimatedSell - purchaseNominal;
      const unrealizedPct = purchaseNominal > 0 ? (unrealizedPnL / purchaseNominal) * 100 : 0;

      return {
        displayNominal: estimatedSell,
        purchaseNominal,
        isGoldAsset: false,
        isSilverAsset: true,
        isLiveGoldEstimate: false,
        isLiveSilverEstimate: true,
        needsGramInput: false,
        beratGram,
        sellPerGram: silverSellPerGram,
        buyPerGram: silverBuyPerGram,
        unrealizedPnL,
        unrealizedPct,
      };
    }

    return {
      displayNominal: purchaseNominal,
      purchaseNominal,
      isGoldAsset: false,
      isSilverAsset: true,
      isLiveGoldEstimate: false,
      isLiveSilverEstimate: false,
      needsGramInput: beratGram <= 0,
      beratGram,
      sellPerGram: silverSellPerGram || undefined,
      buyPerGram: silverBuyPerGram || undefined,
      unrealizedPnL: 0,
      unrealizedPct: 0,
    };
  }

  if (aset.kategori !== 'emas') {
    return {
      displayNominal: purchaseNominal,
      purchaseNominal,
      isGoldAsset: false,
      isSilverAsset: false,
      isLiveGoldEstimate: false,
      isLiveSilverEstimate: false,
      needsGramInput: false,
      unrealizedPnL: 0,
      unrealizedPct: 0,
    };
  }

  const { merekEmas, beratGram } = resolveGoldMeta(aset, metaMap);
  const quote = goldPrices ? goldPrices[merekEmas] : null;
  const sellPerGram = quote?.sellPerGram || 0;
  const buyPerGram = quote?.buyPerGram || 0;

  if (quote && beratGram > 0 && sellPerGram > 0) {
    const estimatedSell = Math.round(beratGram * sellPerGram);
    const unrealizedPnL = estimatedSell - purchaseNominal;
    const unrealizedPct = purchaseNominal > 0 ? (unrealizedPnL / purchaseNominal) * 100 : 0;

    return {
      displayNominal: estimatedSell,
      purchaseNominal,
      isGoldAsset: true,
      isSilverAsset: false,
      isLiveGoldEstimate: true,
      isLiveSilverEstimate: false,
      needsGramInput: false,
      merekEmas,
      merekLabel: GOLD_BRAND_LABELS[merekEmas],
      beratGram,
      sellPerGram,
      buyPerGram,
      unrealizedPnL,
      unrealizedPct,
    };
  }

  return {
    displayNominal: purchaseNominal,
    purchaseNominal,
    isGoldAsset: true,
    isSilverAsset: false,
    isLiveGoldEstimate: false,
    isLiveSilverEstimate: false,
    needsGramInput: beratGram <= 0,
    merekEmas,
    merekLabel: GOLD_BRAND_LABELS[merekEmas],
    beratGram,
    sellPerGram: sellPerGram || undefined,
    buyPerGram: buyPerGram || undefined,
    unrealizedPnL: 0,
    unrealizedPct: 0,
  };
}

export async function fetchLiveGoldPrices(force = false): Promise<GoldPriceSnapshot> {
  const res = await fetch(`/api/gold-prices${force ? '?force=1' : ''}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Gagal mengambil data harga emas terbaru.');
  }
  saveCachedGoldPrices(data);
  return data as GoldPriceSnapshot;
}
