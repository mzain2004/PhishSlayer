import { scanUrl, ScanResult } from './urlScanner';
import mongoose from 'mongoose';

// Simple URL extraction regex
const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

const UrlCacheSchema = new mongoose.Schema({
  url: { type: String, required: true, index: true },
  result: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // 24h TTL
});

const UrlCache = mongoose.models.UrlCache || mongoose.model('UrlCache', UrlCacheSchema);

export async function detonateUrls(text: string): Promise<Record<string, ScanResult>> {
  const urls = Array.from(new Set(text.match(URL_REGEX) || []));
  const results: Record<string, ScanResult> = {};

  for (const url of urls) {
    try {
      // Check cache
      const cached = await UrlCache.findOne({ url });
      if (cached) {
        results[url] = cached.result;
        continue;
      }

      // Scan
      const scanResult = await scanUrl(url);
      results[url] = scanResult;

      // Save to cache
      await UrlCache.create({ url, result: scanResult });
    } catch (error) {
      console.error(`Error detonating ${url}:`, error);
    }
  }

  return results;
}

export function aggregateVerdicts(results: Record<string, ScanResult>): ScanResult['verdict'] {
  const verdicts = Object.values(results).map(r => r.verdict);
  if (verdicts.includes('malicious')) return 'malicious';
  if (verdicts.includes('suspicious')) return 'suspicious';
  return 'clean';
}
