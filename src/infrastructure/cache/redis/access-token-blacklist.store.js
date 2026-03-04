import { createClient } from 'redis';

const buildKey = (tokenId) => {
  return `blacklist:access:${tokenId}`;
};

export class RedisAccessTokenBlacklistStore {
  constructor(options) {
    this.redisUrl = options.redisUrl;
    this.defaultTtlSeconds = options.defaultTtlSeconds || 3600;
    this.client = createClient({ url: this.redisUrl });
    this.ready = false;

    this.client.on('error', () => {
      this.ready = false;
    });

    this.client
      .connect()
      .then(() => {
        this.ready = true;
      })
      .catch(() => {
        this.ready = false;
      });
  }

  async blacklist(tokenId, ttlSeconds = this.defaultTtlSeconds) {
    if (!this.ready || !tokenId) {
      return;
    }

    const key = buildKey(tokenId);
    await this.client.set(key, '1', {
      EX: Math.max(1, Math.floor(ttlSeconds)),
    });
  }

  async isBlacklisted(tokenId) {
    if (!this.ready || !tokenId) {
      return false;
    }

    const key = buildKey(tokenId);
    const value = await this.client.get(key);
    return value === '1';
  }
}
