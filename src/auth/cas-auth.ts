import { JSDOM } from 'jsdom';
import { HttpClient } from '../core/http-client.js';
import { AuthenticationError } from '../core/errors.js';
import type { LoginOptions, LoginResponse } from '../types/index.js';

const MAX_LOGIN_ATTEMPTS = 3;

export class CasAuth {
  private httpClient: HttpClient;
  private baseUrl: string;
  private loggedIn: boolean = false;
  private savedCredentials?: LoginOptions;

  constructor(httpClient: HttpClient, baseUrl: string) {
    this.httpClient = httpClient;
    this.baseUrl = baseUrl;
  }

  get isLoggedIn(): boolean {
    return this.loggedIn;
  }

  async login(options: LoginOptions): Promise<LoginResponse> {
    const { username, password, ocrFunction } = options;

    if (!username || !password) {
      return { success: false, message: 'Username and password are required.' };
    }

    this.savedCredentials = options;
    this.loggedIn = false;

    for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt++) {
      try {
        const loginPageResponse = await this.httpClient.get(
          `${this.baseUrl}/login?next=/user/index`,
          { redirect: 'follow' },
        );
        const loginPageHtml = await loginPageResponse.text();
        const loginPageUrl = loginPageResponse.url;

        const casBaseUrl = this.extractCasBaseUrl(loginPageUrl);

        const dom = new JSDOM(loginPageHtml);
        const doc = dom.window.document;

        const ltInput = doc.querySelector('input[name="lt"]') as HTMLInputElement | null;
        const lt = ltInput?.value;

        if (!lt) {
          throw new AuthenticationError(
            'CSRF token (lt) not found on login page. The page structure may have changed.',
          );
        }

        let captchaCode = '';
        const captchaImg = doc.querySelector('img[id*="captcha"], img[src*="captcha"]');

        if (captchaImg) {
          if (!ocrFunction) {
            return {
              success: false,
              message: 'Login page requires a captcha but no OCR function was provided.',
            };
          }

          const captchaUrl = `${casBaseUrl}/cas/captcha.jpg?${Date.now()}`;
          const imgResponse = await this.httpClient.get(captchaUrl);
          const arrayBuffer = await imgResponse.arrayBuffer();
          const imgBuffer = Buffer.from(arrayBuffer);
          const base64Image = imgBuffer.toString('base64');

          const contentType = imgResponse.headers.get('Content-Type') || 'image/jpeg';
          const dataUrl = `data:${contentType};base64,${base64Image}`;

          captchaCode = await ocrFunction(dataUrl);
        }

        const formData: Record<string, string> = {
          username,
          password,
          lt,
          execution: 'e1s1',
          _eventId: 'submit',
          submit: '登錄',
        };

        if (captchaCode) {
          formData.captcha = captchaCode;
        }

        const actionInput = doc.querySelector('form#fm1, form[action*="login"]');
        const actionUrl = actionInput?.getAttribute('action');
        const loginPostUrl = actionUrl
          ? (actionUrl.startsWith('http') ? actionUrl : `${casBaseUrl}${actionUrl}`)
          : `${casBaseUrl}/cas/login?next=/user/index`;

        const loginResponse = await this.httpClient.postForm(loginPostUrl, formData, {
          redirect: 'follow',
        });

        const loginResultHtml = await loginResponse.text();

        if (
          loginResultHtml.includes('forget-password') ||
          loginResultHtml.includes('cas-error') ||
          loginResultHtml.includes('Authentication failure') ||
          loginResultHtml.includes('密碼錯誤') ||
          loginResultHtml.includes('帳號或密碼錯誤')
        ) {
          if (captchaCode && attempt < MAX_LOGIN_ATTEMPTS - 1) {
            continue;
          }
          return { success: false, message: 'Invalid username or password.' };
        }

        this.loggedIn = true;
        return { success: true, message: 'Login successful.' };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return { success: false, message: error.message };
        }

        const errorMessage = error instanceof Error ? error.message : String(error);

        if (attempt < MAX_LOGIN_ATTEMPTS - 1) {
          console.warn(
            `Login attempt ${attempt + 1} failed: ${errorMessage}. Retrying...`,
          );
        } else {
          return {
            success: false,
            message: `Login failed after ${MAX_LOGIN_ATTEMPTS} attempts: ${errorMessage}`,
          };
        }
      }
    }

    return { success: false, message: 'Login failed unexpectedly.' };
  }

  async reAuthenticate(): Promise<void> {
    if (!this.savedCredentials) {
      throw new AuthenticationError(
        'No saved credentials available for re-authentication. Please call login() first.',
      );
    }

    const result = await this.login(this.savedCredentials);
    if (!result.success) {
      throw new AuthenticationError(`Re-authentication failed: ${result.message}`);
    }
  }

  invalidateSession(): void {
    this.loggedIn = false;
  }

  private extractCasBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      const match = url.match(/^(https?:\/\/[^/]+)/);
      return match?.[1] ?? this.baseUrl;
    }
  }
}
