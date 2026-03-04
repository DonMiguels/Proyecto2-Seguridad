export class InMemoryAccessTokenBlacklistStore {
  constructor() {
    this.store = new Map();
  }

  async blacklist(tokenId, ttlSeconds = 3600) {
    if (!tokenId) {
      return;
    }

    const expiresAt = Date.now() + Math.max(1, Math.floor(ttlSeconds)) * 1000;
    this.store.set(tokenId, expiresAt);
  }

  async isBlacklisted(tokenId) {
    if (!tokenId) {
      return false;
    }

    const expiresAt = this.store.get(tokenId);
    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      this.store.delete(tokenId);
      return false;
    }

    return true;
  }
}
