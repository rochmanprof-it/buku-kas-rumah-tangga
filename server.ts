import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GoldBrandQuote {
  brand: 'antam' | 'ubs' | 'galeri24';
  label: string;
  buyPerGram: number;
  sellPerGram: number;
}

interface SilverQuote {
  label: string;
  buyPerGram: number;
  sellPerGram: number;
}

interface GoldPricesPayload {
  antam: GoldBrandQuote;
  ubs: GoldBrandQuote;
  galeri24: GoldBrandQuote;
  perak?: SilverQuote;
  priceDate: string;
  fetchedAt: number;
  sources: { title: string; uri: string }[];
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit
let cachedGoldPrices: GoldPricesPayload | null = null;

function extractJsonObject(rawText: string): any {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : rawText.trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Format data harga emas dari pencarian tidak valid.');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizePriceNumber(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.round(val);
  }
  if (typeof val === 'string') {
    const digits = val.replace(/[^0-9]/g, '');
    const parsed = parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseGaleri24Brand1g(
  strippedText: string,
  sectionHeader: string
): { buyPerGram: number; sellPerGram: number } | null {
  const idx = strippedText.indexOf(sectionHeader);
  if (idx === -1) return null;
  const slice = strippedText.slice(idx, idx + 450);
  const match1g = slice.match(
    /Harga Buyback[\s\S]{0,120}?\b1\s+Rp\s*([\d.]+)\s+Rp\s*([\d.]+)/i
  );
  if (!match1g) return null;
  const buyPerGram = normalizePriceNumber(match1g[1]);
  const sellPerGram = normalizePriceNumber(match1g[2]);
  if (buyPerGram <= 0 || sellPerGram <= 0) return null;
  return { buyPerGram, sellPerGram };
}

async function fetchLiveGoldPricesFromGaleri24(): Promise<GoldPricesPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://galeri24.co.id/harga-emas', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} dari galeri24.co.id`);
    }

    const html = await response.text();
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');

    const g24 = parseGaleri24Brand1g(stripped, 'Harga GALERI 24');
    const antam = parseGaleri24Brand1g(stripped, 'Harga ANTAM');
    const ubs = parseGaleri24Brand1g(stripped, 'Harga UBS');

    if (!g24 || !antam || !ubs) {
      throw new Error('Struktur tabel harga Antam/UBS/Galeri 24 tidak terbaca.');
    }

    const dateMatch = stripped.match(/Diperbarui\s+([^H]+?)\s+Harga GALERI 24/i);
    const priceDate = dateMatch?.[1]?.trim() || new Date().toISOString().slice(0, 10);

    return {
      antam: {
        brand: 'antam',
        label: 'Antam',
        buyPerGram: antam.buyPerGram,
        sellPerGram: antam.sellPerGram,
      },
      ubs: {
        brand: 'ubs',
        label: 'UBS',
        buyPerGram: ubs.buyPerGram,
        sellPerGram: ubs.sellPerGram,
      },
      galeri24: {
        brand: 'galeri24',
        label: 'Galeri 24 (G24)',
        buyPerGram: g24.buyPerGram,
        sellPerGram: g24.sellPerGram,
      },
      priceDate,
      fetchedAt: Date.now(),
      sources: [
        {
          title: 'Galeri 24 Pegadaian (Harga Resmi Hari Ini)',
          uri: 'https://galeri24.co.id/harga-emas',
        },
      ],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLiveSilverPricePerGram(): Promise<SilverQuote | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch('https://www.harga-emas.org/perak', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const html = await response.text();
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');

    const match = stripped.match(/IDR\/g\s+Rp\s*([\d.]+)/i);
    if (!match) return null;
    const perGram = normalizePriceNumber(match[1]);
    if (perGram <= 0) return null;

    return {
      label: 'Perak (Silver)',
      buyPerGram: perGram,
      sellPerGram: perGram,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLiveGoldPricesFromSearch(): Promise<GoldPricesPayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY belum tersedia di environment server untuk mengambil harga emas live.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const prompt = [
    `Cari harga emas batangan Indonesia terbaru hari ini (${todayIso}) dalam Rupiah per 1 gram dari situs resmi Pegadaian / Galeri 24 (galeri24.co.id), Logam Mulia (logammulia.com), atau HargaEmas.`,
    `Saya butuh data akurat untuk 3 merek: Antam, UBS, dan Galeri 24 (G24).`,
    `Untuk masing-masing merek, ambil:`,
    `1. buyPerGram: harga beli konsumen (harga jual toko/Pegadaian) untuk pecahan 1 gram dalam Rupiah.`,
    `2. sellPerGram: harga buyback / harga jual kembali oleh konsumen per 1 gram hari ini dalam Rupiah (jika sumber hanya menampilkan buyback Antam atau Galeri 24 dan UBS, gunakan angka buyback masing-masing dari Pegadaian/Galeri24/toko resmi hari ini).`,
    `Kembalikan HANYA JSON murni tanpa teks lain di luar JSON dengan struktur persis berikut:`,
    `{`,
    `  "priceDate": "YYYY-MM-DD atau tanggal update dari sumber",`,
    `  "antam": { "buyPerGram": 0, "sellPerGram": 0 },`,
    `  "ubs": { "buyPerGram": 0, "sellPerGram": 0 },`,
    `  "galeri24": { "buyPerGram": 0, "sellPerGram": 0 }`,
    `}`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Tidak menerima data harga emas dari pencarian web.');
  }

  const parsed = extractJsonObject(text);

  const antamBuy = normalizePriceNumber(parsed?.antam?.buyPerGram);
  const antamSell = normalizePriceNumber(parsed?.antam?.sellPerGram);
  const ubsBuy = normalizePriceNumber(parsed?.ubs?.buyPerGram);
  const ubsSell = normalizePriceNumber(parsed?.ubs?.sellPerGram);
  const g24Buy = normalizePriceNumber(parsed?.galeri24?.buyPerGram);
  const g24Sell = normalizePriceNumber(parsed?.galeri24?.sellPerGram);

  if (antamSell <= 0 && ubsSell <= 0 && g24Sell <= 0) {
    throw new Error('Angka harga jual/buyback emas tidak ditemukan dari sumber web hari ini.');
  }

  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: { title: string; uri: string }[] = [];
  const seenUris = new Set<string>();
  for (const chunk of groundingChunks as Array<{ web?: { uri?: string; title?: string } }>) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && !seenUris.has(uri)) {
      seenUris.add(uri);
      sources.push({
        title: title || uri,
        uri,
      });
    }
  }

  return {
    antam: {
      brand: 'antam',
      label: 'Antam',
      buyPerGram: antamBuy || antamSell,
      sellPerGram: antamSell || antamBuy,
    },
    ubs: {
      brand: 'ubs',
      label: 'UBS',
      buyPerGram: ubsBuy || ubsSell,
      sellPerGram: ubsSell || ubsBuy,
    },
    galeri24: {
      brand: 'galeri24',
      label: 'Galeri 24 (G24)',
      buyPerGram: g24Buy || g24Sell,
      sellPerGram: g24Sell || g24Buy,
    },
    priceDate: typeof parsed?.priceDate === 'string' && parsed.priceDate ? parsed.priceDate : todayIso,
    fetchedAt: Date.now(),
    sources,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/gold-prices', async (req, res) => {
    try {
      const forceRefresh = req.query.force === '1' || req.query.force === 'true';
      const isFresh =
        cachedGoldPrices && Date.now() - cachedGoldPrices.fetchedAt < CACHE_TTL_MS;

      if (!forceRefresh && isFresh && cachedGoldPrices) {
        return res.json(cachedGoldPrices);
      }

      const [goldResult, silverResult] = await Promise.allSettled([
        fetchLiveGoldPricesFromGaleri24().catch((galeriErr) => {
          console.warn('Galeri 24 direct fetch failed, trying search fallback:', galeriErr);
          return fetchLiveGoldPricesFromSearch();
        }),
        fetchLiveSilverPricePerGram(),
      ]);

      if (goldResult.status !== 'fulfilled') {
        throw goldResult.reason;
      }

      const freshData: GoldPricesPayload = {
        ...goldResult.value,
      };

      if (silverResult.status === 'fulfilled' && silverResult.value) {
        freshData.perak = silverResult.value;
        freshData.sources = [
          ...freshData.sources,
          {
            title: 'Harga Perak 1 Gram (Harga-Emas.org)',
            uri: 'https://www.harga-emas.org/perak',
          },
        ];
      }

      cachedGoldPrices = freshData;
      return res.json(freshData);
    } catch (error: any) {
      console.error('Error fetching live gold prices:', error);
      const rawMsg = typeof error?.message === 'string' ? error.message : '';
      const cleanMessage =
        rawMsg && !rawMsg.trim().startsWith('{')
          ? rawMsg
          : 'Gagal mengambil harga emas live saat ini. Silakan coba lagi atau gunakan Input Manual.';
      return res.status(500).json({
        error: cleanMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
