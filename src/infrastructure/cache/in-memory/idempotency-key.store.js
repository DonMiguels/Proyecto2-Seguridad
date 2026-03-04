const DEFAULT_TTL_SECONDS = 300;

export class InMemoryIdempotencyKeyStore {
  constructor() {
    this.store = new Map();
  }

  async has(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async save(key, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { expiresAt });
  }
}
