import { NormalizedJob } from './types';

interface CacheEntry {
  jobs: NormalizedJob[];
  timestamp: number;
}

class JobSearchCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
  private readonly MAX_ENTRIES = 100;

  private generateKey(provider: string, keywords = '', location = '', radius = 0, page?: number): string {
    const pagePart = page !== undefined ? `:${page}` : '';
    return `${provider.toLowerCase()}:${keywords.toLowerCase().trim()}:${location.toLowerCase().trim()}:${radius}${pagePart}`;
  }

  get(provider: string, keywords = '', location = '', radius = 0, page?: number): NormalizedJob[] | null {
    const key = this.generateKey(provider, keywords, location, radius, page);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.jobs;
  }

  set(provider: string, jobs: NormalizedJob[], keywords = '', location = '', radius = 0, page?: number): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const key = this.generateKey(provider, keywords, location, radius, page);
    this.cache.set(key, {
      jobs,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const jobSearchCache = new JobSearchCache();
