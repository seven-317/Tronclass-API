import { RateLimitError } from './errors.js';

export class RateLimiter {
  private history: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  setMaxRequests(rpm: number): void {
    this.maxRequests = rpm;
  }

  getMaxRequests(): number {
    return this.maxRequests;
  }

  acquire(): void {
    const now = Date.now();
    this.history = this.history.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (this.history.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.history[0]);
      throw new RateLimitError(waitTime);
    }

    this.history.push(now);
  }

  reset(): void {
    this.history = [];
  }
}
