import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import { RateLimiter } from './rate-limiter.js';
import { ApiError, NetworkError } from './errors.js';

export interface RequestOptions {
  skipRateLimit?: boolean;
  maxRetries?: number;
}

export class HttpClient {
  private jar: CookieJar;
  private fetcher: typeof fetch;
  private rateLimiter: RateLimiter;
  private maxRetries: number;

  constructor(maxRetries: number = 3, rpm: number = 60) {
    this.jar = new CookieJar();
    this.fetcher = fetchCookie(fetch, this.jar) as unknown as typeof fetch;
    this.rateLimiter = new RateLimiter(rpm);
    this.maxRetries = maxRetries;
  }

  get limiter(): RateLimiter {
    return this.rateLimiter;
  }

  resetCookies(): void {
    this.jar = new CookieJar();
    this.fetcher = fetchCookie(fetch, this.jar) as unknown as typeof fetch;
  }

  async request(url: string, init?: RequestInit, options?: RequestOptions): Promise<Response> {
    if (!options?.skipRateLimit) {
      this.rateLimiter.acquire();
    }

    const maxRetries = options?.maxRetries ?? this.maxRetries;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.fetcher(url, init);
        return response;
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw error;
          }
          lastError = error;
        } else if (typeof error === 'string') {
          lastError = new Error(error);
        } else {
          try {
            lastError = new Error(JSON.stringify(error));
          } catch {
            lastError = new Error(String(error));
          }
        }

        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new NetworkError(
      `Request failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  async get(url: string, init?: RequestInit): Promise<Response> {
    return this.request(url, { ...init, method: 'GET' });
  }

  async postForm(url: string, data: Record<string, string>, init?: RequestInit): Promise<Response> {
    const body = new URLSearchParams(data);
    return this.request(url, {
      ...init,
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...init?.headers,
      },
    });
  }

  async postJson(url: string, data: unknown, init?: RequestInit): Promise<Response> {
    return this.request(url, {
      ...init,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  }

  async getJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const response = await this.get(url, {
      ...init,
      headers: {
        'Accept': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    return response.json() as Promise<T>;
  }
}
