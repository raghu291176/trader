/**
 * Token-bucket rate limiter for API services with daily request limits.
 * Refills tokens continuously throughout the day.
 * Uses a promise queue to prevent race conditions from concurrent callers.
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per millisecond
  private lastRefill: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(maxRequestsPerDay: number) {
    this.maxTokens = maxRequestsPerDay;
    this.tokens = maxRequestsPerDay;
    this.refillRate = maxRequestsPerDay / (24 * 60 * 60 * 1000);
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    // Chain onto queue to serialize access and prevent race conditions
    this.queue = this.queue.then(() => this.acquireToken());
    return this.queue;
  }

  private async acquireToken(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait until next token is available
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
    return new Promise((resolve) => {
      setTimeout(() => {
        this.refill();
        this.tokens = Math.max(0, this.tokens - 1);
        resolve();
      }, Math.min(waitMs, 60000)); // cap wait at 60s
    });
  }

  getRemaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}
