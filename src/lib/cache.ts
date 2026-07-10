type CacheEntry<T> = {
  data: T;
  expiry: number;
};

// Global in-memory cache store
const cacheStore = new Map<string, CacheEntry<any>>();

/**
 * Retrieve an item from the cache. Returns null if missing or expired.
 */
export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Store an item in the cache with a Time To Live (TTL) in milliseconds.
 * Prevents memory leaks by capping the maximum cache size.
 */
export function setCached<T>(key: string, data: T, ttlMs: number = 10000): void {
  // Safety guard: Bounded size to prevent memory leaks in long-running node processes
  if (cacheStore.size >= 250) {
    // Prune all expired entries first
    const now = Date.now();
    for (const [k, entry] of cacheStore.entries()) {
      if (now > entry.expiry) {
        cacheStore.delete(k);
      }
    }
    
    // If still too large, clear the entire cache to free up memory
    if (cacheStore.size >= 150) {
      cacheStore.clear();
    }
  }

  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  });
}
