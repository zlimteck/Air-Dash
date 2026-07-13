interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

/**
 * Single-process in-memory TTL cache. Fine for a single-container deployment;
 * a multi-instance deployment would need a shared store (Redis) instead.
 */
export class TtlCache<T> {
  private entry: CacheEntry<T> | null = null;
  private pending: Promise<T> | null = null;

  constructor(private readonly ttlMs: number) {}

  async getOrFetch(fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.entry && now - this.entry.fetchedAt < this.ttlMs) {
      return this.entry.data;
    }
    if (this.pending) return this.pending;

    this.pending = fetcher()
      .then((data) => {
        this.entry = { data, fetchedAt: Date.now() };
        return data;
      })
      .finally(() => {
        this.pending = null;
      });

    try {
      return await this.pending;
    } catch (err) {
      // Serve stale data on a refresh failure rather than surfacing an error
      // for what is otherwise a healthy cached value.
      if (this.entry) return this.entry.data;
      throw err;
    }
  }
}

/** Per-key in-memory TTL cache, e.g. for per-user AirVPN `userinfo` responses. */
export class KeyedTtlCache<K, T> {
  private readonly caches = new Map<K, TtlCache<T>>();

  constructor(private readonly ttlMs: number) {}

  async getOrFetch(key: K, fetcher: () => Promise<T>): Promise<T> {
    let cache = this.caches.get(key);
    if (!cache) {
      cache = new TtlCache<T>(this.ttlMs);
      this.caches.set(key, cache);
    }
    return cache.getOrFetch(fetcher);
  }

  /** Drops the cached value for a key, e.g. after a mutation. */
  invalidate(key: K): void {
    this.caches.delete(key);
  }
}
